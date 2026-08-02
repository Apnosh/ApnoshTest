import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { createTask, createNote } from '../lib/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('qa')
  .setDescription('Queue a QA review for a branch or PR')
  .addStringOption((opt) =>
    opt
      .setName('target')
      .setDescription('Branch name or PR number to review')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('checklist')
      .setDescription('Specific areas to check (e.g., "auth edge cases, RLS")')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getString('target', true);
  const checklist = interaction.options.getString('checklist') ?? 'Full QA pass';

  try {
    const task = await createTask({
      title: `QA review: ${target}`,
      description: `Checklist: ${checklist}\nQueued by ${interaction.user.tag}`,
      status: 'pending',
      assigned_to: 'qa',
      priority: 'high',
      stale_after_hours: 12,
      metadata: { target, discord_user: interaction.user.id },
    });

    await createNote({
      agent_role: 'manual',
      note_type: 'progress',
      content: `QA review queued for \`${target}\` — checklist: ${checklist}`,
      metadata: { task_id: task.id },
    });

    const embed = new EmbedBuilder()
      .setTitle('QA Review Queued')
      .setColor(0xe24b4a)
      .addFields(
        { name: 'Target', value: `\`${target}\`` },
        { name: 'Checklist', value: checklist },
        { name: 'Task ID', value: `\`${task.id}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(`Failed to queue QA review: ${msg}`);
  }
}
