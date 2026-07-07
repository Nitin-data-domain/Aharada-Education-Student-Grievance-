// ============================================================
// Aharada Education — Program Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { getPrograms, createProgram, updateProgram, deleteProgram } = require('../controllers/programController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/programs — Get list of programs (public/authenticated)
router.get('/', getPrograms);

// HOD only routes for program management
router.post('/', authenticate, authorize('HOD'), createProgram);
router.put('/:id', authenticate, authorize('HOD'), updateProgram);
router.delete('/:id', authenticate, authorize('HOD'), deleteProgram);

module.exports = router;
