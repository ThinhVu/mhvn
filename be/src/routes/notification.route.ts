import _ from "lodash";
import $ from "../utils/safe-call";
import DataParser from "../utils/data-parser";
import {Router, Request} from 'hyper-express';
import {requireUser, UserProps} from "../middlewares/auth";
import {getNotifications, getUnseenNotifies, seenNotifies} from "../logic/notification";
import {rateLimitByUser} from "../middlewares/rate-limit";

import {m2ms} from "../utils/date-time-util";

export default async function useNotification(parentRouter: Router) {
  console.log('[route] useNotification')

  const router = new Router()

  router.get('/', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    return getNotifications(req.locals.uid, Number(req.query_parameters?.p || 1))
  }))

  router.get('/un-seen', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    return getUnseenNotifies(req.locals.uid)
  }))

  router.post('/seen', {
    middlewares: [requireUser, await rateLimitByUser({windowMs: m2ms(10), max: 60})]
  }, $(async (req: Request<UserProps>) => {
    const {ids} = await req.json()
    return seenNotifies(req.locals.uid, _.map(ids, id => DataParser.oid(id)))
  }))

  parentRouter.use('/notification', router)
}
