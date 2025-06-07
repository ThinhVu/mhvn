import {CronJob} from "cron";
import {snapshot as appMetricSnapshot} from "../logic/metric/app-metric";
import {snapshot as userMetricSnapshot} from "../logic/metric/user-metric";
import appHook from "../logic/hooks";
import {getLogger} from "../utils/logger";
import {Model} from "../models";

// https://crontab.guru
export default async function cronjob() {
  if (!process.env.RUN_CRONJOB) return

  const pattern = {
    runAt8AM: '0 8 * * *',
    runAt12H: '0 12 * * *',
    runAt23H: '0 23 * * *',
    runAtNewDay: '1 0 * * *',
    runEveryMinutes: '* * * * *',
    runEach5Minutes: '*/5 * * * *',
    runEach10Minutes: '*/10 * * * *',
    runEveryHour: '0 * * * *',
    atEach4Hours: '0 */4 * * *',
    runDailyAtNight: '58 11 * * *'
  }

  getLogger().info('[plugin] cronjob')

  new CronJob(pattern.runEach5Minutes, async () => {
    const tasks = await Model.Tasks.find({
      completed: false,
      failed: false,
      running: false,
      at: {$lte: new Date()}
    }).toArray()
    for (const task of tasks) {
      const {_id, type, metadata} = task
      try {
        Model.Tasks.updateOne({_id}, {$set: {running: true}})
          .then(async () => await appHook.trigger(`task:${type}`, metadata))
          .then(async () => await Model.Tasks.updateOne({_id}, {$set: {completed: true, running: false}}))
          .catch(e => getLogger().error(e.message, {fn: 'cronjob::Tasks.updateOne:try'}))
      } catch (e) {
        Model.Tasks.updateOne({_id}, {$set: {failed: true, error: e.message, running: false}}).catch(
          e => getLogger().error(e.message, {fn: 'cronjob::Tasks.updateOne:catch'}))
      }
    }
  }, null, true)

  // new CronJob(pattern.runEveryHour, () => {}, null, true)
  // new CronJob(pattern.runAtNewDay, () => {}, null, true)

  new CronJob(pattern.runDailyAtNight, () => {
    appMetricSnapshot()
    userMetricSnapshot()
  }, null, true)

  appMetricSnapshot()
  userMetricSnapshot()
}
