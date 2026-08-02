import { Octokit } from '@octokit/rest';

if (!process.env.GITHUB_TOKEN) {
  throw new Error('Missing GITHUB_TOKEN');
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const owner = process.env.GITHUB_OWNER ?? 'Apnosh';
const repo = process.env.GITHUB_REPO ?? 'apnosh-portal';

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: string[];
}

/**
 * Fetch commits since a given ISO timestamp.
 * Returns a simplified list with commit messages and changed files.
 */
export async function getCommitsSince(since: string): Promise<CommitSummary[]> {
  const { data: commits } = await octokit.repos.listCommits({
    owner,
    repo,
    since,
    per_page: 100,
  });

  const summaries: CommitSummary[] = [];

  for (const commit of commits) {
    // Fetch individual commit for file list
    const { data: detail } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: commit.sha,
    });

    summaries.push({
      sha: commit.sha.slice(0, 7),
      message: commit.commit.message,
      author: commit.commit.author?.name ?? 'unknown',
      date: commit.commit.author?.date ?? '',
      filesChanged: (detail.files ?? []).map((f) => f.filename),
    });
  }

  return summaries;
}

/**
 * Fetch the current content of a file from the repo.
 */
export async function getFileContent(path: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ('content' in data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}
