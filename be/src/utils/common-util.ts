import {ObjectId} from "mongodb"
// @ts-ignore
import packageJson from "../../package.json"

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

export function objectIdIncludes(array: ObjectId[], item: ObjectId): boolean {
  if (!Array.isArray(array) || array.length === 0)
    return false

  for (const member of array) {
    if (member.equals(item))
      return true
  }

  return false
}