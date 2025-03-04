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

export const chatController = {
  generateChatResponse: async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'testing') {
        console.log('[Testing] Iniciando generación de respuesta del chat');
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { messages } = req.body;
      const tourData = messages[0];

      if (!messages || !Array.isArray(messages) || !tourData) {
        if (process.env.NODE_ENV === 'testing') {
          console.log('[Testing] Error: Datos inválidos recibidos');
        }
        return res.status(400).json({ error: 'Se requiere un array de mensajes con datos válidos' });
      }

      if (process.env.NODE_ENV === 'testing') {
        console.log('[Testing] Iniciando llamada a OpenAI');
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          {
            role: "system",
            content: `Eres un guía turístico profesional experto en crear itinerarios detallados.
            - Debes responder ÚNICAMENTE en formato JSON .
            - No incluyas  \`\`\`json al principio, ni  \`\`\` al final.
            - No debes incluir explicaciones adicionales fuera del JSON.
            - Cada evento debe tener todos los campos requeridos.
            - Los precios deben ser realistas y actualizados.
            - Las rutas deben ser eficientes y considerar el medio de transporte especificado.
            - Los horarios deben ser coherentes y tener en cuenta los tiempos de desplazamiento.
            - Si no es restaurante o monumento, no será otro tipo de categoria.
            - Añade restaurantes para comer y cenar.
            - Añade paradas obligatorias y excluye las paradas no deseadas.
            - Reparte las actividades de forma equitativa a lo largo del día.
            - Las comidas y cenas son obligatorias
            - Las comidas y cenas no cuentan como actividad.
            - En caso de que la actividad no este en  la ciudad, no se incluirá en el itinerario.
            - Las comidas serán a las 14:00 y 21:00.
            - Tan solo tendrás de categoria, cultural, restaruante, otros.
            
      **Formato de salida esperado:**
    
      {
        "itinerario": {
          "ciudad": "París",
          "dias": [
            {
              "fecha": "15-03-2025",
              "actividades": [
                {
                  "nombre": "Visita a la Torre Eiffel",
                  "hora_inicio": "09:00",' 
    '             "hora_fin": "10:00",' 
                  "precio": 25,
                  "ubicacion": "Champ de Mars, 5 Avenue Anatole",
                  "categoria": "cultural",
                  "descripcion": "Disfruta de las vistas panorámicas de París desde la icónica Torre Eiffel"
                },
                {
                  "nombre": "Palacio de Versalles",
                  "hora_inicio": "10:15",' 
    '             "hora_fin": "11:30",' 
                  "precio": 50,
                  "ubicacion": "228 Rue de Rivoli, París",
                  "categoria": "cultural",
                  "descripcion": "Visita al lujoso palacio real de Versalles"
                }
              ]
            }
          ]
        }
      }
     

      Siempre responde en este formato.`
          },
          {
            role: "user",
            content: `Necesito un itinerario detallado con estos parámetros:
            - Ciudad: ${tourData.Ciudad}
            - Turismo/Actividades: ${tourData.TipoTurismo}
            - Llegada: ${tourData.DiaLlegada}
            - Salida: ${tourData.DiaSalida}
            - Transporte: ${tourData.MediosTransporte}
            - Presupuesto/persona: ${tourData.Presupuesto} ${tourData.DivisaUsar}
            - Paradas obligatorias: ${tourData.ParadasObligatorias}
            - Excluir: ${tourData.ParadasBanned}
            - Actividades/día: ${tourData.NumActividades}
            - Comentarios: ${tourData.Comentarios}`

          },
          {
            role: "assistant",
            content: `Entendido. Generaré un itinerario en formato JSON que incluirá:
            - ${tourData.NumActividades} actividades diarias
            - Tiempos de desplazamiento realistas
            - Precios actualizados
            - Rutas optimizadas
            - Información detallada de cada lugar
            El itinerario considerará las restricciones de movilidad y presupuesto especificados.`
          }
        ]
      });

      let jsonBuffer = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          jsonBuffer += content;
          res.write(`${JSON.stringify({ content })}\n\n`);
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
          
        }
      }

      res.write('[DONE]\n\n');
      res.end();

    } catch (error: any) {
      if (process.env.NODE_ENV === 'testing') {
        console.log('[Testing] Error en el controlador:', error);
      }
      res.write(`${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};
