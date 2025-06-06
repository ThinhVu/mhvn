import {ObjectId} from "mongodb";
import {Indexed} from "../../../utils/types";

export type IWAU = Partial<{
  _id: ObjectId;
  n: number;
  t: Indexed<Date>;
}>