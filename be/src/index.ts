import createApp from "./app";

async function main() {
  const app = await createApp()
  await app.listen(+process.env.PORT)
  console.log(`[app] ready at http://localhost:${process.env.PORT}`)
}

main()