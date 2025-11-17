// services/searchService.js
const PromptBuilderFactory = require("../factories/promptBuilderFactory");
// Ya no necesitas ParserFactory aquí
const SearchRepository = require("../repositories/searchRepo");
const PriceRecordRepository = require("../repositories/priceRepo");
const OpenAIAdapter = require("../adapters/openAIAdapter");

class SearchService {
    constructor() {
        console.log("🛠️ [SearchService] Constructor iniciado."); // LOG CONSTRUCTOR START
        this.promptFactory = new PromptBuilderFactory();
        // this.parserFactory = new ParserFactory(); // <== ELIMINAR
        this.searchRepo = SearchRepository;
        this.priceRepo = PriceRecordRepository;
        this.ai = new OpenAIAdapter();
        console.log("🛠️ [SearchService] OpenAIAdapter inicializado."); // LOG ADAPTER INIT
    }

    // 🛑 Limpiamos la firma para recibir solo los 4 parámetros esperados
    async search({ userId, product, quantity = 1, unit = null }) {

        console.log("➡️ [SearchService] 4. Ejecución del método search iniciada."); // LOG METHOD START

        // 1️⃣ Construir el prompt
        const builder = this.promptFactory.getPromptBuilder("search");
        // El builder ya no recibe 'stores'
        const prompt = builder.buildPrompt({product, quantity, unit});

        console.log("➡️ [SearchService] 5. Prompt construido. Llamando a la IA..."); // LOG ANTES DE LA LLAMADA EXTERNA

        // 2️⃣ Enviar al modelo Y PARSEAR (ahora lo hace el adapter)
        // El Adapter ya devuelve PriceRecordEntity[]
        const priceRecords = await this.ai.toPriceRecords(prompt);

        console.log("✅ [SearchService] 6. Respuesta de IA recibida y parseada."); // LOG DESPUÉS DE LA LLAMADA EXTERNA

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
            query: {        // <--- AÑADIR ESTO
                product,
                quantity,
                unit
            },              // <--- AÑADIR ESTO
            results: savedRecords.map(r => r._id)
        });

        console.log("✅ [SearchService] 7. Logs de búsqueda guardados. Retornando...");


        return {
            searchId: searchLog._id,
            product,
            results: savedRecords
        };
    }
}

module.exports = SearchService;