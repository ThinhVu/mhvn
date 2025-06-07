import _ from "lodash";
import dayjs from "dayjs";
import bcrypt from 'bcrypt';
import {
  cancelDeleteAccountRequest,
  createUser,
  deleteAccountRequest,
  getUserPublicInfoById,
  isEmailHaveBeenUsed,
  isEmailInvalid,
  isPhoneHaveBeenUsed,
  isUsernameHaveBeenUsed,
  isUsernameValid,
  isValidPhoneNr, normalizeUsername,
  updateUser, validateFullName,
  validatePassword
} from '../logic/user';
import {ApiError} from "../utils/common-util";
import {IVerification, VrfType} from "../models/verification";
import {genToken, parseAuthorization} from "../utils/auth-util";
import To from "../utils/data-parser";
import {buildEmailPayload, sendEmail} from "../utils/email-util";
import {Router, Request} from 'hyper-express';
import $ from "../utils/safe-call";
import {requireUser, UserProps} from "../middlewares/auth";
import i18n from "../i18n";
import uuid from "time-uuid";
import {rateLimitByIp, rateLimitByUser} from "../middlewares/rate-limit";
import {sendOTP} from "../utils/stringee";
import {IPublicUserInfo, IUser} from "../models/user";
import {randomNumberInRange} from "../utils/random-util";
import {m2ms} from "../utils/date-time-util";
import {Model} from "../models";

interface CreateVerifyCodeResult {
  issueDate: Date,
  expiredDate: Date
}

function generateCode(): string {
  return randomNumberInRange(1111, 9999).toString();
}

export default async function useUser(parentRouter: Router) {
  console.log('[route] useUser')
  const router = new Router();

  //region Auth
  const upsertVerifyCode = async ({locale, email, phone}): Promise<CreateVerifyCodeResult> => {
    const code = generateCode()
    const issueDate = new Date()
    const expiredDate = dayjs().add(5, 'minute').toDate()
    if (email) {
      const i18nMessage = i18n[locale || 'vi'];
      await sendEmail(buildEmailPayload({
        to: email,
        subject: i18nMessage["EmailVerification_Subject"],
        content: i18nMessage["EmailVerification_Content"].replace("{{email}}", email).replace("{{code}}", code)
      }))

      await Model.Verifications.updateOne({target: email}, {
        $set: {
          type: VrfType.VerifyEmail,
          code,
          issueDate,
          expiredDate
        }
      }, {upsert: true})
    } else {
      await sendOTP(phone, code)
      await Model.Verifications.updateOne({target: phone}, {
        $set: {
          type: VrfType.VerifyPhoneNr,
          code,
          issueDate,
          expiredDate
        }
      }, {upsert: true})
    }
    return {issueDate, expiredDate}
  }
  const upsertResetPasswordVerifyCode = async ({locale, email, phone, username}): Promise<CreateVerifyCodeResult> => {
    const code = generateCode();
    const issueDate = new Date()
    const expiredDate = dayjs().add(5, 'minute').toDate()
    if (email) {
      const i18nMessage = i18n[locale] || i18n['vi'];
      await sendEmail(buildEmailPayload({
        to: email,
        subject: i18nMessage["ResetPassword_Subject"],
        content: i18nMessage["ResetPassword_Content"].replace('{{user}}', username).replace('{{code}}', code)
      }))
      await Model.Verifications.updateOne({
        type: VrfType.ResetPasswordByEmail,
        target: email,
      }, {
        $set: {
          code,
          issueDate,
          expiredDate
        }
      }, {upsert: true})
    } else {
      await sendOTP(phone, code)
      await Model.Verifications.updateOne({
        type: VrfType.ResetPasswordByPhone,
        target: phone,
      }, {
        $set: {
          code,
          issueDate,
          expiredDate
        }
      }, {upsert: true})
    }
    return {issueDate, expiredDate}
  };

  type RequestVerificationResponse =
    {
      verified: boolean
    }
    | {
    expiredDate: Date,
    issueDate: Date,
    sent: boolean
  }
  router.get('/request-email-verification-code', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<RequestVerificationResponse>(async (req) => {
    const email = req.query_parameters.email as string;
    if (_.isEmpty(email)) throw new ApiError('E_001', 'missing email')
    if (isEmailInvalid(email)) throw new ApiError('E_003', 'invalid email')
    if (await isEmailHaveBeenUsed(email)) throw new ApiError('E_004', 'email has been used')
    const qry = {target: email, type: VrfType.VerifyEmail}
    const vrf = await Model.Verifications.findOne(qry)
    let respData: CreateVerifyCodeResult;
    if (!vrf || dayjs(vrf.expiredDate).isBefore(dayjs())) {
      respData = await upsertVerifyCode({email, phone: '', locale: To.str(req.query_parameters.locale)})
    } else {
      respData = {issueDate: new Date(), expiredDate: vrf.expiredDate}
    }
    return {sent: true, ...respData}
  }))

  router.get('/request-phone-number-verification-code', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<RequestVerificationResponse>(async (req) => {
    const phone = req.query_parameters.phone as string;
    if (_.isEmpty(phone)) throw new ApiError('E_001', 'missing phone number')
    if (!isValidPhoneNr(phone)) throw new ApiError('E_014', 'invalid phone')
    if (await isPhoneHaveBeenUsed(phone)) throw new ApiError('E_015', 'phone has been used')
    const qry = {target: phone, type: VrfType.VerifyPhoneNr}
    const vrf = await Model.Verifications.findOne(qry)
    let respData: CreateVerifyCodeResult;
    if (!vrf || dayjs(vrf.expiredDate).isBefore(dayjs())) {
      respData = await upsertVerifyCode({phone, email: '', locale: ''})
    } else {
      respData = {issueDate: new Date(), expiredDate: vrf.expiredDate}
    }
    return {sent: true, ...respData}
  }))

  type AuthResponse = {
    user: IUser,
    token: string
  }
  router.post('/sign-up', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req, res) => {
    const {email, phone, password, code, adminCode} = await req.json();
    if (_.isEmpty(email) && _.isEmpty(phone))
      throw new ApiError('E_015', 'missing email/phone')
    if (_.isEmpty(password))
      throw new ApiError('E_002', 'missing pwd')
    if (_.isEmpty(code))
      throw new ApiError('E_008', 'missing code')
    if (email) {
      if (isEmailInvalid(email))
        throw new ApiError('E_003', 'invalid email')
      if (await isEmailHaveBeenUsed(email))
        throw new ApiError('E_004', 'email existed')
    } else {
      if (await isPhoneHaveBeenUsed(phone))
        throw new ApiError('E_014', 'phone existed')
    }
    validatePassword(password)
    if (adminCode !== process.env.ADMIN_CODE) {
      const qry = (email
          ? {type: VrfType.VerifyEmail, target: email, code}
          : {type: VrfType.VerifyPhoneNr, target: phone, code}
      )
      const vrf = await Model.Verifications.findOne(qry)
      if (!vrf)
        throw new ApiError('E_011', 'invalid verification code')
      if (dayjs(vrf.expiredDate).isBefore(dayjs()))
        throw new ApiError('E_011', 'verification code expired')
      await Model.Verifications.deleteOne({_id: vrf._id})
    }
    const username = `u${uuid()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      fullName: username,
      username,
      email,
      phone,
      password: passwordHash,
      phoneVerified: !_.isEmpty(phone),
      emailVerified: !_.isEmpty(email)
    });
    const token = genToken(user)
    res.cookie('token', token)
    return {user, token}
  }));

  router.post('/sign-in', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req, res) => {
    const {email, phone, password} = await req.json()
    if (_.isEmpty(email) && _.isEmpty(phone)) throw new ApiError('E_001', 'missing email/phone')
    if (_.isEmpty(password)) throw new ApiError('E_002', 'missing pwd')
    const qry = email ? {email} : {phone}
    const user: IUser = await Model.Users.findOne(qry);
    if (!user) throw new ApiError('E_010', 'invalid account')
    const isCorrectPasswd = await bcrypt.compare(password, user.password)
    if (!isCorrectPasswd) throw new ApiError('E_018', 'wrong password')
    const token = genToken(user)
    res.cookie('token', token)
    return {user, token}
  }));

  router.post('/oauth', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse | {
    mode: string
  }>(async (req, res) => {
    const payload = await req.json()
    const {ProviderId} = payload
    switch (ProviderId) {
      case "firebase":
      case "google.com": {
        const {PhotoUrl, phone_number, PhoneNumber, UserId, Email, DisplayName} = payload;
        const avatar = _.trim(PhotoUrl)
        const phone = _.trim(phone_number) || _.trim(PhoneNumber)
        const OAuthUserId = _.trim(UserId)
        const email = _.trim(Email)
        const fullName = _.trim(DisplayName)
        if (_.isEmpty(email) && _.isEmpty(phone)) throw new ApiError('E_000', 'missing email or phone')
        if (email && isEmailInvalid(email)) throw new ApiError('E_003', 'invalid email')
        let mode: string;
        let user: IUser = await Model.Users.findOne({OAuthProvider: ProviderId, OAuthUserId})
        if (user) {
          mode = 'signIn'
        } else {
          user = await createUser({
            avatar,
            email,
            emailVerified: !!email,
            fullName,
            phone,
            phoneVerified: !!phone,
            username: `u${uuid()}`,
            password: await bcrypt.hash(OAuthUserId, 10),
            OAuthProvider: ProviderId,
            OAuthUserId
          })
          mode = 'signUp'
        }
        const token = genToken(user)
        res.cookie('token', token)
        return {user, token, mode}
      }
      default:
        throw new ApiError("E_000", 'not supported provider')
    }
  }))

  router.get('/auth', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req, res) => {
    const authData = parseAuthorization(req)
    const {email, phone, password} = authData.user
    const qry = email ? {email, password} : {phone, password}
    const user = await Model.Users.findOne(qry);
    if (!user)
      throw new ApiError('E_010', 'invalid account')
    const token = genToken(user)
    res.cookie('token', token)
    return {user, token}
  }));

  router.post('/sign-out', {
    middlewares: [requireUser, await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<boolean>(async (req: Request<UserProps>, res) => {
    const {fcm, apn} = await req.json()
    await updateUser(req.locals.uid, {$pull: {fcm, apn}})
    if (req.cookies['token'])
      res.clearCookie('token')
    return true
  }))
  //endregion

  //region Password
  router.post('/change-password', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req, res) => {
    const {
      newPassword, // required field
      email, phone, password, // normal flow
      ProviderId, UserId // oauth flow
    } = await req.json();
    validatePassword(newPassword)
    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    let user;
    if (ProviderId) {
      user = await Model.Users.findOne({
        OAuthProvider: ProviderId,
        OAuthUserId: _.trim(UserId)
      })
      if (!user) throw new ApiError('E_010')
      await Model.Users.updateOne({_id: user._id}, {$set: {password: newPasswordHash}})
    } else {
      if (_.isEmpty(email) && _.isEmpty(phone)) throw new ApiError('E_001', 'missing email/phone')
      const userQry = email ? {email} : {phone}
      user = await Model.Users.findOne(userQry);
      if (!user) throw new ApiError('E_010')
      const isPasswdCorrect = await bcrypt.compare(password, user.password)
      if (!isPasswdCorrect) throw new ApiError('E_018')
      await Model.Users.updateOne({_id: user._id}, {$set: {password: newPasswordHash}})
    }
    user.password = newPasswordHash;
    const authToken = genToken(user)
    res.cookie('token', authToken)
    return {user, token: authToken}
  }))

  router.post('/forgot-password', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $(async (req) => {
    const {email, phone} = await req.json()
    if (_.isEmpty(email) && _.isEmpty(phone))
      throw new ApiError('E_001', 'missing email/phone')
    const userQry = email ? {email} : {phone}
    const user = await Model.Users.findOne(userQry);
    if (!user) throw new ApiError('E_000', 'User not found')
    const vrfQry = (email
      ? {target: email, type: VrfType.ResetPasswordByEmail}
      : {target: phone, type: VrfType.ResetPasswordByPhone})
    const vrf = await Model.Verifications.findOne(vrfQry);
    if (!vrf || dayjs(vrf.expiredDate).isBefore(dayjs())) {
      const respData = await upsertResetPasswordVerifyCode({
        locale: _.get(user, 'prefs.language', 'en_us'),
        email, phone,
        username: user.fullName || user.email
      })
      return {sent: true, ...respData}
    } else {
      return {sent: true, issueDate: new Date(), expiredDate: vrf.expiredDate}
    }
  }))

  router.post('/reset-password', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req, res) => {
    const {password, code, email, phone} = await req.json();
    if (_.isEmpty(email) && _.isEmpty(phone)) throw new ApiError('E_001', 'missing email/phone')
    if (_.isEmpty(password)) throw new ApiError('E_002', 'missing pwd')
    if (_.isEmpty(code)) throw new ApiError('E_008', 'missing code')
    const qry = email ? {email} : {phone};
    let user = await Model.Users.findOne(qry);
    if (!user) throw new ApiError('E_000', 'Invalid email')
    const vrfQry = (email
      ? {type: VrfType.ResetPasswordByEmail, target: email, code}
      : {type: VrfType.ResetPasswordByPhone, target: phone, code})
    const vrf = await Model.Verifications.findOne(vrfQry);
    if (!vrf)
      throw new ApiError('E_009', 'email/phone not verified')
    if (dayjs(vrf.expiredDate).isBefore(dayjs()))
      throw new ApiError('E_011', 'verification code expired')
    const passwordHash = await bcrypt.hash(password, 10)
    const updateUserRs = await Model.Users.findOneAndUpdate(
      {_id: user._id},
      {$set: {password: passwordHash}},
      {returnDocument: 'after', includeResultMetadata: true})
    user = updateUserRs.value
    await Model.Verifications.deleteOne({_id: vrf._id})
    const authToken = genToken(user)
    res.cookie('token', authToken)
    return {user, token: authToken}
  }))
  //endregion

  //region AccountInfoModification
  router.put('/phone', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req: Request<UserProps>, res) => {
    const {phone, code} = await req.json()
    if (_.isEmpty(phone)) throw new ApiError('E_015', 'missing email/phone')
    if (_.isEmpty(code)) throw new ApiError('E_008', 'missing code')
    const vrfQry = {type: VrfType.VerifyPhoneNr, target: phone, code, verified: true}
    const vrf = await Model.Verifications.findOne(vrfQry);
    if (!vrf) throw new ApiError('E_009', 'email/phone not verified')
    await Model.Verifications.deleteOne({_id: vrf._id})
    const {value: user} = await Model.Users.findOneAndUpdate(
      {_id: req.locals.uid},
      {$set: {phone, phoneVerified: true}},
      {returnDocument: 'after', includeResultMetadata: true}
    )
    const token = genToken(user)
    res.cookie('token', token)
    return {user, token}
  }))

  router.put('/email', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $<AuthResponse>(async (req: Request<UserProps>, res) => {
    const {email, code} = await req.json();
    if (_.isEmpty(email)) throw new ApiError('E_015', 'missing email/phone')
    if (_.isEmpty(code)) throw new ApiError('E_008', 'missing code')
    const vrfQry = {type: VrfType.VerifyEmail, target: email, code, verified: true}
    const vrf = await Model.Verifications.findOne(vrfQry);
    if (!vrf) throw new ApiError('E_009', 'email/phone not verified')
    await Model.Verifications.deleteOne({_id: vrf._id})
    const {value: user} = await Model.Users.findOneAndUpdate(
      {_id: req.locals.uid},
      {$set: {email, emailVerified: true}},
      {returnDocument: 'after', includeResultMetadata: true}
    )
    const token = genToken(user)
    res.cookie('token', token)
    return {user, token}
  }))

  router.put('/username', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    const {username: _username} = await req.json()
    const username = normalizeUsername(_username)
    if (_.isEmpty(username)) throw new ApiError('E_012', 'missing user name')
    if (!isUsernameValid(username)) throw new ApiError('E_016', 'username invalid')
    if (await isUsernameHaveBeenUsed(username)) throw new ApiError('E_013', 'username has been used')
    await Model.Users.updateOne({_id: req.locals.uid}, {$set: {username}})
    return {_id: req.locals.uid, username}
  }))

  router.put('/profile', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    const {
      avatar, fullName, gender, birthday,
      address, about,
      prefs, notificationSetting,
      fcm, apn
    } = await req.json();
    if (fullName) validateFullName(fullName);
    let change: any = {
      $set: {
        avatar, fullName, gender,
        birthday: birthday && dayjs(birthday).toDate(),
        about,
      },
      $addToSet: _.omitBy({fcm, apn}, _.isNil)
    };
    if (address) {
      for (const k of Object.keys(address))
        change.$set[`address.${k}`] = address[k];
    }
    if (prefs) {
      for (const k of Object.keys(prefs))
        change.$set[`prefs.${k}`] = prefs[k];
    }
    if (notificationSetting) {
      for (const k of Object.keys(notificationSetting))
        change.$set[`notificationSetting.${k}`] = notificationSetting[k];
    }
    change.$set = _.omitBy(change.$set, _.isNil)
    return updateUser(req.locals.uid, change);
  }));

  //endregion

  //region AccountSearch
  router.get('/profile', {
    middlewares: [
      requireUser,
      await rateLimitByUser({windowMs: m2ms(10), max: 60})
    ]
  }, $<IUser>(async (req: Request<UserProps>) => {
    const user: IUser = await Model.Users.findOne(
      {_id: req.locals.uid},
      {projection: {password: 0}}
    )
    return user
  }))

  router.get('/profile/:id', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $<IPublicUserInfo | IUser>(async (req: Request<UserProps>) => {
    const userId = To.oid(req.path_parameters.id)
    if (userId.toString() === req.locals.uid.toString()) {
      const user: IUser = await Model.Users.findOne(
        {_id: req.locals.uid},
        {projection: {password: 0}}
      )
      return user
    } else {
      const user: IPublicUserInfo = await getUserPublicInfoById(userId)
      if (!user) throw new ApiError("E_000", "user not found")
      return user
    }
  }))

  //endregion

  //region delete information
  router.post('/delete-account-request', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    const issueDate = dayjs(new Date()).add(14, 'day').toDate()
    deleteAccountRequest(req.locals.uid, issueDate)
    return issueDate
  }))

  router.post('/cancel-delete-account-request', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    cancelDeleteAccountRequest(req.locals.uid)
    return true
  }))

  router.delete('/email', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>, res) => {
    const qry = {_id: req.locals.uid}
    const user = await Model.Users.findOne(qry)
    if (!user.phone || !user.phoneVerified) throw new ApiError('E_000', 'Email cannot blank')
    const {value: updatedUser} = await Model.Users.findOneAndUpdate(
      qry,
      {$unset: {email: 1, emailVerified: 1}},
      {returnDocument: 'after', includeResultMetadata: true}
    )
    const token = genToken(updatedUser)
    res.cookie('token', token)
    return {user: updatedUser, token}
  }))

  router.delete('/phone', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>, res) => {
    const qry = {_id: req.locals.uid}
    const user = await Model.Users.findOne(qry)
    if (!user.email || !user.emailVerified) throw new ApiError('E_000', 'Phone cannot blank')
    const {value: updatedUser} = await Model.Users.findOneAndUpdate(
      qry,
      {$unset: {phone: 1, phoneVerified: 1}},
      {returnDocument: 'after', includeResultMetadata: true})
    const token = genToken(updatedUser)
    res.cookie('token', token)
    return {user: updatedUser, token}
  }))
  //endregion

  parentRouter.use('/user', router)
}
