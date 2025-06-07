import {ObjectId} from "mongodb";

export type IAnnouncement = Partial<{
  _id: ObjectId;
  content: string;
  at: Date;
}>