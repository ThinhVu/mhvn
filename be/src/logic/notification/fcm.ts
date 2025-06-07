import _ from "lodash";
import admin from 'firebase-admin';
import {credential} from "../../utils/google-creds";
import {messaging} from 'firebase-admin'
import Notification = messaging.Notification;
import MulticastMessage = messaging.MulticastMessage;
import {delay, s2ms} from "../../utils/date-time-util";
import {alert} from "../../utils/rt-alert";
import {getLogger} from "../../utils/logger";
import {getValue} from "../kv";
import {Model} from "../../models";
import {removeFcmTokenForDevice} from "../user";
import {getTokenUserIdMap} from "./index";
import { ObjectId } from "mongodb";
import {IUser} from "../../models/user";

const app = admin.initializeApp({credential})
const fcm = app.messaging()

export async function sendFcmWithRetry(event: string, users: Array<IUser>, fcmTokens: string[], payload: { notification: Notification, data: any }, atTry?: number) {
  atTry = atTry || 1;

  const MAX_TRIES = 3;
  try {
    let tried = 0;
    let fcmBatchResponse: any;
    while (tried < MAX_TRIES) {
      try {
        fcmBatchResponse = await sendFcm(fcmTokens, payload)
        break;
      } catch (e) {
        const fcmServerUnreachableATM = e.message === 'Error while making requests: Error: getaddrinfo EAI_AGAIN fcm.googleapis.com'
        if (fcmServerUnreachableATM) {
          tried++;
          if (tried < MAX_TRIES)
            await delay(30000);
          else
            throw e;
        } else {
          throw e;
        }
      }
    }

    const {responses, failureCount} = fcmBatchResponse;
    const tag = 'notify.fcm';
    const fcmSendSession = `${event}.${Date.now().toString()}`;
    const LOG_FCM_PAYLOAD = await getValue('LOG_FCM_PAYLOAD')
    if (LOG_FCM_PAYLOAD) {
      await Model.Storages.insertOne({
        tag, key: fcmSendSession,
        value: {
          tokens: fcmTokens,
          payload
        }, t: new Date()
      })
    }

    if (failureCount === 0)
      return;

    const fcmTokenUserIdMap = getTokenUserIdMap(users);

    try {
      const retrySends: Array<string> = [];
      const failedSends: Array<{
        error: any,
        uid: ObjectId,
        deviceId: string
        token: string,
      }> = [];

      for (let i = 0; i < responses.length; ++i) {
        const response = responses[i];
        const {error, success} = response;
        if (success)
          continue;
        const token = fcmTokens[i];
        const {uid, deviceId} = fcmTokenUserIdMap[token];
        if (isErrorIndicateTokenOutdated(error)) {
          removeFcmTokenForDevice(uid, deviceId).then().catch(console.error)
        } else if (isUnknownErrorFromServer(error)) {
          if (atTry < MAX_TRIES) {
            retrySends.push(token);
          } else {
            failedSends.push({
              error: error.message,
              uid,
              deviceId,
              token
            })
          }
        } else {
          failedSends.push({
            error: error.message,
            uid,
            deviceId,
            token
          })
        }
      }

      if (!_.isEmpty(retrySends)) {
        setTimeout(() => {
          sendFcmWithRetry(event, users, retrySends, payload, atTry + 1);
        }, s2ms(30));
      }

      if (!_.isEmpty(failedSends)) {
        const LOG_FCM_FAILED = await getValue('LOG_FCM_FAILED')
        if (LOG_FCM_FAILED) {
          await Model.Storages.updateOne(
            {tag, key: fcmSendSession},
            {
              $set: {
                value: {
                  fcmTokens,
                  payload,
                  errors: failedSends
                }
              }
            },
            {upsert: true}
          )
          alert(tag, fcmSendSession);
        }
      }
    } catch (e) {
      alert('fcm log failed', e.message)
    }
  } catch (e) {
    alert('notification::fcm', JSON.stringify({event, message: e.message}));
    getLogger().error(e.message, {fn: 'notification::fcm', event, fcmTokens, payload});
  }
}

// https://firebase.google.com/docs/cloud-messaging/send-message
export async function sendFcm(tokens: string[], {notification, data}: { notification: Notification, data: any }) {
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
          'content-available': 1,
          sound: {
            'name': 'sample.caf',
            'critical': true,
            'volume': 1.0
          }
        }
      }
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'sample',
        channelId: 'noti_push_app_1'
      }
    },
    webpush: {
      headers: {
        TTL: "86400",
        Urgency: "high"
      }
    }
  }
  return fcm.sendEachForMulticast(message)
}

export function isErrorIndicateTokenOutdated(error: any): boolean {
  return _.get(error, 'errorInfo.code') === 'messaging/registration-token-not-registered' || error.message === 'Requested entity was not found.'
}

export function isUnknownErrorFromServer(error: any) : boolean {
  return error.message.includes('An unknown server error was returned')
}