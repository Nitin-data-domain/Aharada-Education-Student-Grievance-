// ============================================================
// Aharada Education — Sub-Task Controller
// Faculty sub-tasks (mail to COE, Dean, etc.)
// ============================================================
const pool = require('../config/db');

/**
 * POST /api/tasks/:taskId/subtasks
 * Faculty creates a sub-task
 */
async function createSubTask(req, res) {
  try {
    const { taskId } = req.params;
    const { description, sub_task_type } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    const result = await pool.query(
      `INSERT INTO sub_tasks (task_id, description, sub_task_type, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [taskId, description, sub_task_type || 'General', req.user.user_id]
    );
    res.status(201).json({ subTask: result.rows[0], message: 'Sub-task created.' });
  } catch (error) {
    console.error('Create sub-task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/tasks/:taskId/subtasks
 * Get all sub-tasks for a task
 */
async function getSubTasks(req, res) {
  try {
    const { taskId } = req.params;
    const result = await pool.query(
      `SELECT st.*, u.name AS created_by_name
       FROM sub_tasks st
       JOIN users u ON st.created_by = u.user_id
       WHERE st.task_id = $1
       ORDER BY st.created_at DESC`,
      [taskId]
    );
    res.json({ subTasks: result.rows });
  } catch (error) {
    console.error('Get sub-tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/subtasks/:id/status
 * Update sub-task status
 */
async function updateSubTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status must be Pending or Done.' });
    }
    const result = await pool.query(
      'UPDATE sub_tasks SET status = $1 WHERE sub_task_id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-task not found.' });
    }
    res.json({ subTask: result.rows[0], message: 'Sub-task updated.' });
  } catch (error) {
    console.error('Update sub-task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createSubTask, getSubTasks, updateSubTaskStatus };
