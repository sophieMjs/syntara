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

    async findUserHistory(userId, limit = 20) {
        return SearchModel.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate("results")
            .exec();
    }

    async addPriceRecord(searchId, recordId) {
        return SearchModel.findByIdAndUpdate(
            searchId,
            { $push: { results: recordId } },
            { new: true }
        ).exec();
    }

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
            filter.userId = null;
        }

        return SearchModel.countDocuments(filter).exec();
    }

    async deleteUserHistory(userId) {
        return SearchModel.deleteMany({ userId: userId }).exec();
    }

    // [NUEVO] Obtener productos más buscados (Demanda) donde aparece mi tienda
    // Cruza las búsquedas con los registros de precios para filtrar por tienda
    async findTopSearchedProductsByStore(storeName, limit = 10) {
        return await SearchModel.aggregate([
            {
                $lookup: {
                    from: "pricerecords", // Colección de PriceRecords en Mongo
                    localField: "results",
                    foreignField: "_id",
                    as: "resultDetails"
                }
            },
            {
                $match: {
                    // Filtramos búsquedas que arrojaron al menos un resultado de "mi tienda"
                    "resultDetails.store": new RegExp(storeName, "i")
                }
            },
            {
                $group: {
                    _id: "$query.product", // Agrupamos por el término buscado (Producto/Categoría)
                    searchCount: { $sum: 1 }, // Frecuencia de búsqueda (Demanda)
                    lastSearchDate: { $max: "$timestamp" }
                }
            },
            { $sort: { searchCount: -1 } }, // Los más buscados primero
            { $limit: limit }
        ]);
    }
}

module.exports = new SearchRepository();