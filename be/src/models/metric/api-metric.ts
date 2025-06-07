import {ObjectId} from "mongodb";
import {Indexed} from "../../utils/types";

export type IAPIMetric = Partial<{
  _id: ObjectId;
  metric: Record<string, unknown>;
  at: Indexed<Date>;
}>