import {ObjectId} from "mongodb";

export type IFile = Partial<{
  _id: ObjectId;
  name: string;
  src: string;
  size: number;
  type: string;
  thumbnail: string;
  createdAt: Date;
}>