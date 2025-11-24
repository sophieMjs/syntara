// services/searchService.js
const PromptBuilderFactory = require("../factories/promptBuilderFactory");
const SearchRepository = require("../repositories/searchRepo");
const PriceRecordRepository = require("../repositories/priceRepo");
const OpenAIAdapter = require("../adapters/openAIAdapter");

class SearchService {
    constructor() {
        console.log(" [SearchService] Constructor iniciado.");
        this.promptFactory = new PromptBuilderFactory();
        this.searchRepo = SearchRepository;
        this.priceRepo = PriceRecordRepository;
        this.ai = new OpenAIAdapter();
        console.log(" [SearchService] OpenAIAdapter inicializado.");
    }

    async search({ userId, product, quantity = 1, unit = null, clientDate = null, searchType = "search" }) {
        console.log(` [SearchService] Búsqueda iniciada. Tipo: ${searchType}`);

        const builder = this.promptFactory.getPromptBuilder(searchType);
        const prompt = builder.buildPrompt({ product, quantity, unit });
        console.log("️ [SearchService] Prompt construido. Llamando a la IA...");

        const priceRecords = await this.ai.toPriceRecords(prompt);

        console.log(" [SearchService] Respuesta de IA recibida y parseada.");

        const dateToSave = clientDate ? new Date(clientDate) : new Date();

        const savedRecords = [];
        for (const entity of priceRecords) {
            const record = await this.priceRepo.create({
                ...entity,
                normalizedProduct: entity.normalizedProduct || entity.product.toLowerCase(),
                date: dateToSave,
            });
            savedRecords.push(record);
        }

        const searchLog = await this.searchRepo.create({
            userId,
            query: {
                product,
                quantity,
                unit
            },
            results: savedRecords.map(r => r._id),
            timestamp: dateToSave
        });

        console.log(" [SearchService] Logs guardados.");

        return {
            searchId: searchLog._id,
            product,
            results: savedRecords
        };
    }


    async getUserHistory(userId) {
        const historyDocs = await this.searchRepo.findUserHistory(userId);
        const flattenedHistory = [];

        historyDocs.forEach(doc => {
            if (doc.results && doc.results.length > 0) {
                doc.results.forEach(record => {
                    flattenedHistory.push({
                        id: doc._id,
                        product: record.product,
                        store: record.store,
                        price: record.price,
                        url: record.url,
                        quantity: doc.query.quantity,
                        unit: doc.query.unit,
                        date: doc.timestamp
                    });
                });
            } else {
                flattenedHistory.push({
                    id: doc._id,
                    product: doc.query.product,
                    store: "No encontrado",
                    price: 0,
                    url: null,
                    quantity: doc.query.quantity,
                    unit: doc.query.unit,
                    date: doc.timestamp
                });
            }
        });

        return flattenedHistory;
    }

    async clearUserHistory(userId) {
        return this.searchRepo.deleteUserHistory(userId);
    }
}

module.exports = SearchService;