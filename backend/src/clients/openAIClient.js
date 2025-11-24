const OpenAI = require("openai").default;
require("dotenv").config();

class OpenAIClient {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Falta la variable de entorno OPENAI_API_KEY");
        }

        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        this.model = process.env.OPENAI_MODEL || "gpt-5";
    }


    async sendPrompt(prompt, opts = { includeSources: true }) {
        try {
            const include = [];
            if (opts.includeSources) {

                include.push("web_search_call.results", "web_search_call.action.sources");
            }

            const response = await this.client.responses.create({
                model: this.model,
                input: prompt,
                tools: [{ type: "web_search" }],

                ...(include.length ? { include } : {}),

            });

            let finalText = "";
            for (const block of response.output ?? []) {
                if (block.type === "output_text") {
                    finalText += block.text ?? "";
                }
            }

            const webSearchResults = [];

            if (Array.isArray(response.web_search_call?.results)) {
                for (const r of response.web_search_call.results) {
                    webSearchResults.push(r);
                }
            }


            if (Array.isArray(response.web_search_call?.action?.sources)) {
                for (const s of response.web_search_call.action.sources) {
                    webSearchResults.push(s);
                }
            }


            if (response?.meta) {

            }


            if (webSearchResults.length > 0) {
                console.log(" web_search results (count):", webSearchResults.length);

                webSearchResults.forEach((w, i) => {
                    const url = w.url || w.link || w.uri || null;
                    const status = w.response_status || w.http_status || null;
                    const title = w.title || w.name || null;
                    console.log(`  [${i}] ${title || "(sin título)"} - ${url} - status:${status}`);
                });
            } else {
                console.log(" No se detectaron web_search results en la respuesta.");
            }

            return {
                text: finalText.trim(),
                webSearchResults,
                raw: response
            };

        } catch (err) {
            console.error("[OpenAIClient] Error al comunicarse con OpenAI:", err?.message || err);
            throw new Error("No se pudo obtener respuesta de OpenAI: " + (err?.message || String(err)));
        }
    }
}

module.exports = OpenAIClient;
