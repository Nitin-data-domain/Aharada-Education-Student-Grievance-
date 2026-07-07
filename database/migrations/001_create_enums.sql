-- ============================================================
-- Antigravity Model: Student Grievance Portal
-- Migration 001: Create Custom ENUM Types
-- ============================================================

-- Drop existing types if re-running
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;

-- User roles
CREATE TYPE user_role AS ENUM ('Student', 'HOD', 'Faculty');

-- Task status lifecycle
CREATE TYPE task_status AS ENUM ('Submitted', 'Assigned', 'In Progress', 'Resolved');
