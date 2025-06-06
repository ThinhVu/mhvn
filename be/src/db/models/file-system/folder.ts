import {ObjectId} from "mongodb";

export type IFolder = Partial<{
  _id: ObjectId;
  name: string;
  parent: ObjectId; // ref Folder._id
  files: ObjectId[]; // ref File._id
  createdAt: Date;
}>