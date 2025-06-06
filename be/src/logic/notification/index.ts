import _ from 'lodash';
import {ObjectId} from "mongodb";
import {INotification} from "../../db/models/notification";
import fcm from './fcm';
import {messaging} from 'firebase-admin'
import MulticastMessage = messaging.MulticastMessage;
import Notification = messaging.Notification;
import {AppEvents} from "../../constants/app-events";
import {getLogger} from "../../utils/logger";
import apn from "apn";
import apnProvider from "./apn";
import {Model} from "../../db/models";

export const seenNotifies = async (userId: ObjectId, notifyIds: ObjectId[]) => {
  return Model.Notifications.deleteMany({_id: {$in: notifyIds}, to: userId})
}

export const getUnseenNotifies = async (userId: ObjectId): Promise<any> => {
  return Model.Notifications.find({to: userId, seen: false}).toArray()
}

export const saveNotify = async (to: ObjectId[], event: string, metadata: any): Promise<INotification> => {
  const noti: INotification = {to, event, metadata, at: new Date(), seen: false}
  const {insertedId} = await Model.Notifications.insertOne(noti)
  noti._id = insertedId
  return noti
}

export const notifyUser = async (to: ObjectId[], event: string, data: INotificationData) => {
  const noti = await saveNotify(to, event, data)
  const notifyId = noti._id.toString()
  return notify(notifyId, to, event, data)
}

type INotificationData = {
  from?: ObjectId | undefined,
  data?: any
}
export const volatileNotifyUser = async (to: ObjectId[], event: string, data: INotificationData) => {
  return notify("", to, event, data)
}

const notificationBuilder = {
  [AppEvents.SYSTEM_NOTIFICATION]: async (payload: INotificationData) => {
    const {from, data} = payload
    console.log('notificationBuilder', AppEvents.SYSTEM_NOTIFICATION, from, data)
    return {
      title: "System notification",
      body: "Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups."
    }
  },
}

// https://firebase.google.com/docs/cloud-messaging/send-message
export async function sendFcm(tokens: string[], {notification, data}: { notification: Notification, data }) {
  if (!tokens || !tokens.length)
    return
  const message: MulticastMessage = {
    tokens,
    notification,
    data,
    apns: {
      headers: {
        "apns-priority": "5",
      },
      payload: {
        aps: {
          'content-available': 1
        }
      }
    },
    android: {
      priority: 'high'
    },
    webpush: {
      headers: {
        TTL: "86400",
        Urgency: "high"
      }
    }
  }
  const result = await fcm.sendEachForMulticast(message)
  const failedSends = result.responses.filter(r => !r.success)
  if (!_.isEmpty(failedSends)) {
    // TODO: Remove out-dated token
    console.log('[app-notification]', 'failed send', failedSends.map(fe => fe.error.message).join('\n'))
  }
  return result
}

export async function sendApn(tokens: string[], {notification, data}) {
  if (!apnProvider) return
  if (!tokens || !tokens.length) return

  const note = new apn.Notification();
  note.alert = notification?.title
  // @ts-ignore
  note.body = notification?.body
  note.payload = {...data, ...notification}
  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.topic = 'com.mevn.api';
  // @ts-ignore
  note.mutableContent = 1;
  // @ts-ignore
  note.category = 'MevnNotification'
  return apnProvider.send(note, tokens)
}

async function buildNotification(event: string, data: INotificationData) {
  if (notificationBuilder[event])
    return notificationBuilder[event](data)
  return undefined
}

async function notify(
  notifyId: string,
  to: ObjectId[],
  event: string,
  data: INotificationData) {
  let users = await Model.Users.find({_id: {$in: to}, 'notificationSetting.allow': true}).toArray()
  if (_.isEmpty(users)) return
  let _3rdSNS = []
  switch (event) {
    case AppEvents.SYSTEM_NOTIFICATION:
      _3rdSNS = users.filter(user => user.notificationSetting?.systemNotification)
      break;
    default:
      _3rdSNS = users
      break;
  }

  const notification = await buildNotification(event, data)

  const response: any = {
    fcm: [],
    apn: []
  };
  const compactFlattenFcm: string[] = _.compact(_.flatten(_3rdSNS.map(u => u.fcm)))
  const fcmTokens = _.filter(compactFlattenFcm, (fcm: string) => fcm.length > 10)
  const payload = {
    notification,
    data: {
      event,
      notifyId,
      data: JSON.stringify(data)
    }
  }
  try {
    if (fcmTokens.length)
      response.fcm = await sendFcm(fcmTokens, payload)
  } catch (e) {
    getLogger().error(e.message, {fn: 'notification::fcm', event, fcmTokens, payload})
  }

  try {
    const compactFlattenApn = _.compact(_.flatten(_3rdSNS.map(u => u.apn)))
    const apnTokens = _.filter(compactFlattenApn, (apn: string) => apn.length > 10)
    if (apnTokens.length) {
      response.apn = await sendApn(apnTokens, {
        notification,
        data: {
          event,
          notifyId,
          data: JSON.stringify(data)
        }
      })
    }
  } catch (e) {
    getLogger().error(e.message, {fn: 'notification::apn', event})
  }

  if (process.env.SOCKET_IO_NOTIFY) {
    let error;
    const userIds = users.map(u => u._id)
    for (const userId of userIds) {
      try {
        // compatibility, delete later
        // @obsolete
        // @ts-ignore
        global.io.of('/app').toUser(userId.toString()).emit(event, notifyId, JSON.stringify(data))
      } catch (e) {
        if (!error) error = e;
      }
    }
    // just log the first error
    if (error)
      getLogger().error(error.message)
  }
  return response
}
