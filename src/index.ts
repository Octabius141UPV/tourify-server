import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Obtener dominios permitidos desde .env
const allowedDomains = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

// Configuración de CORS según el entorno
const corsOptions = process.env.NODE_ENV === 'production' 
  ? {
      origin: allowedDomains,
      methods: ['POST', 'GET'],
      credentials: true
    }
  : {
      origin: '*', // Permite cualquier origen en desarrollo
      methods: ['POST', 'GET'],
      credentials: true
    };

app.use(cors(corsOptions));

app.use(express.json());
app.use('/', router);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
});
