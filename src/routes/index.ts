import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';
import { limiter } from '../middleware/rateLimitMiddleware';

export const router = Router();

// Ruta de prueba (health check)
router.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});


// Ruta protegida con autenticación de Firebase
router.post('/createGuide', authMiddleware, limiter, chatController.generateChatResponse);