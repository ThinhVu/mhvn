import {ObjectId} from "mongodb";
import {Indexed} from "../../utils/types";

export type INotification = Partial<{
  _id: ObjectId;
  to: Indexed<ObjectId[]>; // ref User._id
  at: Date;
  event: string;
  metadata: any;
  seen: boolean;
}>