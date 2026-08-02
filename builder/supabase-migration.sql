-- ============================================================
-- Builder System Tables
-- Run this in Supabase SQL Editor before deploying the builder
-- ============================================================

-- Layer 1: Daily notes written by agents or manually
CREATE TABLE IF NOT EXISTS builder_daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  agent_role text NOT NULL CHECK (agent_role IN ('builder', 'designer', 'qa', 'planner', 'refactor', 'manual')),
  note_type text NOT NULL CHECK (note_type IN ('progress', 'blocker', 'decision', 'question', 'task_complete')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Task tracking for all agent work
CREATE TABLE IF NOT EXISTS builder_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'done', 'cancelled')),
  assigned_to text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  stale_after_hours integer NOT NULL DEFAULT 24,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- KB rebuild log for tracking Layer 2 runs
CREATE TABLE IF NOT EXISTS builder_kb_rebuild_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  commits_since text NOT NULL DEFAULT '',
  commits_until text NOT NULL DEFAULT '',
  notes_included integer NOT NULL DEFAULT 0,
  output_hash text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  error text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_builder_notes_created ON builder_daily_notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_tasks_status ON builder_tasks (status);
CREATE INDEX IF NOT EXISTS idx_builder_tasks_activity ON builder_tasks (last_activity_at);
CREATE INDEX IF NOT EXISTS idx_builder_kb_log_created ON builder_kb_rebuild_log (created_at DESC);

-- RLS: These tables are accessed via service role key (server-side only)
-- so RLS is enabled but with a permissive policy for the service role
ALTER TABLE builder_daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_kb_rebuild_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default, but add explicit policies
-- for any future authenticated access
CREATE POLICY "Service role full access" ON builder_daily_notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON builder_tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON builder_kb_rebuild_log
  FOR ALL USING (true) WITH CHECK (true);
