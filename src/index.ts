import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { router } from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración CORS más restrictiva para producción
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://erasmus-activities.vercel.app/', 'https://*.tourifyapp.es'] // Dominios permitidos en producción
    : '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400, // Cache preflight por 24 horas
  credentials: false,
};

;

app.use(helmet()); // Añadir headers de seguridad
app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload

app.use('/', router);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
});
