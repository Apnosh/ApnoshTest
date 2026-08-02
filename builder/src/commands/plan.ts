import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { createTask, createNote } from '../lib/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('plan')
  .setDescription('Break down a feature into a task list (Planner Agent)')
  .addStringOption((opt) =>
    opt
      .setName('feature')
      .setDescription('Feature to plan (e.g., "client onboarding flow")')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('context')
      .setDescription('Additional context or constraints')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const feature = interaction.options.getString('feature', true);
  const context = interaction.options.getString('context') ?? '';

  try {
    const task = await createTask({
      title: `Plan: ${feature}`,
      description: context
        ? `Context: ${context}\nQueued by ${interaction.user.tag}`
        : `Queued by ${interaction.user.tag}`,
      status: 'pending',
      assigned_to: 'planner',
      priority: 'medium',
      stale_after_hours: 24,
      metadata: { feature, context, discord_user: interaction.user.id },
    });

    await createNote({
      agent_role: 'manual',
      note_type: 'progress',
      content: `Planning task queued: ${feature}${context ? ` (context: ${context})` : ''}`,
      metadata: { task_id: task.id },
    });

    const embed = new EmbedBuilder()
      .setTitle('Planning Task Queued')
      .setColor(0x085041)
      .addFields(
        { name: 'Feature', value: feature },
        ...(context ? [{ name: 'Context', value: context }] : []),
        { name: 'Task ID', value: `\`${task.id}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(`Failed to queue planning task: ${msg}`);
  }
}
