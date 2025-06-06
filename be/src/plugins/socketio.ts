import _ from 'lodash'
import jwt from 'jsonwebtoken'
import {Server, Socket} from 'socket.io'
import {createAdapter} from "@socket.io/redis-adapter"
import {createAdapter as createMongoDbAdapter} from '@socket.io/mongo-adapter'
import {createClient} from "redis"
import appHook from "../logic/hooks"
import * as process from "process";
import {Model} from "../db/models";
import {getColl} from "./mongodb";

/**
 * https://socket.io/docs/v4/migrating-from-3-x-to-4-0/#the-default-value-of-pingtimeout-was-increased
 */
const SOCKET_PING_TIMEOUT_IN_MS = 20000

/**
 * Now with Redis adapter, userSockets is not only contain user-socket pairs in local server
 * but also contain user-socket pairs in multiple server
 *
 * Sync by SSE_EVENTS.connection & SSE_EVENTS.disconnect
 */
const SSE_EVENTS = {
  connection: 'sse_connection',
  disconnect: 'sse_disconnect'
}
const UserId_SocketIds_Map = {}

async function createSocketServer(app) {
  console.log('[socket.io] createSocketServer')
  const corsOrigins = (process.env.SOCKET_IO_CORS_ORIGIN || 'http://127.0.0.1:5173' /*VITE*/).split(',')
  console.log('[socket.io] corsOrigins', corsOrigins)
  const transports = (process.env.SOCKET_IO_TRANSPORTS_METHOD || 'websocket').split(',')
  console.log('[socket.io] transports', transports)
  // @ts-ignore
  const io = new Server({
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST', 'DELETE', 'PUT'],
      credentials: true
    },
    transports
  });
  io.attachApp(app.uws_instance);

  // socket io adapter
  const useSocketIoAdapter = process.env.USE_SOCKET_IO_REDIS_ADAPTER || process.env.USE_SOCKET_IO_MONGO_ADAPTER
  if (process.env.USE_SOCKET_IO_REDIS_ADAPTER) {
    console.log('[socket.io] use redis adapter')
    const pubClient = createClient({url: process.env.SOCKET_IO_REDIS_ADAPTER_URL})
    const subClient = pubClient.duplicate()
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } else if (process.env.USE_SOCKET_IO_MONGO_ADAPTER) {
    console.log('[socket.io] use mongodb adapter')
    const mongoCollection = getColl('socket-io');
    await mongoCollection.createIndex(
      {createdAt: 1},
      {expireAfterSeconds: 7200, background: true}
    )
    // @ts-ignore
    io.adapter(createMongoDbAdapter(mongoCollection, {addCreatedAtField: true}))
  }

  const adminNs = io.of('/admin');
  adminNs.use(async (socket: Socket, next) => {
    const token = _.get(socket, 'handshake.query.token') as string
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        // @ts-ignore
        const user = await Model.AdminUsers.findOne({email: payload.user.email})
        if (user) {
          // @ts-ignore
          socket.authUser = user
          next()
        } else {
          next(new Error('Authentication error'))
        }
      } catch (e) {
        next(new Error(e.message))
      }
    } else {
      next(new Error('Authentication error'))
    }
  });
  adminNs.on('connection', socket => {
    socket.on('watch', (...args) => {
      const gr = args.join(':')
      console.log('[socket.io] watch', gr)
      socket.join(gr)
    })

    socket.on('un-watch', (...args) => {
      const gr = args.join(':')
      console.log('[socket.io] unwatch', gr)
      socket.leave(gr)
    })
  })

  const appNs = io.of('/app')
  appNs.use((socket: Socket, next) => {
    const token = _.get(socket, 'handshake.query.token') as string
    if (token) {
      try {
        // @ts-ignore
        const {user} = jwt.verify(token, process.env.JWT_SECRET)
        if (user) {
          // @ts-ignore
          socket.authUser = user
          next()
        } else {
          next(new Error('Authentication error'))
        }
      } catch (e) {
        next(new Error(e.message))
      }
    } else {
      next(new Error('Authentication error'))
    }
  });
  // @ts-ignore
  appNs.toUser = (userId: string) => {
    const socketIds = Object.keys(UserId_SocketIds_Map[userId] || {})
    return {
      // https://socket.io/docs/v4/redis-adapter/
      // each socket connected to server will join room = its id
      // so emit to socket is equal to emit to a room, the message will be sent to all server
      emit: (ev, ...args) => {
        for (const socketId of socketIds) {
          appNs.to(socketId).emit(ev, ...args)
        }
      }
    }
  }

  function onUserOnline(userId, socketId) {
    if (!UserId_SocketIds_Map[userId])
      UserId_SocketIds_Map[userId] = {}
    UserId_SocketIds_Map[userId][socketId] = 1
  }

  function onUserOffline(userId, socketId) {
    if (UserId_SocketIds_Map[userId])
      delete UserId_SocketIds_Map[userId][socketId]
  }

  appNs.on(SSE_EVENTS.connection, onUserOnline)
  appNs.on(SSE_EVENTS.disconnect, onUserOffline)

  appNs.on('connection', async (socket: Socket) => {
    // @ts-ignore
    const userId = socket.authUser._id
    console.log(`[socket.io] ${userId} connect`)
    await Model.Users.updateOne({_id: userId}, {$set: {isOnline: true}})


    // update socket connection status in current server
    onUserOnline(userId, socket.id)

    // update socket connection status in remote servers
    // https://socket.io/docs/v4/adapter/
    if (useSocketIoAdapter)
      appNs.serverSideEmit(SSE_EVENTS.connection, userId, socket.id)

    appHook.trigger('user:online', userId)

    socket.on('disconnect', async reason => {
      console.log(`[socket.io] ${userId} disconnect with reason ${reason}`)
      console.log(`[socket.io] trigger "user:offline" after ${SOCKET_PING_TIMEOUT_IN_MS}ms if the user not re-connect`)
      onUserOffline(userId, socket.id)
      if (useSocketIoAdapter)
        appNs.serverSideEmit(SSE_EVENTS.disconnect, userId, socket.id) // https://socket.io/docs/v4/adapter/
      await Model.Users.updateOne({_id: userId}, {$set: {isOnline: false}})
      // There is a case when user disconnect from server A at time (t)
      // Then connect to server B at time (t + x) with x < SOCKET_PING_TIMEOUT
      // The 'disconnect' event will be raise in server A at time (t + SOCKET_PING_TIMEOUT)
      // In this case, we just ignore the disconnection of socket in server A.
      setTimeout(async () => {
        const isUserFinallyOffline = await Model.Users.countDocuments({_id: userId, isOnline: false})
        if (isUserFinallyOffline)
          appHook.trigger('user:offline', userId)
      }, SOCKET_PING_TIMEOUT_IN_MS)
    });

    socket.emit("__TEST__", "__TEST__")
  });

  return io
}

export default async function useSocketIO(app) {
  console.log('[plugin] socket.io')
  // @ts-ignore
  global.io = await createSocketServer(app)
}
