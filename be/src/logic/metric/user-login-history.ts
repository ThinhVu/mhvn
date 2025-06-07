import dayjs from "dayjs";
import {ObjectId} from "mongodb";
import {Model} from "../../models";

export function logLogin(uid: ObjectId, atDay?: Date) {
  atDay = atDay || new Date()

  return Model.UserLoginHistories.updateOne(
    {u: uid, t: dayjs(atDay).startOf('day').toDate()},
    {$push: {in: atDay}},
    {upsert: true}
  )
}

export function logLogout(uid: ObjectId, atDay?: Date) {
  atDay = atDay || new Date()
  return Model.UserLoginHistories.updateOne(
    {u: uid, t: dayjs(atDay).startOf('day').toDate()},
    {$push: {out: atDay}},
    {upsert: true}
  )
}
