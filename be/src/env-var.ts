import {z} from "zod";

export const envVar = z.object({
  ADMIN_CODE: z.string(),
  PERF_BOOST: z.string().optional(), // should apply extra algorithms to reduce cpu workload
  DATABASE_URL: z.string(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_FROM_DOMAIN: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_SECURE: z.string().optional(),
  FS_API_ENDPOINT: z.string(),
  FS_API_KEY: z.string(),
  JWT_SECRET: z.string(),
  KV_SECRET: z.string(),
  LOG_LEVEL: z.string().optional(),
  NODE_ENV: z.string().optional(),
  POD_NAME: z.string(),
  PORT: z.string(),
  RATE_LIMIT_REDIS_URL: z.string().optional(),
  RUN_CRONJOB: z.string().optional(),
  RUN_DB_MIGRATE: z.string().optional(),
  SOCKET_IO_CORS_ORIGIN: z.string().optional(),
  SOCKET_IO_NOTIFY: z.string().optional(),
  SOCKET_IO_REDIS_ADAPTER_URL: z.string().optional(),
  SOCKET_IO_TRANSPORTS_METHOD: z.string().optional(),
  TOMTOM_SEARCH_API_KEY: z.string().optional(),
  TRIGGER_SERVER_END_CALL_AFTER_MINUTES: z.string().optional(),
  USE_API_METRIC: z.string().optional(),
  USE_DEV_SERVER: z.string().optional(),
  USE_HMM_API: z.string().optional(),
  USE_SOCKET_IO: z.string().optional(),
  USE_RATE_LIMIT_REDIS: z.string().optional()
})

declare global {
  namespace NodeJS {
    interface ProcessEnv
      extends z.infer<typeof envVar> {
    }
  }
}