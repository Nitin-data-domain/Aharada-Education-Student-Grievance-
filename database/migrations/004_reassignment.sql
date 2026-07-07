-- ============================================================
-- Aharada Education
-- Migration 004: Reassignment Support
-- - Add previous_faculty_id to tasks for tracking handoffs
-- - Add reassignment_reason to tasks
-- - Add remark column to task_history for context on each change
-- ============================================================

-- 1. Track the previous faculty when a task is reassigned
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS previous_faculty_id INT REFERENCES users(user_id) ON DELETE SET NULL;

-- 2. Reason for reassignment (HOD fills this in)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;

-- 3. Add remark to task_history so each stage change can carry context
ALTER TABLE task_history ADD COLUMN IF NOT EXISTS remark TEXT;

-- 4. Index for previous faculty lookups
CREATE INDEX IF NOT EXISTS idx_tasks_prev_faculty ON tasks(previous_faculty_id);
