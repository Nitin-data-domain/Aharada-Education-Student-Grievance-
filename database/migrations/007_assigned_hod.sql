-- ============================================================
-- Antigravity Model: Student Grievance Portal
-- Migration 007: Add assigned_hod
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_hod INT REFERENCES users(user_id) ON DELETE SET NULL;
