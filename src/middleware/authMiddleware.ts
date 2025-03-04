import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import dotenv from 'dotenv';

dotenv.config();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === 'testing') {
      console.log('[Testing] Iniciando verificación de autenticación');
      console.log('[Testing] Headers:', req.headers);
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV === 'testing') {
        console.log('[Testing] Token no proporcionado o formato inválido');
      }
      return res.status(401).json({
        success: false,
        error: 'No token proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (process.env.NODE_ENV === 'testing') {
      console.log('[Testing] Token extraído:', token.substring(0, 10) + '...');
    }
    
    // Verificar el token con Firebase Admin
    await auth.verifyIdToken(token);
    
    if (process.env.NODE_ENV === 'testing') {
      console.log('[Testing] Token verificado exitosamente');
    }
    
    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'testing') {
      console.log('[Testing] Error en autenticación:', error);
    }
    console.error('Error de autenticación:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

