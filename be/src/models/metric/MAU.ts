import {ObjectId} from "mongodb";
import {Indexed} from "../../utils/types";

export type IMAU = Partial<{
  _id: ObjectId;
  n: number;
  t: Indexed<Date>;
}>