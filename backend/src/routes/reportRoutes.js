// backend/src/routes/reportRoutes.js

const express = require("express");
const router = express.Router();

const ReportController = require("../controllers/reportController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/generate", authMiddleware.required, (req, res) => ReportController.generateComparison(req, res));
router.post("/intelligence", authMiddleware.required, (req, res) => ReportController.marketIntelligence(req, res));
router.post("/company-monitor", authMiddleware.required, (req, res) => ReportController.companyMonitor(req, res));

// [NUEVO] Ruta para Reporte de Distribuidor
router.post("/distributor-intelligence", authMiddleware.required, (req, res) => ReportController.distributorIntelligence(req, res));

router.get("/:id", authMiddleware.required, (req, res) => ReportController.getReport(req, res));
router.get("/", authMiddleware.required, (req, res) => ReportController.listReports(req, res));

module.exports = router;