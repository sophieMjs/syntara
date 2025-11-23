// repositories/searchRepo.js
const { SearchModel } = require("../models/Search");
const mongoose = require("mongoose");

class SearchRepository {

    async create(data) {
        const search = new SearchModel(data);
        return await search.save();
    }

    async findById(id) {
        return SearchModel.findById(id)
            .populate("results")
            .exec();
    }

    // [MODIFICADO] Ahora populamos 'results' para traer los productos reales
    async findUserHistory(userId, limit = 20) {
        return SearchModel.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate("results") // <--- CLAVE: Trae los objetos PriceRecord
            .exec();
    }

    async addPriceRecord(searchId, recordId) {
        return SearchModel.findByIdAndUpdate(
            searchId,
            { $push: { results: recordId } },
            { new: true }
        ).exec();
    }

    /**
     * Cuenta las búsquedas de un usuario en el mes actual.
     * Útil para límites mensuales en SubscriptionService.
     */
    async countSearchesThisMonth(userId) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const filter = {
            timestamp: { $gte: start, $lt: end }
        };

        if (userId) {
            filter.userId = new mongoose.Types.ObjectId(userId);
        } else {
            // si no hay userId, contar búsquedas sin usuario
            filter.userId = null;
        }

        return SearchModel.countDocuments(filter).exec();
    }

    // [NUEVO] Borrar historial de un usuario
    async deleteUserHistory(userId) {
        return SearchModel.deleteMany({ userId: userId }).exec();
    }
}

module.exports = new SearchRepository();
