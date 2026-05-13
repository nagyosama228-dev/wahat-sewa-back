import express from 'express';
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.get('/unread', authenticate, getUnreadNotifications);
router.post('/:id/read', authenticate, markAsRead);
router.post('/read-all', authenticate, markAllAsRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;
