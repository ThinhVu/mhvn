import dayjs from "dayjs";
import {ObjectId} from "mongodb";

/**
 * Parse any value to ObjectId
 * @param v input value
 * @param throwIfInvalid if true, an Error will be thrown. Otherwise, null will be returned.
 */
const oid = (v: any, throwIfInvalid = true): ObjectId => {
  if (!v) {
    if (throwIfInvalid)
      throw new Error("Invalid object id")
    else
      return null;
  }
  return new ObjectId(v)
}

/**
 * parse any value to number with fallback
 * @param v
 * @param fallbackValue
 */
const number = (v: any, fallbackValue: number): number => +v || fallbackValue;

/**
 * Parse any value to false, accept all falsy values such as 0, false, '' and also null, undefined, '0', 'false', 'False', 'FALSE', ..
 * @param v input value
 */
const bool = (v: any): boolean => !(v == false || v == undefined || (typeof (v) === 'string' && (v == '0' || v.toLowerCase() === 'false')));

const date = (v: any): Date => dayjs(v).toDate();

const str = (v: any): string => (v && v.toString()) || "";

export default {
  oid,
  number,
  bool,
  date,
  str
}
