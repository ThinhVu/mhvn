import {ObjectId} from "mongodb";

export enum VrfType {
  ResetPasswordByEmail = 'resetPassword',
  ResetPasswordByPhone = 'resetPasswordViaPhone',
  VerifyEmail = 'verifyEmail',
  VerifyPhoneNr = 'verifyPhoneNr',
}

export type IVerification = Partial<{
  _id: ObjectId;
  type: VrfType;
  target: string; // User.email | User.phone
  code: string;
  issueDate: Date;
  expiredDate: Date;
}>
