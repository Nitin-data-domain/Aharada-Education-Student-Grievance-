// ============================================================
// Aharada Education — Task Routes
// ============================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createTask, getTasks, assignTask, reassignTask, updateTaskStatus, updateHODRemark, getTaskHistory, assignToHOD } = require('../controllers/taskController');
const { createSubTask, getSubTasks, updateSubTaskStatus } = require('../controllers/subTaskController');
const { authenticate, authorize } = require('../middleware/auth');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `task-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);
    if (ext || mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF), PDFs, and Word documents are allowed.'));
    }
  },
});

// POST /api/tasks — Student or Dean submits a new task
router.post('/', authenticate, authorize('Student', 'Dean'), upload.single('file'), createTask);

// GET /api/tasks — Get tasks based on role
router.get('/', authenticate, getTasks);

// PUT /api/tasks/:id/assign — HOD or Dean assigns task to faculty
router.put('/:id/assign', authenticate, authorize('HOD', 'Dean'), assignTask);

// PUT /api/tasks/:id/reassign — HOD reassigns task to a different faculty
router.put('/:id/reassign', authenticate, authorize('HOD'), reassignTask);

// PUT /api/tasks/:id/status — Faculty updates task status and/or remarks
router.put('/:id/status', authenticate, authorize('Faculty'), upload.single('faculty_file'), updateTaskStatus);

// PUT /api/tasks/:id/hod-remark — HOD updates remarks
router.put('/:id/hod-remark', authenticate, authorize('HOD'), updateHODRemark);

// GET /api/tasks/:id/history — Get task history
router.get('/:id/history', authenticate, getTaskHistory);

// Sub-task routes (Faculty actions)
router.post('/:taskId/subtasks', authenticate, authorize('Faculty'), createSubTask);
router.get('/:taskId/subtasks', authenticate, getSubTasks);
router.put('/subtasks/:id/status', authenticate, authorize('Faculty'), updateSubTaskStatus);

// PUT /api/tasks/:id/assign-hod — Dean assigns task to HOD
router.put('/:id/assign-hod', authenticate, authorize('Dean'), assignToHOD);

module.exports = router;
