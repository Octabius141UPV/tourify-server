import { createApi } from 'unsplash-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Request, Response } from 'express';

dotenv.config();

// Configurar el cliente de Unsplash
const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY!,
  fetch: fetch as any,
});

export const unsplashController = {
  async getCityImage(req: Request, res: Response) {
    try {
      const { city } = req.query;

      if (!city) {
        return res.status(400).json({ error: 'City parameter is required' });
      }

      const searchQuery = `${city} city`;
      const result = await unsplash.search.getPhotos({
        query: searchQuery,
        page: 1,
        perPage: 1,
        orientation: 'landscape'
      });

      if (result.errors) {
        throw new Error(result.errors[0]);
      }

      const imageUrl = result.response?.results[0]?.urls?.regular;
      
      if (!imageUrl) {
        return res.status(404).json({ error: 'No image found' });
      }

      return res.json({ imageUrl });
    } catch (error) {
      console.error('Error fetching image:', error);
      return res.status(500).json({ error: 'Failed to fetch image' });
    }
  }
};
