import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

const allowedOrigins = [
  'http://localhost:3000',
  'https://tourifyapp.es',
  'https://www.tourifyapp.es',
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});