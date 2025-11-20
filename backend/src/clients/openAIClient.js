// clients/openAIClient.js

//***********************************************

//***********************************************

//***********************************************

//***********************************************

//***********************************************

//***********************************************

//***********************************************

//***********************************************
/*
const OpenAI = require("openai").default;  // usar .default con CommonJS
require("dotenv").config();

class OpenAIClient {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Falta la variable de entorno OPENAI_API_KEY");
        }

        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.model = process.env.OPENAI_MODEL || "gpt-5.1";
    }

    async sendPrompt(userPrompt) {
        let messages = [
            {
                role: "system",
                content:
                    "Eres un agente extractor de precios. Usa web_search siempre que sea necesario. Devuelve siempre un JSON con campo results."
            },
            { role: "user", content: userPrompt }
        ];

        while (true) {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "web_search",
                            description: "Realiza una búsqueda web en tiendas de Colombia",
                            parameters: {
                                type: "object",
                                properties: {
                                    query: { type: "string", description: "Término de búsqueda" }
                                },
                                required: ["query"]
                            }
                        }
                    }
                ],
                tool_choice: "auto",
                response_format: { type: "json_object" }
            });

            const msg = response.choices[0].message;

            // Si GPT invocó herramienta
            if (msg.tool_calls?.length > 0) {
                const toolCall = msg.tool_calls[0];
                console.log("🔧 TOOL CALL:", toolCall);

                const toolResponse = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        ...messages,
                        msg,
                        {
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: "" // el SDK se encarga de ejecutar
                        }
                    ],
                    response_format: { type: "json_object" }
                });

                const followUp = toolResponse.choices[0].message;

                if (followUp.content && followUp.content.trim() !== "") {
                    return followUp.content;
                }

                messages.push(msg);
                continue;
            }

            // Si respuesta final normal
            if (msg.content) {
                return msg.content;
            }

            throw new Error("Respuesta inválida de OpenAI");
        }
    }
}

module.exports = OpenAIClient;

*/
// clients/openAIClient.js
const OpenAI = require("openai").default;
require("dotenv").config();

class OpenAIClient {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Falta la variable de entorno OPENAI_API_KEY");
        }

        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Por compatibilidad con el ejemplo oficial, por defecto usamos "gpt-5".
        // Si tu cuenta tiene gpt-5.1 y quieres usarla, ponla en OPENAI_MODEL.
        this.model = process.env.OPENAI_MODEL || "gpt-5";
    }

    /**
     * sendPrompt:
     * - prompt: string (tu prompt completo; por ejemplo el builder que ya tienes)
     * - opts: { includeSources: boolean } (opcional)
     *
     * Devuelve un objeto { text: string, webSearchResults: Array, raw: response }
     */
    async sendPrompt(prompt, opts = { includeSources: true }) {
        try {
            const include = [];
            if (opts.includeSources) {
                // Valores compatibles con la Responses API para ver resultados de web_search
                include.push("web_search_call.results", "web_search_call.action.sources");
            }

            const response = await this.client.responses.create({
                model: this.model,
                input: prompt,
                tools: [{ type: "web_search" }],
                // Pedimos explícitamente las partes que queremos inspeccionar si es posible
                ...(include.length ? { include } : {}),
                // No forzamos formato; tu prompt está pidiendo JSON estricto y el modelo debe devolverlo.
            });

            // 1) Texto principal (si lo hay)
            let finalText = "";
            for (const block of response.output ?? []) {
                if (block.type === "output_text") {
                    finalText += block.text ?? "";
                }
            }

            // 2) Extraer resultados de web_search (si existen)
            const webSearchResults = [];
            // 2a) Si la API llenó web_search_call.results (forma esperada)
            if (Array.isArray(response.web_search_call?.results)) {
                for (const r of response.web_search_call.results) {
                    webSearchResults.push(r);
                }
            }

            // 2b) Si la API llenó action.sources (otra forma que aparece en docs/examples)
            if (Array.isArray(response.web_search_call?.action?.sources)) {
                for (const s of response.web_search_call.action.sources) {
                    webSearchResults.push(s);
                }
            }

            // 3) Para compatibilidad, también revisamos propiedades anidadas por si vienen con otro nombre
            // (defensivo: no romper si la shape cambia ligeramente)
            if (response?.meta) {
                // ejemplo: algunas respuestas incluyen referencias en response.output_annotations
                // no obligatorio, solo logging
            }

            // LOG útil para debugging local
            if (webSearchResults.length > 0) {
                console.log("🔎 web_search results (count):", webSearchResults.length);
                // Mostrar solo url y status/summary para no spamear consola
                webSearchResults.forEach((w, i) => {
                    const url = w.url || w.link || w.uri || null;
                    const status = w.response_status || w.http_status || null;
                    const title = w.title || w.name || null;
                    console.log(`  [${i}] ${title || "(sin título)"} - ${url} - status:${status}`);
                });
            } else {
                console.log("🔎 No se detectaron web_search results en la respuesta.");
            }

            return {
                text: finalText.trim(),
                webSearchResults,
                raw: response
            };

        } catch (err) {
            // Manejo de errores claro y con suficiente contexto
            console.error("[OpenAIClient] Error al comunicarse con OpenAI:", err?.message || err);
            // Re-lanzar para que el servicio superior lo capture y haga retries o fallback
            throw new Error("No se pudo obtener respuesta de OpenAI: " + (err?.message || String(err)));
        }
    }
}

module.exports = OpenAIClient;
