import {envVar} from './env-var';
import dotenv from "dotenv";
import remoteEnv from "./utils/remote-env";
import {Server} from "hyper-express"
import cors from "cors"
import registerAppHook from "./logic/hooks/register-app-hook"
import usePlugins from "./plugins"
import useRoutes from "./routes"
import {getLogger} from "./utils/logger"
import {readableResp} from "./utils/common-util";

// this function can be used for Node or serverless
// TODO: underpressure
export default async function () {
  dotenv.config();
  await remoteEnv.config();
  envVar.parse(process.env);
  const app = new Server();
  process.on('uncaughtException', (e, origin) => {
    console.log('Uncaught Exception:', e, 'origin:', origin);
    getLogger()?.error(e.message, {fn: 'uncaughtException', origin, stack: e.stack, cause: e.cause});
    app.close();
    setTimeout(() => process.exit(1), 1000);
  })
  process.on("unhandledRejection", (reason: Error | any, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    getLogger()?.error(reason.message, {fn: 'unhandledRejection', stack: reason.stack, cause: reason.cause});
    app.close();
    setTimeout(() => process.exit(1), 1000);
  })
  app.use(cors());
  await usePlugins(app);
  await useRoutes(app);
  await registerAppHook();
  app.set_error_handler((__, res, error) => {
    // @ts-ignore
    if (error.__API_ERROR__) {
      // @ts-ignore
      res.status(error.statusCode || 400).json({error: error.errorCode, message: error.message})
    } else {
      const reason = typeof (error) === 'string' ? error : readableResp(error)
      res.status(500).json({error: "E_000", reason})
    }
  });
  app.set_not_found_handler((req, res) => {
    if (req.url !== '/') {
      console.log('Not found: ', req.method, req.url)
      res.status(404).end()
      return
    }
    res.status(200).send(process.env.POD_NAME)
  });
  return app;
}
