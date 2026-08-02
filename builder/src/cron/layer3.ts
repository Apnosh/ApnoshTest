/**
 * Layer 3 — Heartbeat
 *
 * Runs every 30 minutes.
 * 1. Checks for stale tasks (no activity beyond their stale_after_hours threshold)
 * 2. Checks for blocked tasks that need human attention
 * 3. Pings Discord with alerts
 */

import { EmbedBuilder } from 'discord.js';
import { getStaleTasks, getTasks } from '../lib/supabase.js';
import { sendEmbed, sendToChannel, adminMention } from '../lib/discord.js';

export async function heartbeat(): Promise<void> {
  console.log('[Layer 3] Heartbeat running...');

  try {
    // Check for stale tasks (use each task's own stale_after_hours)
    // Default check: anything with no activity in 6+ hours
    const staleTasks = await getStaleTasks(6);
    const blockedTasks = await getTasks('blocked');

    if (staleTasks.length === 0 && blockedTasks.length === 0) {
      console.log('[Layer 3] All clear — no stale or blocked tasks');
      return;
    }

    // Build stale tasks alert
    if (staleTasks.length > 0) {
      const staleList = staleTasks
        .map((t) => {
          const hoursAgo = Math.round(
            (Date.now() - new Date(t.last_activity_at).getTime()) / (1000 * 60 * 60)
          );
          return `- **${t.title}** (${t.status}, ${hoursAgo}h stale, ${t.priority} priority)`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${staleTasks.length} Stale Task${staleTasks.length > 1 ? 's' : ''}`)
        .setColor(0xf59e0b)
        .setDescription(staleList)
        .setFooter({ text: 'Layer 3 Heartbeat' })
        .setTimestamp();

      await sendEmbed(embed);
    }

    // Build blocked tasks alert
    if (blockedTasks.length > 0) {
      const blockedList = blockedTasks
        .map((t) => `- **${t.title}**: ${t.description?.slice(0, 100) ?? 'No description'}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🚫 ${blockedTasks.length} Blocked Task${blockedTasks.length > 1 ? 's' : ''}`)
        .setColor(0xe24b4a)
        .setDescription(`${blockedList}\n\n${adminMention()} — these need human input.`)
        .setFooter({ text: 'Layer 3 Heartbeat' })
        .setTimestamp();

      await sendEmbed(embed);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Layer 3] Heartbeat error:', msg);
    await sendToChannel(`❌ **Heartbeat Error**: ${msg}`);
  }
}
