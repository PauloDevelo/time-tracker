import express, { Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { getUserSettings, updateUserSettings } from '../controllers/user-settings.controller';
import multer from 'multer';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

const router = express.Router();

// Set up multer for memory storage to handle file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Helper to wrap authenticated controllers
const wrapAuth = (fn: (req: AuthenticatedRequest, res: Response) => Promise<Response>) => 
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res).catch(next);

// Get user settings
router.get('/', auth, wrapAuth(getUserSettings));

// Update user settings
router.post('/', auth, upload.single('image'), wrapAuth(updateUserSettings));

export default router;