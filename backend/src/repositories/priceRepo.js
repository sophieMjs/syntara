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
        return PriceRecordModel.find({ normalizedProduct })
            .sort({ date: -1 })
            .limit(limit)
            .exec();
    }

    async findByProductAndStore(normalizedProduct, store) {
        return PriceRecordModel.findOne({ normalizedProduct, store }).exec();
    }

    /**
     * Devuelve el histórico completo (o por rango) de precios para un producto.
     * Útil para generar reportes de inteligencia de mercado.
     */
    async getHistoricalPrices(normalizedProduct, limit = 0) {
        const q = { normalizedProduct };
        const query = PriceRecordModel.find(q).sort({ date: 1 }); // ascendente por fecha
        if (limit && limit > 0) query.limit(limit);
        return query.exec();
    }

    /**
     * Obtiene la lista de nombres normalizados de productos que una tienda específica tiene registrados.
     */
    async findDistinctProductsByStore(storeName) {
        return await PriceRecordModel.distinct("normalizedProduct", {
            store: new RegExp(`^${storeName}$`, "i") // Búsqueda insensible a mayúsculas
        });
    }

    /**
     * Busca los registros más recientes para una lista de productos.
     * Esto trae "todo lo que hay en la base de datos" sobre esos productos (tienda propia y competencia).
     */
    async findLatestPricesForManyProducts(productList) {
        return await PriceRecordModel.aggregate([
            {
                $match: {
                    normalizedProduct: { $in: productList }
                }
            },
            {
                $sort: { date: -1 } // Ordenar por fecha descendente
            },
            {
                $group: {
                    _id: {
                        product: "$normalizedProduct",
                        store: "$store"
                    },
                    doc: { $first: "$$ROOT" } // Nos quedamos con el registro más reciente por (producto + tienda)
                }
            },
            {
                $replaceRoot: { newRoot: "$doc" } // Aplanamos la estructura
            }
        ]);
    }
}

module.exports = new PriceRecordRepository();