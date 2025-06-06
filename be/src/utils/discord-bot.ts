import {WebhookClient} from 'discord.js'

let client: WebhookClient;

function initDiscordBot() {
  client = new WebhookClient({url: process.env.DISCORD_WEBHOOK_URL})
}

export function getDiscordBot() {
  if (!client) initDiscordBot()
  return client;
}