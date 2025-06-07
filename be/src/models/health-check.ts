import {ObjectId} from "mongodb";

export type IHealthCheck = Partial<{
  _id: ObjectId;
  serviceName: string;
  url: string;
}>