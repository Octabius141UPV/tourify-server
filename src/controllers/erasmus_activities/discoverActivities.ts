import { Request, Response } from 'express';
import { openai } from '../../config/openai';

const activityCategories: { [key: string]: string } = {
  'museo': 'museum building architecture',
  'playa': 'beach coast seaside',
  'parque': 'park gardens landscape',
  'iglesia': 'church cathedral architecture',
  'castillo': 'castle fortress historic',
  'mercado': 'market traditional street',
  'plaza': 'square plaza historic',
  'jardín': 'garden park botanical',
  'restaurante': 'restaurant traditional local',
  'monumento': 'monument landmark historic'
};

function normalizeText(text: string): string {
  return text.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar diacríticos
    .replace(/[^\x00-\x7F]/g, '');    // Solo caracteres ASCII
}

async function searchImagesWithTavily(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query: `${query} tourism landmark photo rectangular horizontal`,
        search_depth: "basic",
        include_images: true,
        images_only: true,
        max_results: 1,
        image_params: {
          min_width: 800,
          max_width: 1200,
          min_height: 450,  // Aproximadamente 16:9
          max_height: 675,  // Mantiene la proporción 16:9
          prefer_small_size: true
        }
      })
    });

    const data = await response.json();
    if (data.images.length == 0) {
      console.error('No se encontraron imágenes para la consulta:', query);
      return null;
    }
    if (data.images.length > 0) {
    
      return data.images[0];
    }
  } catch (error) {
    console.error('Error en Tavily API:', error);
    return null;
  }
  return null; // Ensure a return value in all code paths
}

async function generateImageForActivity(activity: any, city: string): Promise<string | null> {
  const searchQuery = `${activity.title} ${city}`;
  return await searchImagesWithTavily(searchQuery);
   // Logging para depuración

}

// Añadir función de validación
function validateTitle(title: string): boolean {
 return true; // Aquí puedes implementar la lógica de validación que necesites
}

const messages = {
  es: {
    systemMessage: `Eres un experto guía turístico. IMPORTANTE: Genera cada actividad como un JSON independiente, 
    uno por línea. NO generes una lista o array. Cada actividad debe ser un objeto JSON completo.
    
    Para cada actividad:
    1. Título MÁXIMO 3 PALABRAS, descriptivo y único
    2. Descripción detallada pero concisa
    3. Formato exacto: {"title": "nombre actividad", "description": "descripción"}
    4. NO agregues números, viñetas o texto adicional
    5. IMPORTANTE: Si el título tiene más de 3 palabras, la actividad será rechazada`,
    userMessage: (city: string) => `Genera 10 actividades turísticas únicas para ${city}. RECUERDA: Una actividad por línea en formato JSON.`
  },
  en: {
    systemMessage: `You are an expert tour guide. IMPORTANT: Generate each activity as an independent JSON,
    one per line. DO NOT generate a list or array. Each activity must be a complete JSON object.
    
    For each activity:
    1. Title MAXIMUM 3 WORDS, descriptive and unique
    2. Detailed but concise description
    3. Exact format: {"title": "activity name", "description": "description"}
    4. DO NOT add numbers, bullets or additional text
    5. IMPORTANT: If the title has more than 3 words, the activity will be rejected`,
    userMessage: (city: string) => `Generate 10 unique tourist activities for ${city}. REMEMBER: One activity per line in JSON format.`
  }
};

export const discoverActivitiesController = {
  async getActivities(req: Request, res: Response) {
    try {
      const { city } = req.params;
      const lang = req.query.lang as 'es' | 'en' || 'es';  // Default a español

      if (!city) {
        return res.status(400).json({ error: 'Se requiere el nombre de la ciudad' });
      }

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await openai.chat.completions.create({
        messages: [
          { role: "system", content: messages[lang].systemMessage },
          { role: "user", content: messages[lang].userMessage(city) }
        ],
        model: "gpt-4o-mini", 
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
        frequency_penalty: 0.5
      });

      let buffer = '';
      let activitiesProcessed = 0;
      const maxActivities = 10; // Cambiado a 10 actividades
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        buffer += content;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          try {
            if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
              const activity = JSON.parse(line.trim());
              
              if (activity.title && 
                  activity.description && 
                  validateTitle(activity.title)) {
                const imageUrl = await generateImageForActivity(activity, city);
                
                if (imageUrl) {
                  const activityWithImage = {
                    title: activity.title,
                    description: activity.description,
                    image: imageUrl
                  };
                 
                  
                  activitiesProcessed++;
                  res.write(`data: ${JSON.stringify(activityWithImage)}\n\n`);
                  
                  if (activitiesProcessed >= maxActivities) {
                    res.write('data: [DONE]\n\n');
                    res.end();
                    return;
                  }
                }
              }
            }
          } catch (e) { }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: 'Error al procesar la solicitud' })}\n\n`);
      res.end();
    }
  }
};
