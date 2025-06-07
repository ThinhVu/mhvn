import patches from "../migrations";
import {getVersion} from "../utils/common-util";
import {Model} from "../models";

export default async function migrate() {
  console.log('[mongodb] [migrate] Migrate database')

  const DbMigrateHistory = Model.DbMigrateHistories

  async function patchIsNotApplied(patch) {
    const docNr = await DbMigrateHistory.countDocuments({id: patch.patchId, success: true})
    return docNr === 0
  }

  if (patches.length) {
    console.log('[mongodb] [migrate] Found patches')
    const currentVersion = getVersion()
    console.log('[mongodb] [migrate] Patch begin')
    for (const patch of patches) {
      if (patch.alwaysRun || (patch.shouldRun(currentVersion) && await patchIsNotApplied(patch))) {
        try {
          console.log(`[mongodb] [migrate] Applying patch: ${patch.patchId}`)
          await patch.run()
          await DbMigrateHistory.updateOne(
            {id: patch.patchId},
            {$set: {success: true, date: new Date()}},
            {upsert: true})
          console.log(`[mongodb] [migrate] Patch ${patch.patchId} success.`)
        } catch (e) {
          console.log(`[mongodb] [migrate] Patch failed with reason: ${e.message}`)
          await DbMigrateHistory.updateOne(
            {id: patch.patchId},
            {$set: {success: false, date: new Date(), reason: e.message}},
            {upsert: true})
        }
      } else {
        console.log(`[mongodb] [migrate] Patch ${patch.patchId} doesn't need to upgrade. Skip`)
      }
    }
    console.log('[mongodb] [migrate] Patch end!')
  } else {
    console.log('[mongodb] [migrate] No patches found')
  }
}