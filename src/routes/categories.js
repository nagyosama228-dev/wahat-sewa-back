import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { categoryValidation } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', authenticate, requireAdmin, categoryValidation, createCategory);
router.put('/:id', authenticate, requireAdmin, categoryValidation, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
