import {requireAdmin} from "../middlewares/auth";
import $ from "../utils/safe-call";
import {Router} from 'hyper-express';
import {rateLimitByIp} from "../middlewares/rate-limit";

import {m2ms} from "../utils/date-time-util";
import {Model} from "../models";

export default async function useI18n(parentRouter: Router) {
  console.log('[route] useI18n')

  const router = new Router()
  const I18n = Model.I18ns

  router.get('/', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 100})]
  }, $(async () => {
    return I18n.find().toArray()
  }))

  router.get('/:countryAlpha2Code', {
    middlewares: [await rateLimitByIp({windowMs: m2ms(10), max: 100})]
  }, $(async req => {
    const {countryAlpha2Code} = req.path_parameters
    return I18n.findOne({countryAlpha2Code})
  }))

  router.put('/:countryAlpha2Code', {
    middlewares: [requireAdmin]
  }, $(async req => {
    const change = await req.json()
    const {countryAlpha2Code} = req.path_parameters
    return I18n.updateOne({countryAlpha2Code}, {$set: change})
  }))

  router.put('/:countryAlpha2Code/data', {
    middlewares: [requireAdmin]
  }, $(async req => {
    const {countryAlpha2Code} = req.path_parameters
    const body = await req.json()
    const change = {}
    Object.keys(body).forEach(key => change[`data.${key}`] = body[key])
    return I18n.updateOne({countryAlpha2Code}, {$set: change})
  }))

  parentRouter.use('/i18n', router)
}
