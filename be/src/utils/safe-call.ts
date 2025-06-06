import {MiddlewareNext, Request, Response} from 'hyper-express';
import dayjs from 'dayjs';
import {getLogger} from "./logger";

type SafeCallHandler<T> = (req: Request, res: Response, next: MiddlewareNext) => Promise<T>;
type SafeCallResponse = (req: Request, res: Response, next: MiddlewareNext) => Promise<void>;

export default function safeCall<T>(fn: SafeCallHandler<T>): SafeCallResponse {
  return async (req, res, next) => {
    const then = dayjs()
    const rs = await fn(req, res, next)
    const now = dayjs()
    const diff = now.diff(then, 'millisecond')
    if (diff > 2000) {
      try {
        const meta = {
          locals: req.locals,
          method: req.method,
          path: req.path,
          query: req.query_parameters,
          params: req.path_parameters,
          body: req.method === 'POST' || req.method === 'PUT' ? await req.json() : undefined,
          diff
        }
        getLogger().warn('slow-api', meta)
      } catch (e) {
        console.error('safe-call', e)
      }
    }
    res.json(rs)
  }
}
