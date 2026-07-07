-- ============================================================
-- Antigravity Model: Student Grievance Portal
-- Migration 002: Create Core Tables
-- ============================================================

DROP TABLE IF EXISTS task_history, tasks, users CASCADE;

-- -----------------------------------------------
-- Table: Users
-- -----------------------------------------------
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,
    email       VARCHAR(100)    NOT NULL UNIQUE,
    phone       VARCHAR(15),
    password    VARCHAR(255)    NOT NULL,
    role        user_role       NOT NULL DEFAULT 'Student',
    program_name VARCHAR(100),
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- Table: Tasks
-- -----------------------------------------------
CREATE TABLE tasks (
    task_id         SERIAL PRIMARY KEY,
    student_id      INT             NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    admission_no    VARCHAR(50)     NOT NULL,
    problem_desc    TEXT            NOT NULL,
    file_url        VARCHAR(255),
    assigned_to     INT             REFERENCES users(user_id) ON DELETE SET NULL,
    current_status  task_status     NOT NULL DEFAULT 'Submitted',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- Table: TaskHistory (audit trail)
-- -----------------------------------------------
CREATE TABLE task_history (
    history_id       SERIAL PRIMARY KEY,
    task_id          INT             NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    stage_changed_to VARCHAR(50)     NOT NULL,
    updated_by       INT             NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    changed_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- Indexes for performance
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_student_id   ON tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to   ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(current_status);
CREATE INDEX IF NOT EXISTS idx_task_history_task   ON task_history(task_id);

-- -----------------------------------------------
-- Seed Data: Default HOD & Faculty users
-- Passwords are bcrypt hash of 'password123'
-- -----------------------------------------------
INSERT INTO users (name, email, phone, password, role, program_name)
VALUES
    ('Dr. Priya Sharma', 'hod@university.edu', '+919876543210', '$2a$10$fEFtvuu/hrfvpYW4Ytufj.Lz4wPeuVjKZSBixBYXXSXbmibSWMpuG', 'HOD', 'Computer Science'),
    ('Prof. Rajesh Kumar', 'rajesh@university.edu', '+919876543211', '$2a$10$fEFtvuu/hrfvpYW4Ytufj.Lz4wPeuVjKZSBixBYXXSXbmibSWMpuG', 'Faculty', 'Computer Science'),
    ('Prof. Anita Gupta', 'anita@university.edu', '+919876543212', '$2a$10$fEFtvuu/hrfvpYW4Ytufj.Lz4wPeuVjKZSBixBYXXSXbmibSWMpuG', 'Faculty', 'Data Analytics'),
    ('Prof. Vikram Singh', 'vikram@university.edu', '+919876543213', '$2a$10$fEFtvuu/hrfvpYW4Ytufj.Lz4wPeuVjKZSBixBYXXSXbmibSWMpuG', 'Faculty', 'BBA'),
    ('Nitin (Student)', 'student@university.edu', '+919876543214', '$2a$10$fEFtvuu/hrfvpYW4Ytufj.Lz4wPeuVjKZSBixBYXXSXbmibSWMpuG', 'Student', 'BBA Data Analytics')
ON CONFLICT (email) DO NOTHING;
