import {collectDefaultMetrics, register} from 'prom-client';
import {Request, Response} from "hyper-express";

export default async function (app) {
  console.log('[app-route] metrics')
  collectDefaultMetrics();

  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  })
}