import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { activityController } from '../controllers/activityController';
import { editActivityController } from '../controllers/editActivityController';
import { unsplashController } from '../controllers/unsplashController';
import { authMiddleware } from '../middleware/authMiddleware';
import { limiter } from '../middleware/rateLimitMiddleware';
import { placesController } from '../controllers/placesController';

export const router = Router();

// Ruta de prueba (health check)
router.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Rutas protegidas con autenticación de Firebase
router.post('/createGuide', authMiddleware, limiter, chatController.generateChatResponse);
router.post('/renewActivity', authMiddleware, limiter, activityController.renewActivity);
router.post('/editActivity', authMiddleware, limiter, editActivityController.editActivity);

// Añadir nueva ruta para imágenes de ciudades 
router.get('/cityImage', authMiddleware, unsplashController.getCityImage);

// Rutas para servicios de Google Places
router.post('/verify-location', authMiddleware, placesController.verifyLocation);
router.get('/place-details/:placeId', authMiddleware, placesController.getPlaceDetails);

// Eliminar la ruta de actualización de actividad que ya no necesitamos