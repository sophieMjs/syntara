// routes/searchRoutes.js
const express = require("express");
const router = express.Router();
const { search } = require("../controllers/searchController");
const searchController = require("../controllers/searchController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware.optional, searchController.search);

// [NUEVO] Rutas de Historial (SOLO Privadas - requieren login)
router.get("/history", authMiddleware.required, searchController.getHistory);
router.delete("/history", authMiddleware.required, searchController.clearHistory);

// El middleware "authMiddleware" en tu proyecto es un objeto con .optional y .required.
// Para permitir búsquedas tanto por invitados como por usuarios autenticados usamos .optional.
// ...
// El middleware "authMiddleware" en tu proyecto es un objeto con .optional y .required.
// Para permitir búsquedas tanto por invitados como por usuarios autenticados usamos .optional.
router.get("/", authMiddleware.optional, search); // <== ¡CAMBIO AQUÍ!

module.exports = router;