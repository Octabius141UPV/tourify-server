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
    ? ['https://erasmus-activities.vercel.app', 'https://tourifyapp.es', 'https://www.tourifyapp.es'] // Dominios específicos en producción
    : process.env.NODE_ENV === 'testing'
      ? '*' // Permitir todos los dominios en testing
      : 'http://localhost:3000', // URL específica para desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: process.env.NODE_ENV === 'testing' ? false : true, // Desactivar credentials en testing cuando origin es '*'
  maxAge: 86400,
  optionsSuccessStatus: 204
};

app.use(helmet()); // Añadir headers de seguridad
app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload

app.use('/', router);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
});
