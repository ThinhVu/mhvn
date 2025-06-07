import {requireAdmin} from "../middlewares/auth"
import hmmExecFactory from '@tvux/hmmjs'
import jsonFn from 'json-fn'
import {Request, Response} from "hyper-express"
import {Model} from "../models"
import To from "../utils/data-parser"

export function objectIdify(query: any) {
  for (const field of Object.keys(query)) {
    if (field.startsWith('$$ObjectId$$')) {
      const val = query[field];
      const realField = field.replace('$$ObjectId$$', '').replace('$$oid', '');
      if (typeof val === 'string') { // direct query from single object id x: "O0129301230123123aAbbqwdasdw"
        query[realField] = To.oid(query[field], false);
      } else {
        for (const key of Object.keys(val)) {
          switch (key) {
            case '$in':
              const arrayValue = val[key];
              for (let i = 0; i < arrayValue.length; i++) {
                arrayValue[i] = To.oid(arrayValue[i], false);
              }
              break;
            case '$ne':
              val[key] = To.oid(val[key], false);
              break;
            // TODO: support more operator
          }
        }
        // complex cases
        // {cid: {$in: [...]}}
        // {cid: {$ne: "maosidoad"}}
      }
      delete query[field];
    }
  }
}

export default async function hmm(app) {
  if (!process.env.USE_HMM_API) return

  console.log('[app-route] hmm')
  const hmm = hmmExecFactory(Model)
  // json doesn't work well with date time, so we use bodyParser as raw just for hmm
  app.post('/hmm', {middlewares: [requireAdmin]}, async (req: Request, res: Response) => {
    const str = await req.text();
    const qry = jsonFn.parse(str, true);
    const {fns} = qry;
    for (const fn of fns) {
      const {args} = fn;
      for (const arg of args) {
        objectIdify(arg);
      }
    }
    const rs = await hmm(qry)
    res.json(rs)
  })
}
