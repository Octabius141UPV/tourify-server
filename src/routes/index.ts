import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';
import { limiter } from '../middleware/rateLimitMiddleware';

export const router = Router();

// Ruta protegida con autenticación de Firebase
router.post('/createGuide', authMiddleware, limiter, chatController.generateChatResponse);