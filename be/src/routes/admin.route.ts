import {genAdminToken, parseAuthorization} from "../utils/auth-util"
import $ from "../utils/safe-call"
import bcrypt from 'bcrypt'
import {ApiError} from "../utils/common-util";
import {Router} from "hyper-express";
import {rateLimitByIp} from "../middlewares/rate-limit";
import {m2ms} from "../utils/date-time-util";
import {Model} from "../models";

export default async function useAdmin(parentRouter: Router) {
  console.log('[route] useAdmin')

  async function ensureAdminUserExists() {
    console.log('[admin] Checking if admin user exists...')
    const adminUser = await Model.AdminUsers.findOne({email: 'admin'})
    if (adminUser) {
      console.log('[admin] Admin user existed.')
    } else {
      console.log('[admin] Admin user not exists. Create new!')
      const hashPassword = await bcrypt.hash(process.env.ADMIN_CODE, 10)
      await Model.AdminUsers.insertOne({
        username: "admin",
        email: "admin",
        password: hashPassword,
        role: "admin",
        createdAt: new Date(),
      })
      console.log('[admin] Admin user created!')
    }
  }

  await ensureAdminUserExists()

  const router = new Router()
  router.post('/sign-in', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 10})]
  }, $(async (req, res) => {
    const {email, password} = await req.json()
    const user = await Model.AdminUsers.findOne({email})
    if (!user) throw new ApiError('E_000', 'Invalid account')
    const isCorrectPassword = bcrypt.compare(password, user.password)
    if (!isCorrectPassword) throw new ApiError('E_000', 'invalid account')
    const token = genAdminToken(user)
    res.cookie('token', token)
    return {user, token}
  }))
  router.get('/auth', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 10})]
  }, $(async (req, res) => {
    const authData = parseAuthorization(req)
    const {email} = authData.user
    const user = await Model.AdminUsers.findOne({email})
    if (!user) throw new ApiError('E_000', 'Invalid account')
    const token = genAdminToken(user)
    res.cookie('token', token)
    return {user, token}
  }))
  router.post('/sign-out', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 10})]
  }, $(async (req, res) => {
    if (req.cookies['token'])
      res.clearCookie('token')
    return true
  }))

  parentRouter.use('/admin', router)
}
