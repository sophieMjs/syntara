// services/reportService.js
// ReportService corregido: imports, uso correcto de repositorios y builders/parsers.

const PromptBuilderFactory = require("../factories/promptBuilderFactory");
const OpenAIService = require("./openaiService");

// Repositorios (usar los nombres que tienes)
const ReportRepository = require("../repositories/reportRepo"); // clase -> instanciar
const PriceRecordRepo = require("../repositories/priceRepo"); // instancia exportada
const SearchRepo = require("../repositories/searchRepo"); // instancia exportada

class ReportService {
    constructor() {
        this.reportRepo = new ReportRepository();
        this.priceRepo = PriceRecordRepo; // ya es instancia
        this.searchRepo = SearchRepo; // ya es instancia

        this.promptFactory = new PromptBuilderFactory();
        this.openAI = OpenAIService; // tu servicio OpenAI central
    }

    /**
     * Genera un reporte de comparación de precios para un producto.
     * - Busca datos históricos/últimos precios desde priceRepo
     * - Construye prompt con PromptBuilderFactory
     * - Llama a OpenAIService para análisis
     * - Guarda el resultado en ReportModel (reportRepo)
     */
    async generatePriceComparisonReport(userId, product) {
        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: product,
            status: "pending"
        });

        // 1. Obtener datos recientes/históricos desde priceRepo
        // PriceRecordRepo espera normalizedProduct
        const normalized = (product || "").toLowerCase().trim();
        // traer últimos 50 registros (si existen)
        const priceData = await this.priceRepo.findLatestByProduct(normalized, 50);

        // 2. Crear el prompt usando Factory Pattern (report builder)
        const builder = this.promptFactory.getPromptBuilder("report");
        const prompt = builder.buildPriceSummaryPrompt({
            product,
            storeData: priceData
        });

        // 3. Llamar a OpenAI para análisis avanzado
        const analysisText = await this.openAI.sendPrompt(prompt);

        // 4. Guardar reporte como ready con data + análisis
        await this.reportRepo.updateStatus(
            reportRecord._id,
            "ready",
            null, // downloadUrl
            {
                product,
                prices: priceData,
                analysis: analysisText
            }
        );

        return {
            message: "Reporte generado",
            reportId: reportRecord._id,
            analysis: analysisText
        };
    }

    /**
     * Genera un reporte de inteligencia de mercado (histórico)
     */
    async generateMarketIntelligenceReport(userId, product) {
        const normalized = (product || "").toLowerCase().trim();
        // obtener histórico completo (método añadido en priceRepo)
        const records = await this.priceRepo.getHistoricalPrices(normalized);

        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: product,
            status: "pending"
        });

        const builder = this.promptFactory.getPromptBuilder("report");
        const prompt = builder.buildMarketIntelligencePrompt(records);

        const aiAnalysis = await this.openAI.sendPrompt(prompt);

        await this.reportRepo.updateStatus(
            reportRecord._id,
            "ready",
            null,
            {
                product,
                history: records,
                analysis: aiAnalysis
            }
        );

        return {
            message: "Reporte de inteligencia generado",
            reportId: reportRecord._id,
        };
    }

    async getReport(reportId) {
        return this.reportRepo.getReport(reportId);
    }

    async getUserReports(userId) {
        return this.reportRepo.getUserReports(userId);
    }
}

module.exports = ReportService;
