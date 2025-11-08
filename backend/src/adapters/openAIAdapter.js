// adapters/openAIAdapter.js
const OpenAIClient = require("../clients/openAIClient");
const ParserFactory = require("../factories/parserFactory"); // 1. Importar
const { PriceRecordEntity } = require("../models/PriceRecord"); // 2. Importar

class OpenAIAdapter {
    constructor() {
        this.client = new OpenAIClient();
        this.parserFactory = new ParserFactory(); // 3. Instanciar
    }

    // 4. Cambiar el nombre del método para que coincida con el diagrama
    async toPriceRecords(prompt) {
        let rawResponse;
        try {
            rawResponse = await this.client.sendPrompt(prompt);
        } catch (err) {
            console.error("[OpenAIAdapter] Error al comunicarse con OpenAI:", err.message);
            throw new Error("No se pudo obtener respuesta de OpenAI.");
        }

        // 5. Mover la lógica de parseo y conversión aquí
        try {
            const parser = this.parserFactory.getParser("json");
            const parsed = parser.parse(rawResponse);

            // Convertir el JSON genérico en entidades de tu dominio
            return (parsed.results || []).map(r => new PriceRecordEntity(r));

        } catch (err) {
            console.error("[OpenAIAdapter] Error al parsear respuesta:", err.message);
            throw new Error("La respuesta de OpenAI no pudo ser procesada.");
        }
    }
}

module.exports = OpenAIAdapter;