import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://tu-dominio-produccion.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['POST'],
  credentials: true
}));

app.use(express.json());

app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Servidor de ChatGPT corriendo en http://localhost:${PORT}`);
});
