import {ObjectId} from "mongodb";
import {Indexed} from "../../../utils/types";

export type IUserLoginHistory = Partial<{
  _id: ObjectId;
  u: ObjectId; // ref User._id
  in: Array<Date>;
  out: Array<Date>;
  t: Indexed<Date>; // at time
}>