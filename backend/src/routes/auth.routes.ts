import { Router } from 'express';
import { googleAuth, googleCallback, logout, getCurrentUser } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Protected routes
router.post('/logout', auth, logout);
router.get('/me', auth, getCurrentUser);

export default router; 