import {ObjectId} from "mongodb";
import {HashedIndex} from "../../utils/types";

export type IStorage = Partial<{
   _id: ObjectId;
   tag: HashedIndex<string>;
   key: HashedIndex<string>;
   value: any;
   t: Date
}>