import { Client } from '@googlemaps/google-maps-services-js';
import { Request, Response } from 'express';

const client = new Client({});

export const placesController = {
  async verifyLocation(req: Request, res: Response) {
    try {
      const { address } = req.body;
      
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        throw new Error('Google Maps API key no está configurada');
      }

      // Usar directamente Geocoding API
      const geocodeResponse = await client.geocode({
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (geocodeResponse.data.results.length === 0) {
        return res.status(404).json({ message: 'Ubicación no encontrada' });
      }

      const location = geocodeResponse.data.results[0];
      
      return res.json({
        formatted_address: location.formatted_address,
        coordinates: location.geometry.location,
        place_id: location.place_id
      });

    } catch (error: any) {
      console.error('Error al verificar ubicación:', error);
      return res.status(500).json({ 
        message: 'Error al verificar la ubicación',
        error: error.response?.data || error.message
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
    } catch (error) {
      console.error('Error al obtener detalles del lugar:', error);
      return res.status(500).json({ message: 'Error al obtener detalles del lugar' });
    }
  }
};
