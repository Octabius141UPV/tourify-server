import { Router } from 'express';
import { chatController } from '../controllers/tourify/chatController';
import { activityController } from '../controllers/tourify/activityController';
import { editActivityController } from '../controllers/tourify/editActivityController';
import { unsplashController } from '../controllers/tourify/unsplashController';
import { authMiddleware } from '../middleware/authMiddleware';
import { limiter } from '../middleware/rateLimitMiddleware';
import { placesController } from '../controllers/tourify/placesController';
import { createActivityController } from '../controllers/tourify/createActivityController';
import { fingerprintMiddleware } from '../middleware/fingerprintMiddleware';
import { anonymousGuideController } from '../controllers/tourify/anonymousGuideController'; 
import { discoverActivitiesController } from '../controllers/erasmus_activities/discoverActivities';

export const router = Router();

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

// Rutas para descubrir actividades
router.get('/discover/:city/:lang?', (req, res) => {
  const lang = req.params.lang || 'es';
  req.query.lang = lang;
  discoverActivitiesController.getActivities(req, res);
});


