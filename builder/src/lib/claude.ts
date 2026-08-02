import Anthropic from '@anthropic-ai/sdk';
import type { CommitSummary } from './github.js';
import type { DailyNote } from '../types/database.js';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY');
}

const client = new Anthropic();

/**
 * Synthesize a new CLAUDE.md from commit history and Layer 1 notes.
 * Returns the full markdown content for the rebuilt file.
 */
export async function synthesizeCLAUDEmd(params: {
  currentCLAUDEmd: string;
  commits: CommitSummary[];
  notes: DailyNote[];
}): Promise<string> {
  const { currentCLAUDEmd, commits, notes } = params;

  const commitBlock = commits
    .map(
      (c) =>
        `- ${c.sha} (${c.date}) by ${c.author}: ${c.message}\n  Files: ${c.filesChanged.join(', ')}`
    )
    .join('\n');

  const notesBlock = notes
    .map(
      (n) =>
        `- [${n.note_type}] (${n.agent_role}, ${n.created_at}): ${n.content}`
    )
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `You are the Apnosh Builder System's knowledge base manager. Your job is to
update the master CLAUDE.md file that all agents read before touching code.

Here is the CURRENT CLAUDE.md:
<current>
${currentCLAUDEmd}
</current>

Here are the COMMITS since last rebuild:
<commits>
${commitBlock || 'No new commits.'}
</commits>

Here are the LAYER 1 NOTES since last rebuild:
<notes>
${notesBlock || 'No new notes.'}
</notes>

INSTRUCTIONS:
1. Update Section 8 "What's Been Built" if commits show new completed features
2. Update Section 9 "Current Priorities" based on notes and remaining work
3. Update Section 10 "Active Design Decisions" if any decisions were made in notes
4. Keep ALL other sections exactly as they are unless a commit/note explicitly
   changes something (e.g., a new table was added to the schema)
5. Preserve the exact markdown format, section numbering, and structure
6. Add today's date to the "Last updated" line at the top
7. If nothing meaningful changed, return the file with only the date updated

Return ONLY the complete updated CLAUDE.md content. No explanation, no wrapping.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude API returned no text response');
  }

  return textBlock.text;
}
