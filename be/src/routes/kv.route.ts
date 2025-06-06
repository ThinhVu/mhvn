import $ from "../utils/safe-call";
import {requireAdmin} from "../middlewares/auth";
import {get, getValue, getAll, set, remove} from "../logic/kv";
import {Router} from 'hyper-express';

export default async function useKv(parentRouter: Router) {
  console.log('[route] useKv')
  const router = new Router()

  router.get('/', {
    middlewares: [requireAdmin]
  }, $(async () => getAll()));

  router.get('/:key', {
    middlewares: [requireAdmin]
  }, $(async req => {
    const rs = await getValue(req.path_parameters.key)
    return rs
  }))

  router.post('/:key', {
    middlewares: [requireAdmin]
  }, $(async req => {
    const {value, isSecret} = await req.json()
    return set(req.path_parameters.key, value, isSecret)
  }))

  router.delete('/:key', {
    middlewares: [requireAdmin]
  }, $(async req => {
    const {key} = req.path_parameters
    const cfg = await get(key)
    if (!cfg) throw new Error("Not found")
    const {deletedCount} = await remove(key)
    return deletedCount === 1
  }));

  parentRouter.use('/kv', router)
}
