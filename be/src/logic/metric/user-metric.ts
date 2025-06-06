import dayjs from "dayjs";
import {getLogger} from "../../utils/logger";
import {Model} from "../../db/models";

export async function snapshot(atDay?: Date) {
  const atDayJs = dayjs(atDay);
  const sodjs = atDayJs.startOf('day')
  const l30d = sodjs.subtract(30, 'day').toDate()
  const l7d = sodjs.subtract(7, 'day').toDate()
  const sod = sodjs.toDate()
  const sow = atDayJs.startOf('week').toDate()
  const som = atDayJs.startOf('month').toDate()
  const eod = atDayJs.endOf('day').toDate()
  const eow = atDayJs.endOf('week').toDate()
  const eom = atDayJs.endOf('month').toDate()

  const newUserToday = await Model.Users.countDocuments({createdAt: {$gte: sod, $lt: eod}})
  const activeUserToday = await countActiveUser(sod, eod)
  const activeUserThisWeek = await countActiveUser(sow, eow)
  const activeUserThisMonth = await countActiveUser(som, eom)
  const activeUserLast7Days = await countActiveUser(l7d, eod)
  const activeUserLast30Days = await countActiveUser(l30d, eod)
  const totalUser = await Model.Users.countDocuments()

  const atRiskWeeklyUsers = activeUserLast7Days - activeUserToday
  const atRiskMonthlyUser = activeUserLast30Days - activeUserLast7Days
  const deadUser = totalUser - activeUserLast30Days


  Model.UserMetrics.updateOne(
    {t: sod},
    {
      $set: {
        new: newUserToday,
        dau: activeUserToday,
        arwau: atRiskWeeklyUsers,
        armau: atRiskMonthlyUser,
        dead: deadUser,
        total: totalUser,
      }
    },
    {upsert: true}
  ).catch(e => getLogger().error(e.message, {fn: 'UserMetric::snapshot'}))


  Model.DailyActiveUsers.updateOne(
    {t: sod},
    {$set: {n: activeUserToday}},
    {upsert: true}
  ).catch(e => getLogger().error(e.message, {fn: 'DAU::snapshot'}))


  Model.WeeklyActiveUsers.updateOne(
    {t: sow},
    {$set: {n: activeUserThisWeek}},
    {upsert: true}
  ).catch(e => getLogger().error(e.message, {fn: 'WAU::snapshot'}))


  Model.MonthlyActiveUsers.updateOne(
    {t: som},
    {$set: {n: activeUserThisMonth}},
    {upsert: true}
  ).catch(e => getLogger().error(e.message, {fn: 'MAU::snapshot'}))
}

export async function countActiveUser(from: Date, to: Date) {
  const outputField = "total"
  const rs = await Model.UserLoginHistories.aggregate([
    {$match: {t: {$gte: from, $lte: to}}},
    {$group: {_id: "$u"}},
    {$count: outputField}
  ]).toArray()
  return rs.length ? rs[0][outputField] : 0
}

export const getDAUNow = async () => countActiveUser(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate())
export const getWAUNow = async () => countActiveUser(dayjs().startOf('week').toDate(), dayjs().endOf('week').toDate())
export const getMAUNow = async () => countActiveUser(dayjs().startOf('month').toDate(), dayjs().endOf('month').toDate())

