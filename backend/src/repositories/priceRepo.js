// repositories/priceRecordRepo.js

const { PriceRecordModel } = require("../models/PriceRecord");

class PriceRecordRepository {

    async create(data) {
        const record = new PriceRecordModel(data);
        return await record.save();
    }

    async createMany(records) {
        return await PriceRecordModel.insertMany(records);
    }

    async findById(id) {
        return PriceRecordModel.findById(id).exec();
    }

    async findByQueryId(queryId) {
        return PriceRecordModel.find({ "metadata.queryId": queryId }).exec();
    }

    async findLatestByProduct(normalizedProduct, limit = 10) {
        // Búsqueda flexible por regex
        const regex = new RegExp(normalizedProduct, "i");
        return PriceRecordModel.find({ normalizedProduct: { $regex: regex } })
            .sort({ date: -1 })
            .limit(limit)
            .exec();
    }

    async findByProductAndStore(normalizedProduct, store) {
        return PriceRecordModel.findOne({ normalizedProduct, store }).exec();
    }

    async getHistoricalPrices(normalizedProduct, limit = 0) {
        const regex = new RegExp(normalizedProduct, "i");
        const q = { normalizedProduct: { $regex: regex } };

        const query = PriceRecordModel.find(q).sort({ date: 1 });
        if (limit && limit > 0) query.limit(limit);
        return query.exec();
    }

    async findDistinctProductsByStore(storeName) {
        return await PriceRecordModel.distinct("normalizedProduct", {
            store: new RegExp(`^${storeName}$`, "i")
        });
    }

    async findLatestPricesForManyProducts(productList) {
        return await PriceRecordModel.aggregate([
            {
                $match: {
                    normalizedProduct: { $in: productList }
                }
            },
            { $sort: { date: -1 } },
            {
                $group: {
                    _id: { product: "$normalizedProduct", store: "$store" },
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } }
        ]);
    }

    // [NUEVO] Obtener historial agrupado para una lista de productos (Evolución de Precios)
    async getPriceHistoryMany(productNames) {
        return await PriceRecordModel.aggregate([
            {
                $match: { normalizedProduct: { $in: productNames } }
            },
            { $sort: { date: 1 } },
            {
                $group: {
                    _id: "$normalizedProduct", // Agrupamos por producto
                    history: {
                        $push: {
                            price: "$price",
                            date: "$date",
                            store: "$store"
                        }
                    },
                    avgPrice: { $avg: "$price" },
                    minPrice: { $min: "$price" },
                    maxPrice: { $max: "$price" }
                }
            }
        ]);
    }
}

module.exports = new PriceRecordRepository();