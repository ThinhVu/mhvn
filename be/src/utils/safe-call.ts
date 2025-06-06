import {MiddlewareNext, Request, Response} from 'hyper-express';

type SafeCallHandler<T> = (req: Request, res: Response, next: MiddlewareNext) => Promise<T>;
type SafeCallResponse = (req: Request, res: Response, next: MiddlewareNext) => Promise<void>;

export default function safeCall<T>(fn: SafeCallHandler<T>): SafeCallResponse {
  return async (req, res, next) => {
    const rs = await fn(req, res, next)
    res.json(rs)
  }
}
