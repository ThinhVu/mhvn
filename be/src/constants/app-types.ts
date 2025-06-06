import {ObjectId} from "mongodb";

export type INotificationData = {
  from?: ObjectId | undefined,
  data?: any
}