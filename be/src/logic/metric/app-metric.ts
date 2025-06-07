import dayjs from 'dayjs'
import {Model} from "../../models";

export async function getAppMetricNow() {
  return {
    user: await Model.Users.countDocuments(),
    at: dayjs().startOf('day').toDate()
  }
}

export async function snapshot() {
  const appMetric = await getAppMetricNow()
  await Model.AppMetrics.updateOne({at: appMetric.at}, {$set: appMetric}, {upsert: true})
}
