import {ObjectId} from "mongodb";
import {Indexed} from "../utils/types";

export type ITask = Partial<{
  _id: ObjectId;
  type: string;
  completed: Indexed<boolean>;
  failed: Indexed<boolean>;
  running: Indexed<boolean>;
  error: string;
  at: Date;
  metadata: any;
}>