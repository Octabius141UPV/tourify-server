import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración CORS más restrictiva para producción
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://', 'https://*.tourify.app'] // Dominios permitidos en producción
    : '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400, // Cache preflight por 24 horas
  credentials: false,
};

// Rate limiting más estricto para producción
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Demasiadas peticiones, por favor intente más tarde'
});

app.use(helmet()); // Añadir headers de seguridad
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload

app.use('/', router);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
});
