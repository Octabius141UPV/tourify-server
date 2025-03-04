import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY no está definida en las variables de entorno');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const activityController = {
  renewActivity: async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { category, existingActivities, ciudad } = req.body;

      if (!category || !Array.isArray(existingActivities) || !ciudad) {
        return res.status(400).json({ 
          error: 'Se requiere categoría, ciudad y lista de actividades existentes' 
        });
      }
      
      const systemPrompt = "Eres un asistente especializado en generar actividades turísticas. " +
        "Responde únicamente con un objeto JSON válido y bien formateado.";
      
      const userPrompt = `Genera una nueva actividad turística única para la ciudad de ${ciudad} en la categoría "${category}".
      Las siguientes actividades ya existen y NO deben repetirse: ${existingActivities.join(', ')}.
      
      Debes proporcionar UN ÚNICO OBJETO JSON VÁLIDO con esta estructura exacta:
      {
        "nombre": "Nombre de la actividad",
        "hora_inicio": "HH:MM",
        "hora_fin": "HH:MM",
        "precio": "Precio por persona en €",
        "ubicacion": "Dirección en ${ciudad}",
        "categoria": "${category}",
        "descripcion": "Descripción detallada que no exceda las 20 palabras"
      }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const rawResponse = completion.choices[0].message.content?.trim() || '';
      
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResponse = jsonMatch[0];
          const parsedActivity = JSON.parse(jsonResponse);
          return res.status(200).json(parsedActivity);
        } else {
          throw new Error('No se pudo extraer un objeto JSON de la respuesta');
        }
      } catch (error) {
        return res.status(500).json({ 
          error: 'No se pudo generar un JSON válido'
        });
      }
      
    } catch (error: any) {
      return res.status(500).json({ 
        error: error.message || 'Error al procesar la solicitud'
      });
    }
  }
};
