import express from 'express';
import {
  getDashboardStats,
  getProfitAnalytics,
  getReports
} from '../controllers/adminController.js';
import {
  getUsers,
  createManagedUser,
  updateUserRole,
  deleteUser
} from '../controllers/userManagementController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { registerValidation, userRoleValidation } from '../middleware/validation.js';

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, getDashboardStats);
router.get('/profits', authenticate, requireAdmin, getProfitAnalytics);
router.get('/reports', authenticate, requireAdmin, getReports);
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, registerValidation, createManagedUser);
router.put('/users/:id/role', authenticate, requireAdmin, userRoleValidation, updateUserRole);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

export default router;
