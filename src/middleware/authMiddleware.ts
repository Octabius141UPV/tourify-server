import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar el token con Firebase Admin
    await auth.verifyIdToken(token);
    
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

