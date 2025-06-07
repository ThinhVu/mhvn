import {ObjectId} from "mongodb";
import {Indexed} from "../../utils/types";

export type IUserMetric = Partial<{
  _id: ObjectId;
  new: number;
  dau: number;  // daily active user
  arwau: number; // weekly active user at risk
  armau: number; // monthly active user at risk
  dead: number;
  total: number;
  t: Indexed<Date>
}>