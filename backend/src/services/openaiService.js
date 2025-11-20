// src/services/openaiService.js
// Servicio profesional para comunicar el backend con la API de OpenAI
// Maneja:
//   • Construcción de prompts (AHORA SOLO PARA REPORTES)
//   • Reintentos inteligentes
//   • Logging útil para debugging
//   • Uso centralizado para todo el proyecto

const OpenAI = require("openai");

class OpenAIService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY no está configurada en el .env");
        }

        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        this.model = process.env.OPENAI_MODEL || "gpt-5.1";
        this.temperature = 0.0;
        this.maxRetries = 3;
        this.retryDelay = 1200; // ms
        // Se eliminó la propiedad this.maxTokens que no se inicializaba ni se usaba correctamente.
    }


     // Hace una petición a la API de OpenAI con reintentos inteligentes

    async sendPrompt(prompt, options = {}) {
        if (!prompt || typeof prompt !== "string") {
            throw new Error("El prompt debe ser una cadena válida.");
        }

        const model = options.model || this.model;
        const temperature = options.temperature ?? this.temperature;
        // Se limpió la referencia a 'this.maxTokens' que no existía.
        const max_tokens = options.max_tokens;

        let attempt = 0;

        while (attempt < this.maxRetries) {
            try {
                const start = Date.now();

                const response = await this.client.chat.completions.create({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    temperature,
                    max_tokens // Si es undefined, la API lo ignorará.
                });

                const content = response?.choices?.[0]?.message?.content?.trim();

                if (!content) {
                    throw new Error("OpenAI respondió vacío o en formato no válido");
                }

                const duration = ((Date.now() - start) / 1000).toFixed(2);
                console.log(`✅ [OpenAI] Respuesta recibida (${duration}s) — Modelo: ${model}`);

                return content;

            } catch (error) {
                attempt++;
                const isLast = attempt === this.maxRetries;

                console.error(`❌ [OpenAI] Error intento ${attempt}/${this.maxRetries}:`, error.message);

                const rateLimit = error?.error?.type === "rate_limit_exceeded";
                const timeout = error.message.includes("timeout");

                if (isLast) {
                    if (rateLimit) throw new Error("Límite de uso de OpenAI alcanzado.");
                    if (timeout) throw new Error("Timeout al conectar con OpenAI.");
                    throw new Error("No se pudo obtener respuesta de OpenAI.");
                }

                const delay = this.retryDelay * attempt;
                console.log(`⏳ Reintentando en ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

}

module.exports = new OpenAIService();