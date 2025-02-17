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
      const { messages } = req.body;
      const tourData = messages[0];

      if (!messages || !Array.isArray(messages) || !tourData) {
        return res.status(400).json({ error: 'Se requiere un array de mensajes con datos válidos' });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: `Eres un guía turístico profesional experto en crear itinerarios detallados.
            - Debes responder ÚNICAMENTE en formato JSON .
            - No debes incluir explicaciones adicionales fuera del JSON.
            - Cada evento debe tener todos los campos requeridos.
            - Los precios deben ser realistas y actualizados.
            - Las rutas deben ser eficientes y considerar el medio de transporte especificado.
            - Los horarios deben ser coherentes y tener en cuenta los tiempos de desplazamiento.`
          },
          {
            role: "user",
            content: `Necesito un itinerario detallado con estos parámetros:
            - Ciudad: ${tourData.Ciudad}
            - Hotel: ${tourData.Calle}
            - Turismo/Actividades: ${tourData.TipoTurismo}
            - Llegada: ${tourData.DiaLlegada}
            - Salida: ${tourData.DiaSalida}
            - Movilidad: ${tourData.DificultadMovilidad}
            - Transporte: ${tourData.MediosTransporte}
            - Presupuesto/persona: ${tourData.Presupuesto} ${tourData.DivisaUsar}
            - Comidas: ${tourData.Restaurantes}
            - Paradas obligatorias: ${tourData.ParadasObligatorias}
            - Excluir: ${tourData.ParadasBanned}
            - Actividades/día: ${tourData.NumActividades}`
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

      res.json({
        success: true,
        data: completion.choices[0].message
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.response?.data?.error?.message || 'Error al procesar la solicitud'
      });
    }
  }
};
