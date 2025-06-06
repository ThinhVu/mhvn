import {ObjectId} from "mongodb"
// @ts-ignore
import packageJson from "../../package.json"
import _ from "lodash"

export class ApiError extends Error {
  __API_ERROR__: boolean
  statusCode: number
  errorCode: string
  message: string

  constructor(errorCode: string, message?: string, statusCode?: number) {
    super(errorCode)
    this.__API_ERROR__ = true
    this.statusCode = statusCode || 400
    this.errorCode = errorCode
    this.message = message
  }
}

export function readableResp(e: any) {
  if (e.data && e.data.data) {
    return e.data.data
  }
  if (e.response && e.response.data) {
    return e.response.data
  }
  return e.message
}

export function getVersion() {
  return packageJson.version
}

export function oidIncludes(array: ObjectId[], item: ObjectId): boolean {
  if (!Array.isArray(array) || array.length === 0)
    return false

  for (const member of array) {
    if (member && member.equals(item))
      return true
  }

  return false
}

export function oidExcludes(array: ObjectId[], excludeItems: ObjectId[]) {
  if (_.isEmpty(array)) return []
  if (_.isEmpty(excludeItems)) return array
  const result = []
  for (const member of array) {
    if (oidIncludes(excludeItems, member))
      continue
    result.push(member)
  }
  return result
}

export function mergeOidArrays(array: ObjectId[], newItems: ObjectId[]) {
  if (_.isEmpty(array)) return newItems
  if (_.isEmpty(newItems)) return array
  const result = []
  for (const member of array) {
    result.push(member)
  }
  for (const member of newItems) {
    if (!oidIncludes(result, member))
      result.push(member)
  }
  return result
}

export function interceptOidArrays(array: ObjectId[], newItems: ObjectId[]) {
  if (_.isEmpty(newItems))
    return []
  const result = []
  for (const member of array) {
    if (oidIncludes(newItems, member))
      result.push(member)
  }
  return result
}

export function enumToObject(enumObj: any): { [key: string]: string } {
  return Object.keys(enumObj)
    .filter(key => isNaN(Number(key))) // Filter out numeric keys if enum is numeric
    .reduce((acc, key) => {
      acc[key] = enumObj[key];
      return acc;
    }, {} as { [key: string]: string });
}

export function docs2Map<T extends Record<string, any>>(docs: Array<T>, getKey?: (item: T) => string): Record<string, T> {
  if (!getKey)
    getKey = (item: T) => item._id.toString()
  return docs.reduce((map, item) => {
    map[getKey(item)] = item;
    return map;
  }, {})
}

export function urlFulfill(url: string) {
  if (!url) return
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}