/** Layer 1 daily notes — written by agents or manually, read by Layer 2 */
export interface DailyNote {
  id: string;
  created_at: string;
  agent_role: 'builder' | 'designer' | 'qa' | 'planner' | 'refactor' | 'manual';
  note_type: 'progress' | 'blocker' | 'decision' | 'question' | 'task_complete';
  content: string;
  metadata: Record<string, unknown> | null;
}

/** Task tracking — used by heartbeat to detect stale work */
export interface BuilderTask {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  assigned_to: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  stale_after_hours: number;
  last_activity_at: string;
  metadata: Record<string, unknown> | null;
}

/** KB rebuild log — tracks when Layer 2 ran and what it produced */
export interface KBRebuildLog {
  id: string;
  created_at: string;
  commits_since: string;
  commits_until: string;
  notes_included: number;
  output_hash: string;
  status: 'success' | 'failure';
  error: string | null;
}
