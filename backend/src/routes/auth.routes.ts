import { Router } from 'express';
import {
  login,
  logout,
  me,
  refresh,
  register,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// Protected routes
router.get('/me', authMiddleware, me);

export default router;
