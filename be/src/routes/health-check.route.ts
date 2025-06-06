import {Router} from 'hyper-express'

export default async function useHealthCheck(parentRouter: Router) {
  console.log('[route] useHealthCheck')

  const router = new Router()
  router.get('/', (_, res) => res.status(200).end())

  parentRouter.use('/health-check', router)
}
