import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { createNote } from '../lib/supabase.js';
import { createTask } from '../lib/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('build')
  .setDescription('Queue a build task for the Builder Agent')
  .addStringOption((opt) =>
    opt
      .setName('feature')
      .setDescription('What to build (e.g., "GBP OAuth flow")')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('priority')
      .setDescription('Task priority')
      .setRequired(false)
      .addChoices(
        { name: 'Low', value: 'low' },
        { name: 'Medium', value: 'medium' },
        { name: 'High', value: 'high' },
        { name: 'Critical', value: 'critical' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const feature = interaction.options.getString('feature', true);
  const priority = (interaction.options.getString('priority') ?? 'medium') as
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';

  try {
    const task = await createTask({
      title: feature,
      description: `Queued via Discord /build by ${interaction.user.tag}`,
      status: 'pending',
      assigned_to: 'builder',
      priority,
      stale_after_hours: 24,
      metadata: { discord_user: interaction.user.id },
    });

    await createNote({
      agent_role: 'manual',
      note_type: 'progress',
      content: `Build task queued: ${feature} (priority: ${priority})`,
      metadata: { task_id: task.id },
    });

    const embed = new EmbedBuilder()
      .setTitle('Build Task Queued')
      .setColor(0x4abd98)
      .addFields(
        { name: 'Feature', value: feature },
        { name: 'Priority', value: priority, inline: true },
        { name: 'Task ID', value: `\`${task.id}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(`Failed to queue build task: ${msg}`);
  }
}
