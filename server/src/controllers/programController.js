// ============================================================
// Aharada Education — Program Controller
// CRUD operations for programs (HOD-managed)
// ============================================================
const pool = require('../config/db');

/**
 * GET /api/programs
 * List all active programs (public, for dropdown)
 */
async function getPrograms(req, res) {
  try {
    const result = await pool.query(
      `SELECT program_id, program_code, program_name, is_active 
       FROM programs 
       ORDER BY program_code ASC`
    );
    res.json({ programs: result.rows });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/programs
 * HOD creates a new program
 */
async function createProgram(req, res) {
  try {
    const { program_code, program_name } = req.body;
    if (!program_code || !program_name) {
      return res.status(400).json({ error: 'Program code and name are required.' });
    }
    const result = await pool.query(
      `INSERT INTO programs (program_code, program_name) 
       VALUES ($1, $2) RETURNING *`,
      [program_code, program_name]
    );
    res.status(201).json({ program: result.rows[0], message: 'Program created.' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Program code already exists.' });
    }
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/programs/:id
 * HOD updates a program
 */
async function updateProgram(req, res) {
  try {
    const { id } = req.params;
    const { program_code, program_name, is_active } = req.body;
    const result = await pool.query(
      `UPDATE programs 
       SET program_code = COALESCE($1, program_code),
           program_name = COALESCE($2, program_name),
           is_active = COALESCE($3, is_active)
       WHERE program_id = $4 RETURNING *`,
      [program_code, program_name, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    res.json({ program: result.rows[0], message: 'Program updated.' });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/programs/:id
 * HOD deletes a program
 */
async function deleteProgram(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM programs WHERE program_id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    res.json({ message: 'Program deleted.' });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getPrograms, createProgram, updateProgram, deleteProgram };
