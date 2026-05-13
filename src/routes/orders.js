import express from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  getOrderHistory
} from '../controllers/orderController.js';
import { orderValidation, orderStatusValidation } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrder);
router.post('/', authenticate, orderValidation, createOrder);
router.put('/:id/status', authenticate, requireAdmin, orderStatusValidation, updateOrderStatus);
router.get('/:id/history', authenticate, getOrderHistory);

export default router;
