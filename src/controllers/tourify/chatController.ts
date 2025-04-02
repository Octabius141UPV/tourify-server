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
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Datos inválidos' });
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
            - Ciudad: ${messages[0].Ciudad}
            - Turismo/Actividades: ${messages[0].TipoTurismo}
            - Llegada: ${messages[0].DiaLlegada}
            - Salida: ${messages[0].DiaSalida}
            - Transporte: ${messages[0].MediosTransporte}
            - Presupuesto/persona: ${messages[0].Presupuesto} ${messages[0].DivisaUsar}
            - Paradas obligatorias: ${messages[0].ParadasObligatorias}
            - Excluir: ${messages[0].ParadasBanned}
            - Actividades/día: ${messages[0].NumActividades}
            - Comentarios: ${messages[0].Comentarios}`

          },
          {
            role: "assistant",
            content: `Entendido. Generaré un itinerario en formato JSON que incluirá:
            - ${messages[0].NumActividades} actividades diarias
            - Tiempos de desplazamiento realistas
            - Precios actualizados
            - Rutas optimizadas
            - Información detallada de cada lugar
            El itinerario considerará las restricciones de movilidad y presupuesto especificados.`
          }
        ]
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`${JSON.stringify({ content })}\n\n`);
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        }
      }

      res.write('[DONE]\n\n');
      res.end();

    } catch (error: any) {
      res.write(`${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};
