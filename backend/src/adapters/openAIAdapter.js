// adapters/openAIAdapter.js
const OpenAIClient = require("../clients/openAIClient");
const ParserFactory = require("../factories/parserFactory");
const { PriceRecordEntity } = require("../models/PriceRecord");

class OpenAIAdapter {
    constructor() {
        console.log("⚙️ [OpenAIAdapter] Constructor ejecutado.");

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
            console.error("❌ ERROR: Falta OPENAI_API_KEY.");
            throw new Error("Variable OPENAI_API_KEY ausente.");
        }

        this.client = new OpenAIClient();
        this.parserFactory = new ParserFactory();

        console.log("⚙️ [OpenAIAdapter] Cliente y parser inicializados.");
    }

    async toPriceRecords(prompt) {
        console.log("➡️ [OpenAIAdapter] Solicitando a OpenAI...");

        let finalResponse;

        try {
            finalResponse = await this.client.sendPrompt(prompt);
        } catch (err) {
            console.error("[OpenAIAdapter] Error al comunicarse con OpenAI:", err.message);
            throw new Error("No se pudo obtener respuesta de OpenAI.");
        }

        console.log("📥 [OpenAIAdapter] Respuesta final recibida de OpenAI:");
        console.log(finalResponse);

        // --- PARSEO ---
        try {
            const parser = this.parserFactory.getParser("json");
            const parsed = parser.parse(finalResponse);

            return (parsed.results || []).map(r => new PriceRecordEntity(r));

        } catch (err) {
            console.error("[OpenAIAdapter] Error al parsear JSON:", err.message);
            console.error("[OpenAIAdapter] Respuesta cruda:", finalResponse);
            throw new Error("La respuesta de OpenAI no pudo ser convertida a PriceRecordEntity.");
        }
    }
}

module.exports = OpenAIAdapter;
