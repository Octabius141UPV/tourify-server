import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const editActivityController = {
    async editActivity(req: Request, res: Response) {
        const startTime = Date.now();
        let metrics = {
            verificationTime: 0,
            generationTime: 0,
            totalTime: 0
        };

        try {
            if (!req.body || typeof req.body !== 'object') {
                return res.status(400).json({
                    error: 'Cuerpo de la solicitud inválido'
                });
            }

            const { activity, newTitle, cityName } = req.body;

            if (!activity || typeof activity !== 'string' || 
                !newTitle || typeof newTitle !== 'string' || 
                !cityName || typeof cityName !== 'string') {
                return res.status(400).json({
                    error: 'Se requieren activity, newTitle y cityName como texto'
                });
            }

            const verificationStartTime = Date.now();
            const verificationCompletion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ 
                    role: "user", 
                    content: `Analiza si la siguiente actividad "${activity}" podría pertenecer a la ciudad de ${cityName}. 
                             Responde únicamente con "true" si es posible que pertenezca a la ciudad o "false" si definitivamente no pertenece.` 
                }],
                temperature: 0.3,
                max_tokens: 10
            });

            metrics.verificationTime = (Date.now() - verificationStartTime) / 1000;
            const belongsToCity = verificationCompletion.choices[0].message.content?.trim().toLowerCase() === 'true';

            if (!belongsToCity) {
                metrics.totalTime = (Date.now() - startTime) / 1000;
                return res.status(400).json({ 
                    error: 'La actividad no pertenece a la ciudad especificada',
                    metrics
                });
            }

            const generationStartTime = Date.now();
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { 
                        role: "system", 
                        content: "Eres un asistente que SOLO genera JSON válido. La descripción debe tener máximo 20 palabras." 
                    },
                    { 
                        role: "user", 
                        content: `Genera una nueva versión de la actividad "${newTitle}" en ${cityName} como JSON válido con esta estructura:
                        {
                          "nombre": "${newTitle}",
                          "hora_inicio": "HH:MM",
                          "hora_fin": "HH:MM",
                          "precio": precio por persona €,
                          "ubicacion": "Dirección específica en ${cityName}",
                          "categoria": "Cultural, Restaurante u Otros",
                          "descripcion": "Descripción máximo 20 palabras"
                        }` 
                    }
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            const rawResponse = completion.choices[0].message.content?.trim() || '';
            
            try {
                const newActivity = JSON.parse(rawResponse);
                metrics.generationTime = (Date.now() - generationStartTime) / 1000;
                metrics.totalTime = (Date.now() - startTime) / 1000;

                const requiredFields = ['nombre', 'hora_inicio', 'hora_fin', 'precio', 'ubicacion', 'categoria', 'descripcion'];
                const missingFields = requiredFields.filter(field => !(field in newActivity));

                if (missingFields.length > 0) {
                    throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
                }

                const wordCount = newActivity.descripcion.split(/\s+/).length;
                if (wordCount > 20) {
                    throw new Error('La descripción excede el límite de 20 palabras');
                }

                res.setHeader('Content-Type', 'application/json');
                return res.status(200).json({
                    ...newActivity,
                    city: cityName,
                    updatedAt: new Date(),
                    metrics
                });

            } catch (parseError) {
                res.setHeader('Content-Type', 'application/json');
                return res.status(500).json({
                    error: 'Error al procesar la respuesta',
                    details: 'La respuesta no es un JSON válido'
                });
            }

        } catch (error) {
            res.setHeader('Content-Type', 'application/json');
            return res.status(500).json({
                error: 'Error al procesar la solicitud',
                details: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
};
