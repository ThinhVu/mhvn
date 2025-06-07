import {ObjectId} from "mongodb";

export type II18n = Partial<{
  _id: ObjectId;
  name: string;
  countryAlpha2Code: string;
  data: Record<string, any>;
}>