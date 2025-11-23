// backend/src/controllers/reportController.js

const ReportService = require("../services/reportService");
const SubscriptionService = require("../services/subscriptionService");

const reportService = new ReportService();
const subscriptionService = new SubscriptionService();

class ReportController {
    async generateComparison(req, res) {
        try {
            const { product } = req.body;
            const sub = await subscriptionService.getUserSubscription(req.user.id);
            if (!sub || (sub.type !== "Pro" && sub.type !== "Enterprise")) {
                return res.status(403).json({ error: "Tu plan no permite generar reportes." });
            }
            const report = await reportService.generatePriceComparisonReport(req.user.id, product);
            res.json(report);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async marketIntelligence(req, res) {
        try {
            const { product } = req.body;
            const sub = await subscriptionService.getUserSubscription(req.user.id);
            if (!sub || sub.type !== "Enterprise") {
                return res.status(403).json({ error: "Solo Enterprise puede generar este reporte." });
            }
            const report = await reportService.generateMarketIntelligenceReport(req.user.id, product);
            res.json(report);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async companyMonitor(req, res) {
        try {
            const { storeName } = req.body;
            if (!storeName) return res.status(400).json({ error: "Falta storeName" });

            const sub = await subscriptionService.getUserSubscription(req.user.id);
            if (!sub || sub.type !== "Enterprise") {
                return res.status(403).json({ error: "Requiere plan Enterprise." });
            }
            const result = await reportService.generateCompanyMonitorReport(req.user.id, storeName);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // [NUEVO] Reporte para Distribuidores
    async distributorIntelligence(req, res) {
        try {
            const { storeName } = req.body;
            if (!storeName) return res.status(400).json({ error: "Falta storeName" });

            // Validar acceso restringido (Solo Enterprise/Distribuidor)
            const sub = await subscriptionService.getUserSubscription(req.user.id);
            if (!sub || sub.type !== "Enterprise") {
                return res.status(403).json({ error: "Acceso denegado. Requiere cuenta autorizada (Enterprise)." });
            }

            const result = await reportService.generateDistributorIntelligenceReport(req.user.id, storeName);
            res.json(result);
        } catch (err) {
            console.error("Error en distributorIntelligence:", err);
            res.status(500).json({ error: err.message });
        }
    }

    async getReport(req, res) {
        try {
            const report = await reportService.getReport(req.params.id);
            res.json(report);
        } catch {
            res.status(404).json({ error: "Reporte no encontrado." });
        }
    }

    async listReports(req, res) {
        try {
            const reports = await reportService.getUserReports(req.user.id);
            res.json(reports);
        } catch {
            res.status(500).json({ error: "Error listando reportes." });
        }
    }
}

module.exports = new ReportController();