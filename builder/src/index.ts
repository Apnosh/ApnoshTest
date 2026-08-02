/**
 * Apnosh Builder System — Main Entry Point
 *
 * Boots:
 * 1. Discord bot with 7 slash commands
 * 2. Layer 2 cron (KB rebuild at 2am daily)
 * 3. Layer 3 cron (heartbeat every 30 minutes)
 * 4. Health check HTTP server for Railway
 */

import { Events, Collection, ChatInputCommandInteraction } from 'discord.js';
import cron from 'node-cron';
import http from 'node:http';
import { client } from './lib/discord.js';
import { commands } from './commands/index.js';
import { rebuildKnowledgeBase } from './cron/layer2.js';
import { heartbeat } from './cron/layer3.js';
import { sendToChannel } from './lib/discord.js';

// ---------------------------------------------------------------------------
// Command registry
// ---------------------------------------------------------------------------

const commandMap = new Collection<string, (typeof commands)[number]>();
for (const cmd of commands) {
  commandMap.set(cmd.data.name, cmd);
}

// ---------------------------------------------------------------------------
// Discord event handlers
// ---------------------------------------------------------------------------

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[Bot] Logged in as ${readyClient.user.tag}`);
  await sendToChannel('🟢 **Builder System Online** — bot, Layer 2, and Layer 3 active.');
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    await interaction.reply({
      content: `Unknown command: /${interaction.commandName}`,
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Bot] Command /${interaction.commandName} failed:`, msg);

    const reply = { content: `Command failed: ${msg}`, ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// ---------------------------------------------------------------------------
// Cron schedules
// ---------------------------------------------------------------------------

// Layer 2: KB rebuild at 2:00 AM daily (in configured TZ, default Pacific)
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Layer 2 KB rebuild triggered');
  await rebuildKnowledgeBase();
});

// Layer 3: Heartbeat every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('[Cron] Layer 3 heartbeat triggered');
  await heartbeat();
});

console.log('[Cron] Scheduled: Layer 2 at 2:00 AM, Layer 3 every 30 min');

// ---------------------------------------------------------------------------
// Health check server (for Railway)
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'apnosh-builder',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

server.listen(PORT, () => {
  console.log(`[Health] Listening on port ${PORT}`);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

client.login(process.env.DISCORD_TOKEN);
