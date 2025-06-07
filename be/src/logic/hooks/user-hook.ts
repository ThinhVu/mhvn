import appHook from "./index";
import {ObjectId} from "mongodb";
import {logLogin, logLogout} from "../metric/user-login-history"
import {Model} from "../../models";

export default async function userHooks() {
  appHook.on('user:online', async function (uid: ObjectId) {
    console.log(`[user-hook] user:online ${uid}`)
    logLogin(uid).catch(console.error);

    await Model.Users.updateOne({_id: uid}, {$set: {isOnline: true}})
  })

  appHook.on('user:offline', async function (uid: ObjectId) {
    console.log(`[user-hook] user:offline ${uid}`)
    logLogout(uid).catch(console.error);
    ;
    await Model.Users.updateOne({_id: uid}, {$set: {isOnline: false}})
  })
}
