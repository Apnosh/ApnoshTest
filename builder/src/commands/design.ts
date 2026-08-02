import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { createTask, createNote } from '../lib/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('design')
  .setDescription('Queue a design review task for the Designer Agent')
  .addStringOption((opt) =>
    opt
      .setName('branch')
      .setDescription('Branch name to review (e.g., "feature/gbp-dashboard")')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('focus')
      .setDescription('What to focus on (e.g., "mobile responsiveness")')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const branch = interaction.options.getString('branch', true);
  const focus = interaction.options.getString('focus') ?? 'Full design system compliance';

  try {
    const task = await createTask({
      title: `Design review: ${branch}`,
      description: `Focus: ${focus}\nQueued by ${interaction.user.tag}`,
      status: 'pending',
      assigned_to: 'designer',
      priority: 'medium',
      stale_after_hours: 12,
      metadata: { branch, discord_user: interaction.user.id },
    });

    await createNote({
      agent_role: 'manual',
      note_type: 'progress',
      content: `Design review queued for branch \`${branch}\` — focus: ${focus}`,
      metadata: { task_id: task.id },
    });

    const embed = new EmbedBuilder()
      .setTitle('Design Review Queued')
      .setColor(0x9fe1cb)
      .addFields(
        { name: 'Branch', value: `\`${branch}\`` },
        { name: 'Focus', value: focus },
        { name: 'Task ID', value: `\`${task.id}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(`Failed to queue design review: ${msg}`);
  }
}
