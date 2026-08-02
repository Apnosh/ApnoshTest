import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getLastRebuild, getRecentNotes } from '../lib/supabase.js';
import { getFileContent } from '../lib/github.js';

export const data = new SlashCommandBuilder()
  .setName('kb')
  .setDescription('Show knowledge base status — last rebuild, recent notes, current priorities');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const lastRebuild = await getLastRebuild();

    // Get notes from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentNotes = await getRecentNotes(since);

    // Try to read current priorities from CLAUDE.md
    const claudeMd = await getFileContent('CLAUDE.md');
    let priorities = 'Could not read CLAUDE.md from repo';
    if (claudeMd) {
      const match = claudeMd.match(
        /## 9\. Current Priorities([\s\S]*?)(?=\n## \d|$)/
      );
      if (match) {
        priorities = match[1].trim().slice(0, 500);
      }
    }

    const noteSummary = recentNotes.length
      ? recentNotes
          .slice(0, 5)
          .map((n) => `- [${n.note_type}] ${n.content.slice(0, 80)}`)
          .join('\n')
      : 'No notes in last 24h';

    const rebuildInfo = lastRebuild
      ? [
          `Status: **${lastRebuild.status}**`,
          `Time: ${new Date(lastRebuild.created_at).toLocaleString()}`,
          `Notes included: ${lastRebuild.notes_included}`,
        ].join('\n')
      : 'No rebuilds recorded';

    const embed = new EmbedBuilder()
      .setTitle('Knowledge Base Status')
      .setColor(0x085041)
      .addFields(
        { name: 'Last Rebuild', value: rebuildInfo },
        { name: 'Recent Notes (24h)', value: `\`\`\`\n${noteSummary}\n\`\`\`` },
        { name: 'Current Priorities', value: priorities }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(`Failed to fetch KB status: ${msg}`);
  }
}
