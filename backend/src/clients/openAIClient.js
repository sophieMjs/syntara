// clients/openAIClient.js
const OpenAI = require("openai");
require("dotenv").config();

class OpenAIClient {
    constructor() {
        if (OpenAIClient.instance) return OpenAIClient.instance;

        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Falta la variable de entorno OPENAI_API_KEY");
        }

        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.model = process.env.OPENAI_MODEL || "gpt-5.1";

        const configuredLimit = this._sanitizeTokenLimit(
            process.env.OPENAI_MAX_COMPLETION_TOKENS ?? process.env.OPENAI_MAX_TOKENS
        );
        this.maxTokens = configuredLimit ?? 2000;

        OpenAIClient.instance = this;
    }

    async sendPrompt(prompt) {
            const baseRequest = {
                model: this.model,
                messages: [{ role: "user", content: prompt }],

        response_format: { type: "json_object" }
    };

        const tokenLimit = this._sanitizeTokenLimit(this.maxTokens);
        const attempts = this._buildTokenParamAttempts(tokenLimit);
        let lastUnsupportedError = null;

        for (const param of attempts) {
            const payload = { ...baseRequest };

            if (param && tokenLimit) {
                payload[param] = tokenLimit;
            }

            try {
                const response = await this.client.chat.completions.create(payload);

                const choice = response?.choices?.[0];
                const message = choice?.message;

                if (!message) {
                    throw new Error("OpenAI no devolvió un mensaje en la respuesta");
                }

                const rawContent = this._extractContent(choice);
                if (rawContent) {
                    return rawContent;
                }

                throw new Error("OpenAI no devolvió contenido interpretable en la respuesta");
            } catch (error) {
                if (param && this._isUnsupportedParamError(error, param)) {
                    console.warn(
                        `⚠ [OpenAIClient] '${param}' no es compatible con el modelo ${this.model}. Reintentando con otro parámetro.`);
                    lastUnsupportedError = error;
                    continue;
                }

                throw error;
            }
        }

        if (lastUnsupportedError) {
            throw lastUnsupportedError;
        }

        throw new Error("OpenAI no devolvió contenido interpretable en la respuesta");
    }

    _extractContent(choice) {
        const message = choice?.message;
        if (!message) return null;

        // Algunos modelos pueden retornar el contenido como string plano
        if (typeof message.content === "string") {
            const text = message.content.trim();
            if (text) return text;
        }

        // Otros modelos retornan el contenido como un arreglo de partes
        if (Array.isArray(message.content)) {
            const text = message.content
                .map(part => {
                    if (typeof part === "string") return part;
                    if (typeof part?.text === "string") return part.text;
                    if (typeof part?.content === "string") return part.content;
                    if (part?.type === "output_text" && typeof part?.text === "string") return part.text;
                    return "";
                })
                .join("")
                .trim();
            if (text) return text;
        }

        // También puede venir como argumentos de una llamada a herramienta
        const toolArgs = message?.tool_calls?.[0]?.function?.arguments;
        if (typeof toolArgs === "string" && toolArgs.trim()) {
            return toolArgs.trim();
        }

        // En casos raros, el modelo puede retornar texto en choice.text
        if (typeof choice?.text === "string" && choice.text.trim()) {
            return choice.text.trim();
        }

        return null;
    }

    _buildTokenParamAttempts(tokenLimit) {
        if (!tokenLimit) {
            return [null];
        }

        return ["max_completion_tokens", "max_tokens", null];
    }

    _isUnsupportedParamError(error, param) {
        if (!error) return false;

        const message = error?.message || error?.error?.message;
        if (typeof message !== "string") {
            return false;
        }

        return message.includes("Unsupported parameter") && message.includes('${param}');
    }

    _sanitizeTokenLimit(value) {
        const parsed = Number(value);

        if (!Number.isFinite(parsed) || parsed <= 0) {
            return null;
        }
        return Math.floor(parsed);
    }
}

module.exports = OpenAIClient;