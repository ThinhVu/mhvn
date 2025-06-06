import _ from 'lodash'
import {Gender, IPublicUserInfo, IUser} from "../db/models/user";
import {ApiError} from "../utils/common-util";
import {EmailRegex} from "../constants/regex";
import {ObjectId} from "mongodb";
import {Model} from "../db/models";

const usernameCharsetMap = (function () {
  const output = {};
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(char => output[char] = char);
  '0123456789'.split('').forEach(char => output[char] = char);
  const dictionary = {
    a: 'àáảãạăằắẳẵặâầấẩẫậ', e: 'èéẻẽẹêềếểễệ', i: 'ìíỉĩị', o: 'òóỏõọôồốổỗộơờớởỡợ', u: 'ùúủũụưừứửữự', d: 'đ',
    A: 'ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ', E: 'ÈÉẺẼẸÊỀẾỂỄỆ', I: 'ÌÍỈĨỊ', O: 'ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ', U: 'UÙÚỦŨỤƯỪỨỬỮỰ', D: 'Đ'
  }
  for (const key of Object.keys(dictionary)) {
    for (const char of dictionary[key]) {
      output[char] = key
    }
  }
  return output
})()

const userPublicInfoFields = {
  _id: 1, avatar: 1, address: 1, gender: 1,
  fullName: 1, username: 1, email: 1, phone: 1, emailVerified: 1, phoneVerified: 1, isOnline: 1,
};
export const getUserPublicInfo = (userInfo: IUser): IPublicUserInfo => {
  return _.pick(userInfo, Object.keys(userPublicInfoFields))
}

export const getUserPublicInfoById = async (_id: ObjectId): Promise<IPublicUserInfo> => {
  return await Model.Users.findOne({_id}, {projection: userPublicInfoFields}) as IPublicUserInfo
}

export const getUserPublicInfoByIds = async (ids: ObjectId[]): Promise<IPublicUserInfo[]> => {
  return await Model.Users.find({_id: {$in: ids}}, {projection: userPublicInfoFields}).toArray() as IPublicUserInfo[]
}

// validation
export const isEmailValid = (email: string) => EmailRegex.test(email)
export const isEmailInvalid = (email: string) => !isEmailValid(email)
export const isEmailHaveBeenUsed = async (email: string): Promise<boolean> => (await Model.Users.countDocuments({
  email,
  emailVerified: true
})) > 0;

export const isValidPhoneNr = (phone: string) => {
  phone = _.trim(phone)
  const isVnPhoneNr = _.startsWith(phone, '84')
  if (!isVnPhoneNr)
    return false
  const isPhoneNrLengthValid = (phone.length === 10 || phone.length === 11)
  if (!isPhoneNrLengthValid)
    return false
  const isPhoneNrOnlyContainsDigit = /^\d+$/.test(phone)
  if (!isPhoneNrOnlyContainsDigit)
    return false
  return true
}
export const isPhoneHaveBeenUsed = async (phone: string): Promise<boolean> => (await Model.Users.countDocuments({
  phone,
  phoneVerified: true
})) > 0;

export function isUsernameValid(username: string) {
  const hasSpace = _.indexOf(username, ' ') >= 0
  if (hasSpace) return false
  const lte30Chars = username.length <= 30
  return lte30Chars
}

export const isUsernameHaveBeenUsed = async (username: string): Promise<boolean> => {
  return (await Model.Users.countDocuments({username})) > 0;
}

export const validatePassword = (password: string) => {
  if (password.length < 9 || password.length > 20)
    throw new ApiError('E_006', 'invalid pwd')
}

export const validateFullName = (fullName: string) => {
  if (!fullName) throw new ApiError('E_000', 'fullName can not empty')
  fullName = fullName.toLowerCase()
  for (let letter of fullName) {
    if (letter === ' ' || usernameCharsetMap[letter])
      continue;
    throw new ApiError('E_000', `Fullname must not include special character "${letter}"`)
  }
  return true
}

export const defaultUserInfo = {
  gender: Gender.NotSpecified,
  // add more here
}

// create
export const createUser = async (data: IUser): Promise<IUser> => {
  const user: IUser = Object.assign({}, defaultUserInfo, data, {createdAt: new Date()})
  const {insertedId} = await Model.Users.insertOne(user);
  user._id = insertedId
  return user
};

export function normalizeUsername(text: string) {
  text = (text || '').toLowerCase()
  let output = ''
  for (const char of text) {
    output += usernameCharsetMap[char] || ''
  }
  return output
}

export const generateUniqueUsername = (text: string) => {
  let output = normalizeUsername(text)
  output += (1000 + Math.floor(Math.random() * 8999))
  if (output.length > 40)
    output = output.substr(output.length - 40)
  return output
}

// update
export const updateUser = async (_id: ObjectId, fieldsToUpdate: any): Promise<IUser> => {
  const {value: rs} = await Model.Users.findOneAndUpdate(
    {_id},
    fieldsToUpdate,
    {returnDocument: 'after', includeResultMetadata: true})
  return rs
};

// delete account
export const deleteAccountRequest = (_id: ObjectId, issueDate: Date): void => {
  Model.Users.updateOne({_id}, {$set: {deleteAccountRequest: {activated: true, issueDate}}})
}
export const cancelDeleteAccountRequest = (_id: ObjectId): void => {
  Model.Users.updateOne({_id}, {$set: {deleteAccountRequest: {activated: false, issueDate: null}}})
}
