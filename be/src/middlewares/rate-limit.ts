import rateLimit, {Options} from '../libs/rate-limit'
import {RedisStore} from "../libs/rate-limit-redis";
import {createClient} from 'redis';
import uuid from 'time-uuid';

let redisClient, initialized;

async function getRedisStore() {
  if (!redisClient && !initialized) {
    initialized = true
    console.log('init redis client')
    // Create a `node-redis` client
    redisClient = createClient({
      url: process.env.RATE_LIMIT_REDIS_URL
      // ... (see https://github.com/redis/node-redis/blob/master/docs/client-configuration.md)
    })
    // Then connect to the Redis server
    await redisClient.connect()
  }

  return new RedisStore({
    prefix: `rl-${uuid()}:`,
    sendCommand: function (...args: string[]) {
      return redisClient.sendCommand(args)
    },
  });
}

export const rateLimitByIp = async function (options: Partial<Options>) {
  options.keyGenerator = req => req.headers['x-real-ip'] as string || req.ip

  if (process.env.USE_RATE_LIMIT_REDIS) {
    options.store = await getRedisStore()
  }

  return rateLimit(options)
}

// @ts-ignore
export const rateLimitByUser = async function (options: Partial<Options>) {
  options.keyGenerator = req => req.locals.user._id.toString()

  if (process.env.USE_RATE_LIMIT_REDIS) {
    options.store = await getRedisStore()
  }

  return rateLimit(options)
}
