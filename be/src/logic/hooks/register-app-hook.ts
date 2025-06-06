import userHooks from "./user-hook";

export default async function () {
  console.log('[hooks] register app hooks')
  await userHooks()
}
