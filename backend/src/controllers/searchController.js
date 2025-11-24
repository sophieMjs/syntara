const SearchService = require("../services/searchService");
const searchService = new SearchService();
const SubscriptionService = require("../services/subscriptionService");
const subscriptionService = new SubscriptionService();

exports.search = async (req, res) => {
    try {
        const { product, quantity, unit, clientDate } = req.query;
        const userId = req.user?.id || null;

        const numericQuantity = quantity ? parseInt(quantity, 10) : undefined;

        console.log(" [SearchController] 1. Parámetros recibidos y validados:", { product, quantity: numericQuantity, unit, userId, clientDate });

        console.log(" [SearchController] 2. Llamando a searchService.search... (Esperando AWAIT)");

        const data = await searchService.search({
            userId,
            product,
            quantity: numericQuantity,
            unit,
            clientDate
        });

        console.log(" [SearchController] 3. El servicio de búsqueda ha respondido.");

        console.log("[SearchController] Resultado de la búsqueda:", data);

        res.status(200).json({
            success: true,
            message: "Búsqueda realizada correctamente.",
            data
        });
    } catch (error) {
        console.error(" [SearchController] ERROR atrapado:", error.message);
        console.error("[SearchController] Detalles del Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.wholesaleSearch = async (req, res) => {
    try {
        const { product, quantity, unit, clientDate } = req.query;
        const userId = req.user.id;

        const sub = await subscriptionService.getUserSubscription(userId);

        if (!sub || sub.type !== 'Enterprise') {
            return res.status(403).json({
                success: false,
                message: "Acceso denegado. La búsqueda mayorista requiere plan Enterprise."
            });
        }

        const numericQuantity = quantity ? parseInt(quantity, 10) : undefined;

        console.log(" [SearchController] Búsqueda Mayorista solicitada:", { product, userId });

        const data = await searchService.search({
            userId,
            product,
            quantity: numericQuantity,
            unit,
            clientDate,
            searchType: "wholesale"
        });

        res.status(200).json({
            success: true,
            message: "Búsqueda mayorista realizada correctamente.",
            data
        });

    } catch (error) {
        console.error(" [SearchController] Error en búsqueda mayorista:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userId = req.user.id; // Viene del authMiddleware
        const history = await searchService.getUserHistory(userId);

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("Error obteniendo historial:", error);
        res.status(500).json({ success: false, message: "Error al obtener el historial" });
    }
};


exports.clearHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        await searchService.clearUserHistory(userId);

        res.status(200).json({
            success: true,
            message: "Historial eliminado correctamente"
        });
    } catch (error) {
        console.error("Error borrando historial:", error);
        res.status(500).json({ success: false, message: "Error al borrar el historial" });
    }
};