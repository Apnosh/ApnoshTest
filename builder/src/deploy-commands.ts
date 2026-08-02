/**
 * One-time script to register slash commands with Discord.
 * Run: npx tsx src/deploy-commands.ts
 *
 * Only needs to be re-run when command definitions change
 * (new commands, renamed options, etc).
 */

import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID');
  process.exit(1);
}

const rest = new REST().setToken(token);

const commandData = commands.map((c) => c.data.toJSON());

console.log(`Registering ${commandData.length} slash commands...`);

try {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commandData,
  });
  console.log('Commands registered successfully:');
  commandData.forEach((c) => console.log(`  /${c.name} — ${c.description}`));
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
