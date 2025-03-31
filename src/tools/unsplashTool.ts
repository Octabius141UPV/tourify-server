import { createApi } from 'unsplash-js';
import fetch from 'node-fetch';
import { ChatCompletionTool } from 'openai/resources/chat/completions';

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  fetch: fetch as unknown as typeof globalThis.fetch,
});

interface UnsplashToolParams {
  query: string;
}

async function getActivityImage({ query }: UnsplashToolParams) {
  try {
    const result = await unsplash.photos.getRandom({
      query: query,
      orientation: "landscape",
    });
    
    if (!Array.isArray(result.response)) {
      return result.response?.urls?.regular || null;
    }
    return result.response[0]?.urls?.regular || null;
  } catch (error) {
    console.error('Error fetching Unsplash image:', error);
    return null;
  }
}

export const unsplashTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_activity_image",
    description: "Obtiene una imagen relevante de Unsplash para una actividad turística",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Términos de búsqueda para la imagen"
        }
      },
      required: ["query"]
    }
  }
};
