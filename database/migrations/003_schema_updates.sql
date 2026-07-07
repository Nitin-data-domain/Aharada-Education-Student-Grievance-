-- ============================================================
-- Antigravity Model → Aharada Education
-- Migration 003: Schema Updates
-- - Programs table (HOD-managed)
-- - Faculty is_active flag
-- - Forgot password OTP fields
-- - Task remarks (student + HOD)
-- - Sub-tasks for faculty
-- ============================================================

-- -----------------------------------------------
-- 1. Add is_active to users (faculty deactivation)
-- -----------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------
-- 2. Add OTP fields for forgot password
-- -----------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

-- -----------------------------------------------
-- 3. Programs table (managed by HOD)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
    program_id   SERIAL PRIMARY KEY,
    program_code VARCHAR(30)  NOT NULL UNIQUE,
    program_name VARCHAR(100) NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default programs
INSERT INTO programs (program_code, program_name) VALUES
    ('BBA-AT',      'BBA - Automation Technology'),
    ('BBA-EI',      'BBA - Entrepreneurship & Innovation'),
    ('BBA-DA-AI',   'BBA - Data Analytics & AI'),
    ('MBA-DA-AI',   'MBA - Data Analytics & AI'),
    ('MBA-AM',      'MBA - Agri Management'),
    ('BFD',         'BFD - Bachelor of Fashion Design')
ON CONFLICT (program_code) DO NOTHING;

-- -----------------------------------------------
-- 4. Add remarks to tasks
-- -----------------------------------------------
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remark_student TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remark_hod TEXT;

-- -----------------------------------------------
-- 5. Sub-tasks table (faculty actions)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS sub_tasks (
    sub_task_id   SERIAL PRIMARY KEY,
    task_id       INT          NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    description   TEXT         NOT NULL,
    sub_task_type VARCHAR(50)  NOT NULL DEFAULT 'General',
    status        VARCHAR(20)  NOT NULL DEFAULT 'Pending',
    created_by    INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_tasks_task ON sub_tasks(task_id);

-- -----------------------------------------------
-- 6. Update program_name in users to allow linking
-- -----------------------------------------------
-- We keep program_name as text for flexibility
