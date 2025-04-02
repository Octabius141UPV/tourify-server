import { Client } from '@googlemaps/google-maps-services-js';
import { Request, Response } from 'express';

const client = new Client({});

export const placesController = {
  async verifyLocation(req: Request, res: Response) {
    // Permitir todos los orígenes en desarrollo
  

    

    // Log completo de la petición
    console.log('Nueva petición recibida:', {
      headers: req.headers,
      body: req.body,
      method: req.method,
      url: req.url
    });

    try {
      const { address } = req.body;
      
      // Primero devolvemos una respuesta simple para probar conectividad
      return res.json({
        success: true,
        message: 'Petición recibida correctamente',
        address: address
      });

    } catch (error: any) {
      console.error('Error en verificación:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  },

  async getPlaceDetails(req: Request, res: Response) {
    try {
      const { placeId } = req.params;

      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_MAPS_API_KEY as string
        }
      });

      return res.json(response.data.result);
    } catch (error: any) {
      console.error('Error al obtener detalles del lugar:', {
        error: error.message,
        stack: error.stack,
        placeId: req.params.placeId,
        responseData: error.response?.data
      });
      return res.status(500).json({ 
        message: 'Error al obtener detalles del lugar',
        error: error.response?.data || error.message
      });
    }
  }
};
