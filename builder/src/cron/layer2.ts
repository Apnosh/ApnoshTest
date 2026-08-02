/**
 * Layer 2 — Knowledge Base Rebuild
 *
 * Runs daily at 2am (or manually via /rebuild-kb).
 * 1. Pulls GitHub commits since last rebuild
 * 2. Pulls Layer 1 notes from Supabase since last rebuild
 * 3. Calls Claude API to synthesize an updated CLAUDE.md
 * 4. Commits the updated file back to the repo
 * 5. Logs the rebuild to Supabase
 */

import { Octokit } from '@octokit/rest';
import { getCommitsSince, getFileContent } from '../lib/github.js';
import { getRecentNotes, getLastRebuild, logKBRebuild } from '../lib/supabase.js';
import { synthesizeCLAUDEmd } from '../lib/claude.js';
import { sendToChannel, adminMention } from '../lib/discord.js';
import crypto from 'node:crypto';

interface RebuildResult {
  status: 'success' | 'failure';
  commitsProcessed: number;
  notesIncluded: number;
  error?: string;
}

export async function rebuildKnowledgeBase(): Promise<RebuildResult> {
  console.log('[Layer 2] Starting KB rebuild...');

  try {
    // 1. Determine time range — since last rebuild or 24h ago
    const lastRebuild = await getLastRebuild();
    const since = lastRebuild
      ? lastRebuild.commits_until
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();

    // 2. Fetch inputs
    const [commits, notes, currentCLAUDEmd] = await Promise.all([
      getCommitsSince(since),
      getRecentNotes(since),
      getFileContent('CLAUDE.md'),
    ]);

    if (!currentCLAUDEmd) {
      throw new Error('CLAUDE.md not found in repo');
    }

    console.log(
      `[Layer 2] Found ${commits.length} commits and ${notes.length} notes since ${since}`
    );

    // 3. Synthesize new CLAUDE.md via Claude API
    const newContent = await synthesizeCLAUDEmd({
      currentCLAUDEmd,
      commits,
      notes,
    });

    // 4. Commit to repo if content changed
    const oldHash = crypto
      .createHash('sha256')
      .update(currentCLAUDEmd)
      .digest('hex');
    const newHash = crypto
      .createHash('sha256')
      .update(newContent)
      .digest('hex');

    if (oldHash !== newHash) {
      await commitFileToRepo('CLAUDE.md', newContent);
      console.log('[Layer 2] CLAUDE.md updated and committed');
    } else {
      console.log('[Layer 2] No meaningful changes — skipping commit');
    }

    // 5. Log the rebuild
    await logKBRebuild({
      commits_since: since,
      commits_until: until,
      notes_included: notes.length,
      output_hash: newHash,
      status: 'success',
      error: null,
    });

    await sendToChannel(
      `✅ **KB Rebuild Complete**\n` +
        `Commits: ${commits.length} | Notes: ${notes.length} | ` +
        `Content ${oldHash !== newHash ? 'updated' : 'unchanged'}`
    );

    return {
      status: 'success',
      commitsProcessed: commits.length,
      notesIncluded: notes.length,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Layer 2] Rebuild failed:', errorMsg);

    await logKBRebuild({
      commits_since: '',
      commits_until: new Date().toISOString(),
      notes_included: 0,
      output_hash: '',
      status: 'failure',
      error: errorMsg,
    });

    await sendToChannel(
      `❌ **KB Rebuild Failed**\n\`\`\`\n${errorMsg}\n\`\`\`\n${adminMention()}`
    );

    return {
      status: 'failure',
      commitsProcessed: 0,
      notesIncluded: 0,
      error: errorMsg,
    };
  }
}

/**
 * Commit a file to the GitHub repo via the API.
 */
async function commitFileToRepo(
  path: string,
  content: string
): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER ?? 'Apnosh';
  const repo = process.env.GITHUB_REPO ?? 'apnosh-portal';

  // Get current file SHA (needed for update)
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ('sha' in data) {
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet — that's fine, we'll create it
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `[builder] Layer 2 KB rebuild — ${new Date().toISOString().split('T')[0]}`,
    content: Buffer.from(content).toString('base64'),
    sha,
  });
}
