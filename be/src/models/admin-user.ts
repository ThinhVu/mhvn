import {ObjectId} from "mongodb";

export type IAdminUser = Partial<{
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
}>