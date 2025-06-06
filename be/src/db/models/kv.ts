import {ObjectId} from "mongodb";
import {Unique, HashedIndex} from "../../utils/types";

export type IKV = Partial<{
  _id: ObjectId;
  key: Unique<HashedIndex<string>>;
  value: string;
  isSecret?: boolean;
}>