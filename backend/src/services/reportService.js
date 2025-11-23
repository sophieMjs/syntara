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

    /**
     * Genera un reporte de monitoreo de competencia para una empresa (cadena).
     * Compara los productos de 'myStore' contra el resto del mercado disponible en BD.
     */
    async generateCompanyMonitorReport(userId, myStoreName) {
        // 1. Crear registro del reporte
        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: `Monitor Competencia: ${myStoreName}`,
            status: "pending"
        });

        try {
            // 2. Identificar qué productos tiene mi tienda en la base de datos
            const myProducts = await this.priceRepo.findDistinctProductsByStore(myStoreName);

            if (!myProducts || myProducts.length === 0) {
                throw new Error(`No se encontraron productos registrados para la tienda: ${myStoreName}`);
            }

            // 3. Buscar todos los precios (míos y de la competencia) para esos productos
            const allRecords = await this.priceRepo.findLatestPricesForManyProducts(myProducts);

            // 4. Procesar y Estructurar los datos para el Frontend (Tabla y Gráfica)
            // Estructura deseada: { producto, miPrecio, miFecha, competidores: [ {tienda, precio, diff, fecha} ] }

            const comparisonMap = {};

            // Inicializar mapa con mis productos
            myProducts.forEach(prod => {
                comparisonMap[prod] = {
                    productName: prod, // Nombre normalizado
                    myStore: myStoreName,
                    myPrice: null,
                    myDate: null,
                    competitors: []
                };
            });

            // Llenar datos
            allRecords.forEach(record => {
                const pName = record.normalizedProduct;

                if (!comparisonMap[pName]) return; // Por si acaso

                // Si es mi tienda (comparación flexible para evitar errores de mayúsculas/minúsculas)
                if (record.store.toLowerCase() === myStoreName.toLowerCase()) {
                    comparisonMap[pName].myPrice = record.price;
                    comparisonMap[pName].myDate = record.date;
                    // Usamos el nombre bonito del registro si está disponible
                    comparisonMap[pName].displayProduct = record.product;
                } else {
                    // Si es competencia
                    comparisonMap[pName].competitors.push({
                        store: record.store,
                        price: record.price,
                        date: record.date,
                        url: record.url
                    });
                }
            });

            // Convertir mapa a array y filtrar solo los que tienen datos útiles
            const reportData = Object.values(comparisonMap).filter(item => {
                // Opcional: Mostrar solo si tengo precio O si hay competidores
                return item.myPrice !== null || item.competitors.length > 0;
            });

            // 5. Análisis básico (sin gastar tokens excesivos)
            const analysisText = `Reporte generado para ${reportData.length} productos. Los datos incluyen comparativa directa con tiendas encontradas en la base de datos.`;

            // 6. Guardar reporte
            await this.reportRepo.updateStatus(
                reportRecord._id,
                "ready",
                null,
                {
                    myStore: myStoreName,
                    totalProducts: reportData.length,
                    results: reportData,
                    analysis: analysisText
                }
            );

            return {
                message: "Reporte de monitoreo generado",
                reportId: reportRecord._id,
                data: reportData
            };

        } catch (error) {
            await this.reportRepo.updateStatus(reportRecord._id, "failed");
            throw error;
        }
    }

    async getReport(reportId) {
        return this.reportRepo.getReport(reportId);
    }

    async getUserReports(userId) {
        return this.reportRepo.getUserReports(userId);
    }
}

module.exports = ReportService;