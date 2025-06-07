import {ObjectId} from "mongodb";
import {Indexed} from "../../utils/types";

export type IAppMetric = Partial<{
  _id: ObjectId;
  user: number;
  at: Indexed<Date>;
}>