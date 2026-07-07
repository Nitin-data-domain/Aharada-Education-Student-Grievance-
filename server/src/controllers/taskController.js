// ============================================================
// Antigravity Model — Task Controller
// Core business logic for the ticket lifecycle
// ============================================================
const pool = require('../config/db');
const notifications = require('../services/notifications');

/**
 * POST /api/tasks
 * Student submits a new grievance/request
 * Step 1: Submission → status='Submitted' → Notify HOD
 */
async function createTask(req, res) {
  try {
    const { admission_no, problem_desc } = req.body;
    const student_id = req.user.user_id;
    const file_url = req.file ? `/uploads/${req.file.filename}` : null;

    const adm_no = admission_no || (req.user.role === 'Dean' ? 'DEAN-TASK' : null);

    if (!adm_no || !problem_desc) {
      return res.status(400).json({ error: 'Admission number and problem description are required.' });
    }

    // Insert task
    const result = await pool.query(
      `INSERT INTO tasks (student_id, admission_no, problem_desc, file_url, current_status)
       VALUES ($1, $2, $3, $4, 'Submitted')
       RETURNING *`,
      [student_id, adm_no, problem_desc, file_url]
    );

    const task = result.rows[0];

    // Insert into task history
    await pool.query(
      `INSERT INTO task_history (task_id, stage_changed_to, updated_by)
       VALUES ($1, 'Submitted', $2)`,
      [task.task_id, student_id]
    );

    // Notify all HODs
    const hods = await pool.query(
      `SELECT user_id, name, email, phone FROM users WHERE role = 'HOD'`
    );

    for (const hod of hods.rows) {
      await notifications.notifyHODNewSubmission(hod, req.user.name, task.task_id);
    }

    res.status(201).json({
      message: 'Grievance submitted successfully',
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/tasks
 * Fetch tasks filtered by user role:
 * - Student: only their own tasks
 * - HOD: all tasks
 * - Faculty: only tasks assigned to them
 */
async function getTasks(req, res) {
  try {
    const { user_id, role } = req.user;
    let query;
    let params = [];

    if (role === 'Student') {
      query = `
        SELECT t.task_id, t.student_id, t.admission_no, t.problem_desc, t.file_url, t.faculty_file_url, t.assigned_to, t.current_status, t.created_at, t.remark_student,
               t.previous_faculty_id, t.reassignment_reason,
               u_student.name AS student_name, 
               u_student.email AS student_email,
               u_faculty.name AS faculty_name,
               u_prev_faculty.name AS previous_faculty_name
        FROM tasks t
        JOIN users u_student ON t.student_id = u_student.user_id
        LEFT JOIN users u_faculty ON t.assigned_to = u_faculty.user_id
        LEFT JOIN users u_prev_faculty ON t.previous_faculty_id = u_prev_faculty.user_id
        WHERE t.student_id = $1
        ORDER BY t.created_at DESC`;
      params = [user_id];
    } else if (role === 'HOD') {
      query = `
        SELECT t.task_id, t.student_id, t.admission_no, t.problem_desc, t.file_url, t.faculty_file_url, t.assigned_to, t.assigned_hod, t.current_status, t.created_at, t.remark_hod, t.remark_student,
               t.previous_faculty_id, t.reassignment_reason,
               u_student.name AS student_name,
               u_student.email AS student_email,
               u_student.program_name AS student_program,
               u_faculty.name AS faculty_name,
               u_prev_faculty.name AS previous_faculty_name,
               u_hod.name AS assigned_hod_name
        FROM tasks t
        JOIN users u_student ON t.student_id = u_student.user_id
        LEFT JOIN users u_faculty ON t.assigned_to = u_faculty.user_id
        LEFT JOIN users u_prev_faculty ON t.previous_faculty_id = u_prev_faculty.user_id
        LEFT JOIN users u_hod ON t.assigned_hod = u_hod.user_id
        ORDER BY t.created_at DESC`;
    } else if (role === 'Faculty') {
      query = `
        SELECT t.*, 
               u_student.name AS student_name,
               u_student.email AS student_email,
               u_student.program_name AS student_program,
               u_faculty.name AS faculty_name,
               u_prev_faculty.name AS previous_faculty_name
        FROM tasks t
        JOIN users u_student ON t.student_id = u_student.user_id
        LEFT JOIN users u_faculty ON t.assigned_to = u_faculty.user_id
        LEFT JOIN users u_prev_faculty ON t.previous_faculty_id = u_prev_faculty.user_id
        WHERE t.assigned_to = $1
        ORDER BY t.created_at DESC`;
      params = [user_id];
    } else if (role === 'Dean') {
      query = `
        SELECT t.task_id, t.student_id, t.admission_no, t.problem_desc, t.file_url, t.faculty_file_url, t.assigned_to, t.assigned_hod, t.current_status, t.created_at, t.remark_hod, t.remark_student,
               t.previous_faculty_id, t.reassignment_reason,
               u_student.name AS student_name,
               u_student.email AS student_email,
               u_student.program_name AS student_program,
               u_faculty.name AS faculty_name,
               u_hod.name AS assigned_hod_name
        FROM tasks t
        JOIN users u_student ON t.student_id = u_student.user_id
        LEFT JOIN users u_faculty ON t.assigned_to = u_faculty.user_id
        LEFT JOIN users u_hod ON t.assigned_hod = u_hod.user_id
        ORDER BY t.created_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/tasks/:id/assign
 * HOD assigns a task to a faculty member
 * Step 2: Assignment → status='Assigned' → Notify Student & Faculty
 */
async function assignTask(req, res) {
  try {
    const { id } = req.params;
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ error: 'Faculty ID is required.' });
    }

    // Verify faculty exists
    const facultyResult = await pool.query(
      `SELECT user_id, name, email, phone FROM users WHERE user_id = $1 AND role = 'Faculty'`,
      [faculty_id]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found.' });
    }

    const faculty = facultyResult.rows[0];

    // Update task
    const taskResult = await pool.query(
      `UPDATE tasks 
       SET assigned_to = $1, current_status = 'Assigned'
       WHERE task_id = $2
       RETURNING *`,
      [faculty_id, id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = taskResult.rows[0];

    // Insert into task history
    await pool.query(
      `INSERT INTO task_history (task_id, stage_changed_to, updated_by)
       VALUES ($1, 'Assigned', $2)`,
      [id, req.user.user_id]
    );

    // Get student details for notification
    const studentResult = await pool.query(
      `SELECT user_id, name, email, phone FROM users WHERE user_id = $1`,
      [task.student_id]
    );

    const student = studentResult.rows[0];

    // Notifications
    await notifications.notifyStudentAssignment(student, faculty.name, task.task_id);
    await notifications.notifyFacultyAssignment(faculty, task.task_id);

    res.json({
      message: `Task #${id} assigned to Prof. ${faculty.name}`,
      task,
    });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/tasks/:id/reassign
 * HOD reassigns a task from one faculty to another.
 * Preserves previous faculty reference and tracks reason.
 * The new faculty can see all prior remarks, sub-tasks, and history.
 */
async function reassignTask(req, res) {
  try {
    const { id } = req.params;
    const { faculty_id, reason } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ error: 'New Faculty ID is required.' });
    }

    // Get current task to find the old faculty
    const currentTask = await pool.query(
      `SELECT * FROM tasks WHERE task_id = $1`,
      [id]
    );

    if (currentTask.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = currentTask.rows[0];
    const oldFacultyId = task.assigned_to;

    if (!oldFacultyId) {
      return res.status(400).json({ error: 'Task has not been assigned yet. Use the assign endpoint instead.' });
    }

    if (parseInt(faculty_id) === oldFacultyId) {
      return res.status(400).json({ error: 'New faculty must be different from the current one.' });
    }

    // Verify new faculty exists and is active
    const newFacultyResult = await pool.query(
      `SELECT user_id, name, email, phone FROM users WHERE user_id = $1 AND role = 'Faculty' AND is_active = true`,
      [faculty_id]
    );

    if (newFacultyResult.rows.length === 0) {
      return res.status(404).json({ error: 'New faculty member not found or inactive.' });
    }

    const newFaculty = newFacultyResult.rows[0];

    // Get old faculty name for history
    const oldFacultyResult = await pool.query(
      `SELECT name FROM users WHERE user_id = $1`,
      [oldFacultyId]
    );
    const oldFacultyName = oldFacultyResult.rows[0]?.name || 'Unknown';

    // Update task: set new faculty, store previous, set reason, reset status to Assigned
    const updatedTask = await pool.query(
      `UPDATE tasks 
       SET assigned_to = $1, 
           previous_faculty_id = $2, 
           reassignment_reason = $3, 
           current_status = 'Assigned'
       WHERE task_id = $4
       RETURNING *`,
      [faculty_id, oldFacultyId, reason || null, id]
    );

    // Insert history entry with reassignment context
    const historyRemark = `Reassigned from Prof. ${oldFacultyName} to Prof. ${newFaculty.name}${reason ? '. Reason: ' + reason : ''}`;
    await pool.query(
      `INSERT INTO task_history (task_id, stage_changed_to, updated_by, remark)
       VALUES ($1, 'Reassigned', $2, $3)`,
      [id, req.user.user_id, historyRemark]
    );

    // Get student details for notification
    const studentResult = await pool.query(
      `SELECT user_id, name, email, phone FROM users WHERE user_id = $1`,
      [task.student_id]
    );
    const student = studentResult.rows[0];

    // Notifications
    await notifications.notifyStudentAssignment(student, newFaculty.name, task.task_id);
    await notifications.notifyFacultyAssignment(newFaculty, task.task_id);

    res.json({
      message: `Task #${id} reassigned from Prof. ${oldFacultyName} to Prof. ${newFaculty.name}`,
      task: updatedTask.rows[0],
    });
  } catch (error) {
    console.error('Reassign task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/tasks/:id/status
 * Faculty updates the task status
 * Step 3: Resolution → status='Resolved' → Notify Student & HOD
 */
async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, remark_student, remark_hod } = req.body;

    let updates = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      const validStatuses = ['In Progress', 'Resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }
      updates.push(`current_status = $${paramIndex++}`);
      params.push(status);
    }

    if (remark_student !== undefined) {
      updates.push(`remark_student = $${paramIndex++}`);
      params.push(remark_student);
    }

    if (remark_hod !== undefined) {
      updates.push(`remark_hod = $${paramIndex++}`);
      params.push(remark_hod);
    }

    if (req.file) {
      const fileUrl = `/uploads/${req.file.filename}`;
      updates.push(`faculty_file_url = $${paramIndex++}`);
      params.push(fileUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No update data provided.' });
    }

    params.push(id);
    const taskIdIndex = paramIndex++;
    params.push(req.user.user_id);
    const facultyIdIndex = paramIndex++;

    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE task_id = $${taskIdIndex} AND assigned_to = $${facultyIdIndex}
      RETURNING *`;

    const taskResult = await pool.query(query, params);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned to you.' });
    }

    const task = taskResult.rows[0];

    // Get student details
    const studentResult = await pool.query(
      `SELECT user_id, name, email, phone FROM users WHERE user_id = $1`,
      [task.student_id]
    );
    const student = studentResult.rows[0];

    // If status was changed, log history and send specific notifications
    if (status) {
      await pool.query(
        `INSERT INTO task_history (task_id, stage_changed_to, updated_by)
         VALUES ($1, $2, $3)`,
        [id, status, req.user.user_id]
      );

      // If resolved, notify student and HOD with the Resolved template
      if (status === 'Resolved') {
        await notifications.notifyStudentResolution(student, req.user.name, task.task_id, remark_student);

        // Notify all HODs
        const hods = await pool.query(
          `SELECT user_id, name, email, phone FROM users WHERE role = 'HOD'`
        );

        for (const hod of hods.rows) {
          await notifications.notifyHODResolution(hod, req.user.name, task.task_id);
        }
      }
    }

    // Always send a general update notification to the student if it's NOT a resolution
    // (since resolution already has its own specific email template)
    if (status !== 'Resolved' && (status || remark_student)) {
      await notifications.notifyStudentTaskUpdate(
        student,
        req.user.name,
        task.task_id,
        status,
        remark_student
      );
    }

    // Also notify HODs of the general update (or internal remark)
    if (status !== 'Resolved' && (status || remark_hod)) {
      const hods = await pool.query(`SELECT user_id, name, email, phone FROM users WHERE role = 'HOD'`);
      for (const hod of hods.rows) {
        await notifications.notifyHODTaskUpdate(
          hod,
          req.user.name,
          task.task_id,
          status,
          remark_hod
        );
      }
    }

    res.json({
      message: `Task #${id} updated successfully`,
      task,
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/tasks/:id/history
 * Get the audit trail for a specific task
 */
async function getTaskHistory(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT th.*, u.name AS updated_by_name
       FROM task_history th
       JOIN users u ON th.updated_by = u.user_id
       WHERE th.task_id = $1
       ORDER BY th.changed_at ASC`,
      [id]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get task history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/tasks/:id/assign-hod
 * Dean assigns a task to an HOD
 */
async function assignToHOD(req, res) {
  try {
    const { id } = req.params;
    const { hod_id } = req.body;

    if (!hod_id) {
      return res.status(400).json({ error: 'HOD ID is required.' });
    }

    const hodResult = await pool.query(
      `SELECT user_id, name FROM users WHERE user_id = $1 AND role = 'HOD'`,
      [hod_id]
    );

    if (hodResult.rows.length === 0) {
      return res.status(404).json({ error: 'HOD not found.' });
    }

    const hod = hodResult.rows[0];

    const taskResult = await pool.query(
      `UPDATE tasks 
       SET assigned_hod = $1
       WHERE task_id = $2
       RETURNING *`,
      [hod_id, id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await pool.query(
      `INSERT INTO task_history (task_id, stage_changed_to, updated_by, remark)
       VALUES ($1, 'Delegated to HOD', $2, $3)`,
      [id, req.user.user_id, `Delegated to HOD ${hod.name}`]
    );

    res.json({
      message: `Task delegated to HOD ${hod.name}`,
      task: taskResult.rows[0],
    });
  } catch (error) {
    console.error('Assign to HOD error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/tasks/:id/hod-remark
 * HOD edits the remark of a task
 */
async function updateHODRemark(req, res) {
  try {
    const { id } = req.params;
    const { remark_hod, remark_student } = req.body;

    let updates = [];
    let params = [];
    let paramIndex = 1;

    if (remark_hod !== undefined) {
      updates.push(`remark_hod = $${paramIndex++}`);
      params.push(remark_hod);
    }
    if (remark_student !== undefined) {
      updates.push(`remark_student = $${paramIndex++}`);
      params.push(remark_student);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No remark provided.' });
    }

    params.push(id);
    
    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE task_id = $${paramIndex}
      RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ message: 'Remark updated successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Update HOD remark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createTask, getTasks, assignTask, reassignTask, updateTaskStatus, updateHODRemark, getTaskHistory, assignToHOD };
