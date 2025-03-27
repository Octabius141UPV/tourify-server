import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const fingerprintMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener datos para generar el fingerprint
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.socket.remoteAddress || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    
    // Verificar si ya viene un fingerprint del cliente
    let fingerprint = req.headers['x-device-fingerprint'] as string;
    
    if (!fingerprint) {
      // Generar fingerprint basado en información del cliente
      const rawFingerprint = `${userAgent}:${ip}:${acceptLanguage}`;
      fingerprint = crypto.createHash('sha256').update(rawFingerprint).digest('hex');
    }
    
    // Añadir el fingerprint al request para uso posterior
    req.body.deviceFingerprint = fingerprint;
    
    // Verificar límites específicos por fingerprint si es necesario
    // Aquí se podría implementar una verificación adicional
    
    next();
  } catch (error) {
    console.error('Error en fingerprint middleware:', error);
    res.status(500).json({ error: 'Error en la verificación de seguridad' });
  }
};
