import { Request, Response } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { db } from '../config/firebase';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY no está definida en las variables de entorno');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const validateDeviceAccess = async (deviceFingerprint: string): Promise<boolean> => {
  try {
    console.log('Iniciando validación de dispositivo:', deviceFingerprint);
    
    const lastDayTimestamp = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const recentGuidesRef = await db
      .collection('anonymousGuides')
      .where('deviceFingerprint', '==', deviceFingerprint)
      .where('createdAt', '>=', lastDayTimestamp)
      .get();

    if (recentGuidesRef.size >= 3) {
      console.log(`Dispositivo ${deviceFingerprint} ha excedido el límite de guías diarias`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validando acceso:', error);
    return true;
  }
};

const registerDeviceFingerprint = async (fingerprint: string) => {
  try {
    const deviceRef = db.collection('devices').doc(fingerprint);
    const device = await deviceRef.get();

    if (!device.exists) {
      await deviceRef.set({
        fingerprint: fingerprint,
        firstSeen: Timestamp.now(),
        lastSeen: Timestamp.now(),
        totalRequests: 1
      });
    } else {
      await deviceRef.update({
        lastSeen: Timestamp.now(),
        totalRequests: device.data()?.totalRequests + 1 || 1
      });
    }
  } catch (error) {
    console.error('Error registrando fingerprint:', error);
  }
};

export const anonymousGuideController = {
  generateGuide: async (req: Request, res: Response) => {
    try {
      const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
      const { guideId } = req.body;
      
      if (!deviceFingerprint) {
        return res.status(400).json({ 
          success: false,
          error: 'Falta el fingerprint del dispositivo en los headers' 
        });
      }

      // Registrar el fingerprint
      await registerDeviceFingerprint(deviceFingerprint);

      // Configurar headers para streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Solo verificamos el acceso del dispositivo
      const deviceAccess = await validateDeviceAccess(deviceFingerprint);

      if (!deviceAccess) {
        res.write(JSON.stringify({ error: 'Dispositivo bloqueado' }));
        return res.end();
      }

      // Usar directamente los datos del body para generar la guía
      const { location, interests, transport, budget, startDate, endDate } = req.body;

      console.log('[Server] Generando guía con parámetros:', {
        location,
        interests,
        transport,
        budget,
        startDate,
        endDate
      });

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: `Eres un guía turístico profesional experto en crear itinerarios detallados.
            - Debes responder ÚNICAMENTE en formato JSON.
            - No incluyas \`\`\`json al principio, ni \`\`\` al final.
            - No debes incluir explicaciones adicionales fuera del JSON.
            - Cada evento debe tener todos los campos requeridos.
            - Los precios deben ser realistas y actualizados.
            - Las rutas deben ser eficientes y considerar el medio de transporte especificado.
            - Los horarios deben ser coherentes y tener en cuenta los tiempos de desplazamiento.
            - Si no es restaurante o monumento, no será otro tipo de categoria.
            - Añade restaurantes para comer y cenar.
            - Las comidas serán a las 14:00 y 21:00.
            - Tan solo tendrás de categoria, cultural, restaurante, otros.`
          },
          {
            role: "user",
            content: `Necesito un itinerario detallado con estos parámetros:
            - Ciudad: ${location}
            - Turismo/Actividades: ${interests}
            - Llegada: ${startDate}
            - Salida: ${endDate}
            - Transporte: ${transport}
            - Presupuesto/persona: ${budget}
            - Paradas obligatorias: ${req.body.mandatoryStops || 'ninguna'}
            - Excluir: ${req.body.excludedStops || 'ninguna'}
            - Actividades/día: ${req.body.activitiesPerDay || 4}
            - Comentarios: ${req.body.comments || ''}`
          }
        ]
      });

      let jsonBuffer = '';
      const guideRef = db.collection('anonymousGuides').doc(guideId);

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          console.log('[Server] Chunk recibido:', content);
          jsonBuffer += content;
          res.write(`${JSON.stringify({ content })}\n\n`);
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        }
      }

      try {
        console.log('[Server] Buffer completo:', jsonBuffer);
        const parsedContent = JSON.parse(jsonBuffer);
        console.log('[Server] Contenido parseado:', parsedContent);
        
        if (parsedContent?.itinerario) {
          const transformedDays = parsedContent.itinerario.map((dia: any) => ({
            fecha: dia.fecha,
            actividades: dia.actividades.map((evento: any) => ({
              nombre: evento.nombre,
              hora_inicio: evento.hora_inicio,
              hora_fin: calcularHoraFin(evento.hora_inicio, evento.duracion),
              precio: evento.precio,
              ubicacion: evento.transporte || 'No especificada',
              descripcion: evento.descripcion,
              categoria: evento.tipo,
              tipo: evento.tipo
            }))
          }));

          // Guardar cada día por separado
          for (const day of transformedDays) {
            const dayRef = db.collection('anonymousGuides')
                           .doc(guideId)
                           .collection('days')
                           .doc(day.fecha);
            await dayRef.set({
              actividades: day.actividades,
              dia: day.fecha
            });
          }

          // Actualizar el estado de la guía principal
          await guideRef.update({
            status: 'completed',
            lastUpdated: Timestamp.now(),
            generationCompletedAt: Timestamp.now()
          });

          console.log('[Server] Guía guardada correctamente:', transformedDays);
        } else {
          console.error('[Server] Formato de respuesta inválido:', parsedContent);
          throw new Error('Formato de respuesta inválido');
        }
      } catch (parseError) {
        console.error('[Server] Error al procesar el contenido:', {
          error: parseError,
          buffer: jsonBuffer
        });
        
        await guideRef.update({
          status: 'error',
          errorMessage: 'Error al generar el itinerario',
          lastUpdated: Timestamp.now()
        });
      }

      res.write('[DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('[Server] Error en generación:', error);
      res.write(JSON.stringify({ error: error.message }));
      res.end();
    }
  }
};

// Función auxiliar mejorada
function calcularHoraFin(horaInicio: string, duracion: string): string {
  try {
    if (!horaInicio || !duracion) {
      console.warn('Hora inicio o duración faltante:', { horaInicio, duracion });
      return horaInicio || '00:00';
    }

    const [horas, minutos] = horaInicio.split(':').map(Number);
    const duracionMatch = duracion.match(/(\d+(\.\d+)?)\s*(hora|horas|h)/i);
    const duracionHoras = duracionMatch ? parseFloat(duracionMatch[1]) : 1;

    let horasFinales = horas + Math.floor(duracionHoras);
    let minutosFinales = minutos + Math.floor((duracionHoras % 1) * 60);

    if (minutosFinales >= 60) {
      horasFinales += Math.floor(minutosFinales / 60);
      minutosFinales = minutosFinales % 60;
    }

    horasFinales = horasFinales % 24;
    
    return `${String(horasFinales).padStart(2, '0')}:${String(minutosFinales).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculando hora fin:', error, { horaInicio, duracion });
    return horaInicio || '00:00';
  }
}

