import {ObjectId} from "mongodb";

export type IDbMigrateHistory = Partial<{
  _id: ObjectId;
  id: string;
  success: boolean;
  date: Date;
}>