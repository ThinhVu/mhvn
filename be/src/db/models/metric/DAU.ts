import {ObjectId} from "mongodb";
import {Indexed} from "../../../utils/types";

export type IDAU = Partial<{
  _id: ObjectId;
  n: number;
  t: Indexed<Date>;
}>