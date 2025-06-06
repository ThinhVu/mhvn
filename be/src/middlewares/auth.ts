import {ApiError} from "../utils/common-util";
import {parseAuthorization} from "../utils/auth-util";
import To from "../utils/data-parser";
import {ObjectId} from "mongodb";
import {type Request, type Response, type MiddlewareNext} from "hyper-express";
import {Model} from "../db/models";

interface IAuthUser {
  _id: ObjectId;
  email?: string;
  password?: string;
}

export interface UserProps {
  user: IAuthUser
}

export function requireAdmin(req: Request<UserProps>, res: Response, next: MiddlewareNext) {
  const {user} = parseAuthorization(req)
  Model.AdminUsers.findOne({email: user.email, password: user.password}).then(admin => {
    if (!admin) {
      next(new ApiError("E_000", "Invalid admin", 401))
      return
    }
    const authUser = {
      _id: admin._id,
      email: admin.email,
      password: admin.password
    }
    if (req.locals)
      req.locals.user = authUser
    else
      req.locals = {user: authUser}
    next()
  }).catch(e => next(new ApiError("E_000", "Invalid admin", 401)))
}

export function requireUser(req: Request<UserProps>, res: Response, next: MiddlewareNext) {
  const {user, expired} = parseAuthorization(req)
  if (!user || expired) {
    next(new ApiError("E_000", "Invalid user", 401))
    return
  }
  const authUser = {_id: To.oid(user._id)}
  if (req.locals)
    req.locals.user = authUser
  else
    req.locals = {user: authUser}

  next()
}
