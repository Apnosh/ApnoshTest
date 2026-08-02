import { createClient } from '@supabase/supabase-js';
import type { DailyNote, BuilderTask, KBRebuildLog } from '../types/database.js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// Layer 1: Daily Notes
// ---------------------------------------------------------------------------

export async function createNote(
  note: Omit<DailyNote, 'id' | 'created_at'>
): Promise<DailyNote> {
  const { data, error } = await supabase
    .from('builder_daily_notes')
    .insert(note)
    .select()
    .single();

  if (error) throw new Error(`Failed to create note: ${error.message}`);
  return data;
}

export async function getRecentNotes(since: string): Promise<DailyNote[]> {
  const { data, error } = await supabase
    .from('builder_daily_notes')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch notes: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Task Tracking
// ---------------------------------------------------------------------------

export async function getTasks(
  status?: BuilderTask['status']
): Promise<BuilderTask[]> {
  let query = supabase.from('builder_tasks').select('*');
  if (status) query = query.eq('status', status);
  query = query.order('priority', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return data ?? [];
}

export async function getStaleTasks(hoursThreshold: number): Promise<BuilderTask[]> {
  const cutoff = new Date(
    Date.now() - hoursThreshold * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('builder_tasks')
    .select('*')
    .in('status', ['in_progress', 'pending'])
    .lt('last_activity_at', cutoff)
    .order('last_activity_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch stale tasks: ${error.message}`);
  return data ?? [];
}

export async function updateTaskStatus(
  id: string,
  status: BuilderTask['status']
): Promise<void> {
  const { error } = await supabase
    .from('builder_tasks')
    .update({ status, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

export async function createTask(
  task: Omit<BuilderTask, 'id' | 'created_at' | 'updated_at' | 'last_activity_at'>
): Promise<BuilderTask> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('builder_tasks')
    .insert({ ...task, updated_at: now, last_activity_at: now })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// KB Rebuild Log
// ---------------------------------------------------------------------------

export async function logKBRebuild(
  log: Omit<KBRebuildLog, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase
    .from('builder_kb_rebuild_log')
    .insert(log);

  if (error) throw new Error(`Failed to log KB rebuild: ${error.message}`);
}

export async function getLastRebuild(): Promise<KBRebuildLog | null> {
  const { data, error } = await supabase
    .from('builder_kb_rebuild_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch last rebuild: ${error.message}`);
  }
  return data ?? null;
}
