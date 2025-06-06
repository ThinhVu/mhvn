import jwt from 'jsonwebtoken';
import {Request} from "hyper-express";
import {IUser} from "../db/models/user";

export interface IAuthData {
  user: Record<string, any>,
  expired: boolean
}

type TokenPayload = { user: { _id: string }, exp: number, iat: number }
const tokenCache = new Map<string, TokenPayload>();

export function parseAuthorization(req: Request): IAuthData {
  const authorization = req.headers.authorization || req.headers.Authorization;
  if (!authorization) return {user: null, expired: null};
  const jwtToken = authorization.split(' ')[1];
  if (process.env.PERF_BOOST) {
    const data = tokenCache.get(jwtToken);
    if (data) {
      const expired = Date.now() > data.exp * 1000;
      if (expired) tokenCache.delete(jwtToken);
      return {user: data.user, expired}
    }
  }
  const data = jwt.verify(jwtToken, process.env.JWT_SECRET, {ignoreExpiration: true}) as TokenPayload;
  if (data) {
    if (process.env.PERF_BOOST) {
      tokenCache.set(jwtToken, data)
    }
    return {user: data.user, expired: Date.now() > data.exp * 1000}
  } else {
    return {user: null, expired: null}
  }
}

export function genToken(user: IUser): string {
  const payload = {user: {_id: user._id}}
  return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '7d'})
}

export function genAdminToken(admin): string {
  const payload = {user: admin}
  return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '7d'})
}
