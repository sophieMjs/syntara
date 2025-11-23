// backend/src/services/reportService.js

const PromptBuilderFactory = require("../factories/promptBuilderFactory");
// const OpenAIService = require("./openaiService"); // ELIMINADO

const ReportRepository = require("../repositories/reportRepo");
const PriceRecordRepo = require("../repositories/priceRepo");
const SearchRepo = require("../repositories/searchRepo");

class ReportService {
    constructor() {
        this.reportRepo = new ReportRepository();
        this.priceRepo = PriceRecordRepo;
        this.searchRepo = SearchRepo;

        this.promptFactory = new PromptBuilderFactory();
        // this.openAI = OpenAIService; // ELIMINADO
    }

    // --- Reportes Anteriores (Sin IA) ---

    async generatePriceComparisonReport(userId, product) {
        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: product,
            status: "pending"
        });

        const normalized = (product || "").toLowerCase().trim();
        const priceData = await this.priceRepo.findLatestByProduct(normalized, 100);

        let analysisText = "";
        if (priceData.length > 0) {
            const prices = priceData.map(p => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            analysisText = `Análisis para "${product}": Se encontraron ${priceData.length} resultados. Rango: $${minPrice} - $${maxPrice}.`;
        } else {
            analysisText = `No se encontraron registros para "${product}".`;
        }

        await this.reportRepo.updateStatus(
            reportRecord._id,
            "ready",
            null,
            { product, prices: priceData, analysis: analysisText }
        );

        return { message: "Reporte generado", reportId: reportRecord._id, analysis: analysisText, data: priceData };
    }

    async generateMarketIntelligenceReport(userId, product) {
        const normalized = (product || "").toLowerCase().trim();
        const records = await this.priceRepo.getHistoricalPrices(normalized);

        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: product,
            status: "pending"
        });

        const analysisText = `Historial de "${product}": ${records.length} registros encontrados.`;

        await this.reportRepo.updateStatus(
            reportRecord._id,
            "ready",
            null,
            { product, history: records, analysis: analysisText }
        );

        return { message: "Reporte Histórico generado", reportId: reportRecord._id, data: records };
    }

    async generateCompanyMonitorReport(userId, myStoreName) {
        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: `Monitor Competencia: ${myStoreName}`,
            status: "pending"
        });

        try {
            const myProducts = await this.priceRepo.findDistinctProductsByStore(myStoreName);
            if (!myProducts.length) throw new Error(`No hay productos para ${myStoreName}`);

            const allRecords = await this.priceRepo.findLatestPricesForManyProducts(myProducts);
            const comparisonMap = {};

            myProducts.forEach(prod => {
                comparisonMap[prod] = { productName: prod, myStore: myStoreName, myPrice: null, competitors: [] };
            });

            const myStoreRegex = new RegExp(myStoreName, "i");

            allRecords.forEach(record => {
                const pName = record.normalizedProduct;
                if (!comparisonMap[pName]) return;

                if (myStoreRegex.test(record.store)) {
                    comparisonMap[pName].myPrice = record.price;
                    comparisonMap[pName].myDate = record.date;
                } else {
                    comparisonMap[pName].competitors.push({
                        store: record.store, price: record.price, date: record.date
                    });
                }
            });

            const reportData = Object.values(comparisonMap).filter(i => i.myPrice !== null || i.competitors.length > 0);
            const analysisText = `Monitor: ${reportData.length} productos analizados.`;

            await this.reportRepo.updateStatus(
                reportRecord._id,
                "ready",
                null,
                { myStore: myStoreName, totalProducts: reportData.length, results: reportData, analysis: analysisText }
            );

            return { message: "Monitor de Competencia generado", reportId: reportRecord._id, data: reportData };
        } catch (error) {
            await this.reportRepo.updateStatus(reportRecord._id, "failed");
            throw error;
        }
    }

    // ---------------------------------------------------------------------------
    // [NUEVO] Reporte de Distribuidor (Inteligencia de Mercado - Tendencias)
    // ---------------------------------------------------------------------------
    async generateDistributorIntelligenceReport(userId, storeName) {
        const reportRecord = await this.reportRepo.createReport({
            userId,
            query: `Inteligencia Distribuidor: ${storeName}`,
            status: "pending"
        });

        try {
            // 1. DEMANDA: Obtener los productos más buscados relacionados con esta tienda
            const topSearches = await this.searchRepo.findTopSearchedProductsByStore(storeName, 20);

            if (!topSearches || topSearches.length === 0) {
                throw new Error(`No hay suficientes datos de búsqueda para generar tendencias de ${storeName}.`);
            }

            const topProductNames = topSearches.map(s => s._id); // Array de nombres de productos

            // 2. EVOLUCIÓN DE PRECIOS: Obtener historial para esos productos top
            const priceEvolution = await this.priceRepo.getPriceHistoryMany(topProductNames);

            // 3. Combinar datos
            const trendsData = topSearches.map(searchItem => {
                const historyData = priceEvolution.find(h => h._id === searchItem._id);
                return {
                    product: searchItem._id, // Categoría/Marca/Producto
                    demandScore: searchItem.searchCount, // Cuántas veces se buscó
                    lastSearch: searchItem.lastSearchDate,
                    priceStats: {
                        avg: historyData?.avgPrice || 0,
                        min: historyData?.minPrice || 0,
                        max: historyData?.maxPrice || 0
                    },
                    priceHistory: historyData?.history || [] // Evolución temporal
                };
            });

            const analysisText = `Reporte de Tendencias: Se identificaron ${trendsData.length} productos de alta demanda (más buscados) para ${storeName}.`;

            // 4. Guardar
            await this.reportRepo.updateStatus(
                reportRecord._id,
                "ready",
                null, // downloadUrl se generaría aquí si tuvieramos PDF
                {
                    store: storeName,
                    trends: trendsData, // Lista con demanda y evolución de precios
                    analysis: analysisText
                }
            );

            return {
                message: "Reporte de Inteligencia de Distribuidor generado",
                reportId: reportRecord._id,
                data: trendsData
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