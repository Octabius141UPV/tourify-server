import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { activityController } from '../controllers/activityController';
import { editActivityController } from '../controllers/editActivityController';
import { unsplashController } from '../controllers/unsplashController';
import { authMiddleware } from '../middleware/authMiddleware';
import { limiter } from '../middleware/rateLimitMiddleware';
import { placesController } from '../controllers/placesController';
import { createActivityController } from '../controllers/createActivityController';
import { fingerprintMiddleware } from '../middleware/fingerprintMiddleware';
import { anonymousGuideController } from '../controllers/anonymousGuideController'; 

export const router = Router();

// Ruta de prueba (health check)
router.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Rutas protegidas con autenticación de Firebase
router.post('/createGuide', authMiddleware, limiter, chatController.generateChatResponse);
router.post('/createActivity', authMiddleware, limiter, createActivityController.createActivity); // Nueva ruta
router.post('/renewActivity', authMiddleware, limiter, activityController.renewActivity);
router.post('/editActivity', authMiddleware, limiter, editActivityController.editActivity);

// Añadir nueva ruta para imágenes de ciudades 
router.get('/cityImage', authMiddleware, unsplashController.getCityImage);

// Rutas para servicios de Google Places
router.post('/verify-location', authMiddleware, placesController.verifyLocation);
router.get('/place-details/:placeId', authMiddleware, placesController.getPlaceDetails);

// Rutas para guías anónimas
router.post('/anonymous/generateGuide', fingerprintMiddleware, anonymousGuideController.generateGuide);

