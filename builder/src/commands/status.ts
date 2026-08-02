import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getTasks, getLastRebuild } from '../lib/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Show current builder system status — tasks, last KB rebuild, health')
  .addStringOption((opt) =>
    opt
      .setName('filter')
      .setDescription('Filter tasks by status')
      .setRequired(false)
      .addChoices(
        { name: 'All', value: 'all' },
        { name: 'Pending', value: 'pending' },
        { name: 'In Progress', value: 'in_progress' },
        { name: 'Blocked', value: 'blocked' },
        { name: 'Done', value: 'done' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const filter = interaction.options.getString('filter') ?? 'all';

  try {
    const tasks =
      filter === 'all' ? await getTasks() : await getTasks(filter as any);
    const lastRebuild = await getLastRebuild();

    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    const done = tasks.filter((t) => t.status === 'done').length;

    const taskList = tasks
      .slice(0, 10)
      .map((t) => {
        const icon =
          t.status === 'done'
            ? '✅'
            : t.status === 'in_progress'
              ? '🔨'
              : t.status === 'blocked'
                ? '🚫'
                : '⏳';
        return `${icon} \`${t.priority}\` ${t.title}`;
      })
      .join('\n');

    const rebuildInfo = lastRebuild
      ? `Last rebuild: ${new Date(lastRebuild.created_at).toLocaleString()} (${lastRebuild.status})`
      : 'No rebuilds recorded yet';

    const embed = new EmbedBuilder()
      .setTitle('Builder System Status')
      .setColor(0x4abd98)
      .addFields(
        {
          name: 'Task Summary',
          value: `⏳ Pending: ${pending} | 🔨 Active: ${inProgress} | 🚫 Blocked: ${blocked} | ✅ Done: ${done}`,
        },
        {
          name: `Tasks${filter !== 'all' ? ` (${filter})` : ''} (top 10)`,
          value: taskList || 'No tasks found.',
        },
        { name: 'Layer 2 (KB)', value: rebuildInfo }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(`Failed to fetch status: ${msg}`);
  }
}
