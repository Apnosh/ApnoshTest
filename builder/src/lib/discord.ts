import { Client, GatewayIntentBits, TextChannel, EmbedBuilder } from 'discord.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN');
}

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/**
 * Send a message to the configured status channel.
 */
export async function sendToChannel(content: string): Promise<void> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId);
  if (channel && channel instanceof TextChannel) {
    await channel.send(content);
  }
}

/**
 * Send a rich embed to the configured status channel.
 */
export async function sendEmbed(embed: EmbedBuilder): Promise<void> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId);
  if (channel && channel instanceof TextChannel) {
    await channel.send({ embeds: [embed] });
  }
}

/**
 * Get the admin user mention string for @mark pings.
 */
export function adminMention(): string {
  const userId = process.env.DISCORD_ADMIN_USER_ID;
  return userId ? `<@${userId}>` : '@admin';
}
