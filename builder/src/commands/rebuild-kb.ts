import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { rebuildKnowledgeBase } from '../cron/layer2.js';
import { adminMention } from '../lib/discord.js';

export const data = new SlashCommandBuilder()
  .setName('rebuild-kb')
  .setDescription('Manually trigger a Layer 2 knowledge base rebuild now');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    await interaction.editReply('Starting KB rebuild... this may take a minute.');

    const result = await rebuildKnowledgeBase();

    const embed = new EmbedBuilder()
      .setTitle('KB Rebuild Complete')
      .setColor(result.status === 'success' ? 0x4abd98 : 0xe24b4a)
      .addFields(
        { name: 'Status', value: result.status, inline: true },
        { name: 'Commits processed', value: String(result.commitsProcessed), inline: true },
        { name: 'Notes included', value: String(result.notesIncluded), inline: true }
      )
      .setTimestamp();

    if (result.status === 'failure' && result.error) {
      embed.addFields({ name: 'Error', value: `\`\`\`\n${result.error}\n\`\`\`` });
    }

    await interaction.editReply({ content: '', embeds: [embed] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await interaction.editReply(
      `KB rebuild failed: ${msg}\n${adminMention()} — manual intervention may be needed.`
    );
  }
}
