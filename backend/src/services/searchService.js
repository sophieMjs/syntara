// services/searchService.js
const PromptBuilderFactory = require("../factories/promptBuilderFactory");
// Ya no necesitas ParserFactory aquí
const SearchRepository = require("../repositories/searchRepo");
const PriceRecordRepository = require("../repositories/priceRepo");
const OpenAIAdapter = require("../adapters/openAIAdapter");

class SearchService {
    constructor() {
        this.promptFactory = new PromptBuilderFactory();
        // this.parserFactory = new ParserFactory(); // <== ELIMINAR
        this.searchRepo = new SearchRepository();
        this.priceRepo = new PriceRecordRepository();
        this.ai = new OpenAIAdapter();
    }

    async search({ userId, product, quantity = 1, unit = null, stores = [] }) {
        // 1️⃣ Construir el prompt
        const builder = this.promptFactory.getPromptBuilder("search");
        const prompt = builder.buildPrompt({ product, quantity, unit, stores });

        // 2️⃣ Enviar al modelo Y PARSEAR (ahora lo hace el adapter)
        // El Adapter ya devuelve PriceRecordEntity[]
        const priceRecords = await this.ai.toPriceRecords(prompt);

        // 3️⃣ Guardar registros en BD
        const savedRecords = [];
        for (const entity of priceRecords) {
            // El repo espera un objeto simple, no una clase
            const record = await this.priceRepo.create({
                ...entity, // Usamos la entidad que ya creó el Adapter
                normalizedProduct: entity.normalizedProduct || entity.product.toLowerCase(),
                date: entity.date || new Date(),
            });
            savedRecords.push(record);
        }

        // 4️⃣ Registrar búsqueda
        const searchLog = await this.searchRepo.create({
            userId,
            product,
            quantity,
            unit,
            stores,
            results: savedRecords.map(r => r._id)
        });

        return {
            searchId: searchLog._id,
            product,
            results: savedRecords
        };
    }
}

module.exports = SearchService;