import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive
} from '../controllers/productController.js';
import { productValidation } from '../middleware/validation.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/', optionalAuth, getProducts);
router.get('/:id', getProduct);
router.post('/', authenticate, requireAdmin, productValidation, createProduct);
router.put('/:id', authenticate, requireAdmin, productValidation, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);
router.patch('/:id/toggle', authenticate, requireAdmin, toggleProductActive);

export default router;
