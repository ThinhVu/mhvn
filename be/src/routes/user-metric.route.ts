import {requireUser} from "../middlewares/auth";
import $ from "../utils/safe-call";
import {Router} from "hyper-express";
import {getDAUNow, getMAUNow, getWAUNow} from "../logic/metric/user-metric";
import {Model} from "../db/models";
import dayjs from "dayjs";

export default async function useUserMetric(parentRouter: Router) {
  console.log('[route] useUserMetric')
  const router = new Router()

  router.get('/dau', {
    middlewares: [requireUser]
  }, $(async (req) => {
    return getDAUNow()
  }))

  router.get('/dau/history', {
    middlewares: [requireUser]
  }, $(async (req) => {
    const {from, to} = req.query_parameters
    return Model.DailyActiveUsers.find({
      t: {
        $gte: dayjs(from).toDate(),
        $lte: dayjs(to).toDate()
      }
    }).toArray()
  }))

  router.get('/wau', {
    middlewares: [requireUser]
  }, $(async (req) => {
    return getWAUNow()
  }))

  router.get('/wau/history', {
    middlewares: [requireUser]
  }, $(async (req) => {
    const {from, to} = req.query_parameters


    return Model.WeeklyActiveUsers.find({
      t: {
        $gte: dayjs(from).toDate(),
        $lte: dayjs(to).toDate()
      }
    }).toArray()
  }))

  router.get('/mau', {
    middlewares: [requireUser]
  }, $(async (req) => {
    return getMAUNow()
  }))

  router.get('/mau/history', {
    middlewares: [requireUser]
  }, $(async (req) => {
    const {from, to} = req.query_parameters
    return Model.MonthlyActiveUsers.find({
      t: {
        $gte: dayjs(from).toDate(),
        $lte: dayjs(to).toDate()
      }
    }).toArray()
  }))

  parentRouter.use('/user-metric', router)
}
