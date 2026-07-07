// ============================================================
// Aharada Education — User Controller
// ============================================================
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * GET /api/users/faculty
 * List all faculty members (for HOD dropdown)
 */
async function getFacultyList(req, res) {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, program_name, is_active 
       FROM users 
       WHERE role = 'Faculty' 
       ORDER BY name ASC`
    );
    res.json({ faculty: result.rows });
  } catch (error) {
    console.error('Get faculty list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users
 * List all users (HOD can see all student & faculty info)
 */
async function getAllUsers(req, res) {
  try {
    const { role } = req.query;
    let query = `SELECT user_id, name, email, phone, role, program_name, is_active, created_at 
                 FROM users`;
    const params = [];
    if (role) {
      query += ` WHERE role = $1`;
      params.push(role);
    }
    query += ` ORDER BY role ASC, created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/students
 * List all students
 */
async function getStudentList(req, res) {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, phone, program_name, is_active, created_at 
       FROM users 
       WHERE role = 'Student' 
       ORDER BY name ASC`
    );
    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get student list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/users/:id/toggle-active
 * HOD activates/deactivates a faculty member
 */
async function toggleUserActive(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users 
       SET is_active = NOT is_active 
       WHERE user_id = $1 AND role = 'Faculty'
       RETURNING user_id, name, email, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found.' });
    }
    const user = result.rows[0];
    const status = user.is_active ? 'activated' : 'deactivated';
    res.json({ user, message: `${user.name} has been ${status}.` });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/users/profile
 * User updates their own profile (name, phone, program_name)
 */
async function updateProfile(req, res) {
  try {
    const { name, phone, program_name } = req.body;
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           program_name = COALESCE($3, program_name)
       WHERE user_id = $4
       RETURNING user_id, name, email, phone, role, program_name`,
      [name || null, phone || null, program_name || null, req.user.user_id]
    );
    res.json({ user: result.rows[0], message: 'Profile updated.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/users/:id/admin-update
 * HOD updates a user's email, phone, and/or resets password
 */
async function adminUpdateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, phone, password } = req.body;
    
    let query = 'UPDATE users SET ';
    const params = [];
    let paramIndex = 1;
    
    if (email) {
      query += `email = $${paramIndex++}, `;
      params.push(email);
    }
    if (phone) {
      query += `phone = $${paramIndex++}, `;
      params.push(phone);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += `password = $${paramIndex++}, `;
      params.push(hashedPassword);
    }
    
    if (params.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    query = query.slice(0, -2);
    
    query += ` WHERE user_id = $${paramIndex} RETURNING user_id, name, email, phone`;
    params.push(id);
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getFacultyList, getAllUsers, getStudentList, toggleUserActive, updateProfile, adminUpdateUser };
