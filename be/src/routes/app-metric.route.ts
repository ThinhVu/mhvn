import {requireUser} from "../middlewares/auth";
import {getAppMetricNow} from "../logic/metric/app-metric";
import $ from "../utils/safe-call";
import {Router} from 'hyper-express';
import {Model} from "../models";
import dayjs from "dayjs";

export default async function useAppMetric(parentRouter: Router) {
  console.log('[route] useAppMetric')
  const router = new Router()
  const AppMetric = Model.AppMetrics

  router.get('/', {middlewares: [requireUser]}, $(async () => {
    return getAppMetricNow()
  }))

  router.get('/history', {middlewares: [requireUser]}, $(async (req) => {
    const {from, to} = req.query_parameters
    return AppMetric.find({at: {$gte: dayjs(from).toDate(), $lte: dayjs(to).toDate()}}).toArray()
  }))

  parentRouter.use('/app-metric', router)
}
