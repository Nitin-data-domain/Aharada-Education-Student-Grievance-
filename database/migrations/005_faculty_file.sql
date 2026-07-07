-- ============================================================
-- Antigravity Model: Student Grievance Portal
-- Migration 005: Add faculty file upload column
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS faculty_file_url VARCHAR(255);
