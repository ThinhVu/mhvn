import axios from 'axios'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import * as process from "process";
import {getValue} from "../logic/kv";
import {getLogger} from "./logger";
import {delay} from "./date-time-util";

// https://developer.stringee.com/docs/call-error-code
const STRINGEE_ERROR_CODE = {
  NOT_INIT: -1,
  SUCCESS: 0,
  ANSWER_URL_EMPTY: 1,
  ANSWER_URL_SCCO_INCORRECT_FORMAT: 2,
  TO_TYPE_IS_NOT_INTERNAL_OR_EXTERNAL: 3,
  FROM_NUMBER_NOT_FOUND: 4,
  FROM_NUMBER_NOT_BELONG_YOUR_ACCOUNT: 5,
  SIP_TRUNK_NOT_FOUND: 6,
  SIP_TRUNK_NOT_BELONG_YOUR_ACCOUNT: 7,
  NOT_ENOUGH_MONEY: 8,
  UNKNOW_ERROR_1: 9,
  FROM_NUMBER_OR_TO_NUMBER_INVALID_FORMAT: 10,
  CALL_NOT_ALLOWED_BY_YOUR_SERVER: 11,
  MAX_CONCURRENT_CALL: 12,
  WAIT_TEXT_TO_SPEECH: 13,
  TO_NUMBER_INVALID: 14,
  FROM_NUMBER_NOT_BELONG_YOUR_PROJECT: 15,
  NOT_ALLOW_CHAT_USER: 16,
  NOT_ALLOW_CALLOUT: 17,
  REQUEST_ANSWER_URL_ERROR: 18,
  ACCOUNT_LOCKED: 19,
  GET_USER_MEDIA_ERROR: 1000,
  CREATE_PEER_CONNECTION_ERROR: 1001,
}

function urlEncode(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlEncode(data) {
  const base64 = Buffer.from(data).toString('base64');
  return urlEncode(base64)
}

function generateStringeeToken() {
  const header = {
    alg: "HS256",
    typ: "JWT",
    cty: "stringee-api;v=1"
  }
  const appSIDKey = process.env.STRINGEE_SID;
  const apiKeySecret = process.env.STRINGEE_KEY_SECRET;

  const payload = {
    jti: `${appSIDKey}-1234567`,
    iss: appSIDKey,
    exp: dayjs().add(1, 'hour').diff(dayjs('1970-01-01'), 'second'),
    rest_api: true
  }

  // Calculate HMAC-SHA-256 hash
  const data = base64UrlEncode(JSON.stringify(header)) + "." + base64UrlEncode(JSON.stringify(payload))
  const verifySignature = urlEncode(CryptoJS.HmacSHA256(data, apiKeySecret).toString(CryptoJS.enc.Base64));

  // Convert the hash to a hexadecimal string
  return `${data}.${verifySignature}`;
}

export async function sendOTP(phoneNr: string, otpCode: string | number) {
  const token = generateStringeeToken()

  otpCode = otpCode.toString().split('').join('. ') // slow down voice speed

  const fromPhone = await getValue('STRINGEE_PHONE_NUMBER')

  let tried = 0, retries = [];

  while (tried < 3) {
    const {data} = await axios.post('https://api.stringee.com/v1/call2/callout', {
      "from": {
        "type": "external",
        "number": fromPhone,
        "alias": fromPhone
      },
      "to": [{
        "type": "external",
        "number": phoneNr,
        "alias": phoneNr
      }],
      "actions": [{
        "action": "talk",
        "text": `Your verification code is ${otpCode}.\nYour verification code is ${otpCode}.`
      }]
    }, {
      headers: {
        'X-STRINGEE-AUTH': token
      }
    })

    const {r, message, call_id} = data
    const sendSuccess = (r === STRINGEE_ERROR_CODE.SUCCESS || r === STRINGEE_ERROR_CODE.WAIT_TEXT_TO_SPEECH)
    if (sendSuccess) return;
    const shouldRetry = (r === STRINGEE_ERROR_CODE.UNKNOW_ERROR_1 || r === STRINGEE_ERROR_CODE.MAX_CONCURRENT_CALL)
    if (shouldRetry) {
      if (tried < 3) {
        tried++;
        retries.push(`\t- Try ${tried}: [${call_id}]\t${r}\t${message}`)
        await delay(1000);
      } else {
        getLogger().error(`[Stringee] Failed to sendOTP to ${phoneNr}:\r\n${retries.join('\r\n')}`)
        throw new Error("[Stringee] Failed to send OTP")
      }
    } else {
      getLogger().error(`[Stringee] Failed to sendOTP to ${phoneNr} with error code "${r}-${message}:${call_id}"`)
      throw new Error("[Stringee] Failed to send OTP")
    }
  }
}
