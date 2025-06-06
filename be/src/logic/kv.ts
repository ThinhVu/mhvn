import {encrypt, decrypt} from '../utils/crypto'
import {Model} from "../db/models";

export async function getAll() {
  const kvs = await Model.KVs.find().toArray()
  for (const kv of kvs) {
    if (kv.isSecret) {
      // @ts-ignore
      kv.encrypted = kv.value
      kv.value = decrypt(kv.value, process.env.KV_SECRET)
    }
  }
  return kvs;
}

export async function get(k: string) {
  return Model.KVs.findOne({key: k})
}

export async function getValue(k: string) {
  const kvDoc = await Model.KVs.findOne({key: k});
  if (!kvDoc) return null;
  return kvDoc.isSecret ? decrypt(kvDoc.value, process.env.KV_SECRET) : kvDoc.value;
}

export async function set(k: string, v: any, isSecret: boolean) {
  return Model.KVs.updateOne(
    {key: k},
    {$set: {value: isSecret ? encrypt(v, process.env.KV_SECRET) : v, isSecret}},
    {upsert: true})
}

export async function remove(k: string) {
  return Model.KVs.deleteOne({key: k})
}
