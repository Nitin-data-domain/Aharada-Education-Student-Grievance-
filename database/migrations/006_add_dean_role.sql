-- ============================================================
-- Antigravity Model: Student Grievance Portal
-- Migration 006: Add Dean role
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Dean';
