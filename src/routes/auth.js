import express from 'express';
import {
  register,
  login,
  adminLogin,
  logout,
  getMe,
  refreshToken,
  updateMe,
  changePassword
} from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  adminLoginValidation,
  profileUpdateValidation,
  changePasswordValidation
} from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';
import { resolveRegistrationRole } from '../middleware/roles.js';

const router = express.Router();

router.post('/register', authLimiter, resolveRegistrationRole, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/admin-login', authLimiter, adminLoginValidation, adminLogin);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, profileUpdateValidation, updateMe);
router.put('/change-password', authenticate, changePasswordValidation, changePassword);
router.post('/refresh', refreshToken);

export default router;
