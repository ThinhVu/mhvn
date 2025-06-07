import _ from 'lodash';
import {ObjectId} from "mongodb";
import {INotification} from "../../models/notification";
import {Model} from "../../models";
import {buildNotification} from "./notification-builder";
import {INotificationData} from "../../constants/app-types";
import {sendFcmWithRetry} from "./fcm";
import {IUser} from "../../models/user";

export const getNotifications = async (uid: ObjectId, p?: number): Promise<any> => {
  p = +p || 1
  const itemsPerPage = 20;
  return Model.Notifications.find({to: uid}).sort({at: -1}).skip(Math.min(+p - 1, 0) * itemsPerPage).limit(itemsPerPage).toArray()
}
export const getUnseenNotifies = async (userId: ObjectId): Promise<any> => {
  return Model.Notifications.find({to: userId, seen: false}).sort({at: -1}).toArray()
}
export const seenNotifies = async (userId: ObjectId, notifyIds: ObjectId[]) => {
  return Model.Notifications.updateMany({_id: {$in: notifyIds}, to: userId}, {$set: {seen: true}})
}

export const persistentNotifyUser = async (to: ObjectId[], event: string, data: INotificationData): Promise<void> => {
  const noti = await saveNotify(to, event, data)
  const notifyId = noti._id.toString()
  await sendNotifyViaFcm(notifyId, to, event, data)
  await sendNotifyViaSocket(notifyId, to, event, data)
}
export const volatileNotifyUser = async (to: ObjectId[], event: string, data: INotificationData): Promise<void> => {
  await sendNotifyViaFcm("", to, event, data)
  await sendNotifyViaSocket("", to, event, data)
}

export const saveNotify = async (to: ObjectId[], event: string, metadata: any): Promise<INotification> => {
  const noti: INotification = {to, event, metadata, at: new Date(), seen: false}
  const {insertedId} = await Model.Notifications.insertOne(noti)
  noti._id = insertedId
  return noti
}
export const getNotificationUsers = async (to: ObjectId[], event: string, notificationData: INotificationData) => {
  const usersFromIds = await Model.Users.find({_id: {$in: to}}).toArray();
  const notificationUsers = usersFromIds.filter(user => user?.notificationSetting?.allow);
  let finalUsers: Array<IUser>;
  switch (event) {
    default:
      finalUsers = notificationUsers
      break;
  }
  return finalUsers
}
export const getUniqFcmTokens = (users: IUser[]) => {
  const compactUniqFlattenFcm: string[] =
    _.compact(
      _.uniq(
        _.flatten(
          users.map(u => Object.values(u.fcm || {}))
        )
      )
    )
  return _.filter(compactUniqFlattenFcm, (fcm: string) => fcm.length > 10)
}
export const getTokenUserIdMap = (users: IUser[]): Record<string, { uid: ObjectId, deviceId: string }> => {
  const rs: Record<string, { uid: ObjectId, deviceId: string }> = {}
  for (const user of users) {
    const uid = user._id;
    const fcm = user.fcm;
    if (!fcm)
      continue;
    const deviceIds = Object.keys(fcm);
    for (const deviceId of deviceIds) {
      const token = fcm[deviceId]
      rs[token] = {
        uid: uid,
        deviceId: deviceId,
      }
    }
  }
  return rs;
}

export const sendNotifyViaFcm = async (
  notifyId: string,
  toUserIds: ObjectId[],
  event: string,
  notificationData: INotificationData): Promise<void> => {
  if (notificationData.from) {
    toUserIds = toUserIds.filter(userId => !userId.equals(notificationData.from))
  }
  const users = await getNotificationUsers(toUserIds, event, notificationData);
  const usersGroupByLanguage: Record<string, IUser[]> = _.groupBy(users, (user: IUser) => user.prefs?.language || 'en')
  for (const [language, users] of Object.entries(usersGroupByLanguage)) {
    const fcmTokens = getUniqFcmTokens(users)
    if (_.isEmpty(fcmTokens))
      continue;
    const notification = await buildNotification(event, notificationData, language)
    if (!notification)
      continue;
    const payload = {
      notification,
      data: {
        event,
        notifyId,
        data: JSON.stringify(notificationData),
        dt: new Date().toISOString()
      }
    }
    await sendFcmWithRetry(event, users, fcmTokens, payload);
  }
}

export const sendNotifyViaSocket = async(
  notifyId: string,
  toUserIds: ObjectId[],
  event: string,
  notificationData: INotificationData) => {
  if (process.env.SOCKET_IO_NOTIFY) {
    const errors = [];
    // @ts-ignore
    const appNs = global.io.of('/app');
    const jsonData = JSON.stringify(notificationData);
    for (const userId of toUserIds) {
      try {
        appNs.toUser(userId.toString()).emit(event, notifyId, jsonData);
      } catch (e) {
        errors.push({
          userId,
          error: e.message
        })
      }
    }

    if (errors.length) {
      await Model.Storages.insertOne({
        tag: 'notify.socket',
        key: Date.now().toString(),
        value: errors,
        t: new Date()
      })
    }
  }
}