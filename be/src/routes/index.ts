import useAdmin from "./admin.route";
import useDevServer from "./dev-server.route";
import useFile from "./file.route";
import useFolder from "./folder.route";
import useHealthCheck from "./health-check.route";
import useI18n from "./i18n.route";
import useKv from "./kv.route";
import useUserMetric from "./user-metric.route";
import useNotification from "./notification.route";
import useUser from "./user.route";
import useHmmApp from './hmm.app';
import useMetrics from './metrics.app';
import useAppMetrics from './app-metric.route'
import {Router} from "hyper-express";

export default async function useRoutes(app) {
  await useHmmApp(app)
  await useMetrics(app)

  const router = new Router()
  await useHealthCheck(router)
  await useDevServer(router)
  await useI18n(router)
  await useUserMetric(router)
  await useAdmin(router)
  await useFile(router)
  await useFolder(router)
  await useKv(router)
  await useNotification(router)
  await useUser(router)
  await useAppMetrics(router)

  app.use('/', router)
}
