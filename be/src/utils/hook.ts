import {getLogger} from "./logger";
// TODO: queue, race condition

export default function hook() {
  const ehMap = {}
  return {
    on(event: string, handler) {
      if (typeof handler !== 'function')
        throw new Error("Invalid handler")
      if (!ehMap[event])
        ehMap[event] = []
      ehMap[event].push(handler)
    },
    off(event: string, handler?) {
      if (!ehMap || !ehMap[event])
        return
      if (!handler)
        ehMap[event] = []
      else
        ehMap[event] = ehMap[event].filter(h => h != handler)
    },
    trigger(event: string, ...data): void | Promise<any> {
      const ehs = ehMap[event]
      if (!ehs)
        return
      for (const eh of ehs) {
        const rs = eh(...data)
        const isPromise = rs && typeof rs.then === 'function'
        if (isPromise) rs.then().catch(e => getLogger().error(e.message, {fn: 'hook::trigger', event, data}))
      }
    }
  }
}
