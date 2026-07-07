// ============================================================
// Aharada Education — User Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { 
  getFacultyList, 
  getAllUsers, 
  getStudentList, 
  toggleUserActive, 
  updateProfile,
  adminUpdateUser
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// Profile update for any authenticated user (e.g. Student changing name/program)
router.put('/profile', authenticate, updateProfile);

// GET /api/users/faculty — HOD and Dean can see faculty list for assignment
router.get('/faculty', authenticate, authorize('HOD', 'Dean'), getFacultyList);

// GET /api/users/students — HOD can see student list
router.get('/students', authenticate, authorize('HOD'), getStudentList);

// PUT /api/users/:id/toggle-active — HOD can activate/deactivate faculty IDs
router.put('/:id/toggle-active', authenticate, authorize('HOD'), toggleUserActive);

// GET /api/users — HOD and Dean can see all user info
router.get('/', authenticate, authorize('HOD', 'Dean'), getAllUsers);

// PUT /api/users/:id/admin-update — HOD can update user's email, phone, password
router.put('/:id/admin-update', authenticate, authorize('HOD'), adminUpdateUser);

module.exports = router;
