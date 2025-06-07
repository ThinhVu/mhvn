import {ObjectId} from "mongodb";
import {Indexed} from "../utils/types";

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  LGBT = 'LGBT',
  NotSpecified = 'NotSpecified'
}

export interface IAddress {
  coordinates?: {
    long: number;
    lat: number;
  },
  addressLine?: string;
  zipCode?: string;
  city?: string;
  country?: string;
}

export interface IPublicUserInfo {
  _id: ObjectId;
  avatar: string;
  email: string;
  fullName: string;
  username: string;
}

export interface Prefs {
  language: string
}

export type IUser = Partial<{
  _id: ObjectId
  avatar: string;
  email: Indexed<string>;
  emailVerified: boolean;
  phone: Indexed<string>;
  phoneVerified: boolean;
  password: string;
  createdAt: Indexed<Date>;
  OAuthProvider: Indexed<string>;
  OAuthUserId: Indexed<string>;
  // profile info
  username: Indexed<string>;
  fullName: string;
  gender: string;
  birthday: Date;
  address: IAddress;
  about: string;
  prefs: Prefs;
  notificationSetting: {
    allow: Boolean,
    systemNotification: Boolean,
  },
  fcm: string[];
  apn: string[];
  // online/offline
  isOnline: Boolean,
  // social
  facebook: string;
  instagram: string;
  telegram: string;
  twitter: string;
  twitch: string;
  // delete info
  deleteAccountRequest: any;
  // dev
  test: boolean;
}>