// PriceRecord.js
// Clase de dominio + esquema / modelo Mongoose para registros de precio

const mongoose = require('mongoose');

class PriceRecordEntity {
    constructor({
                    product,
                    normalizedProduct = null,
                    store,
                    price,
                    unitPrice = null,
                    currency = 'COP',
                    date = new Date(),
                    url = null,
                    isOffer = false,
                    raw = {},
                    metadata = {}
                } = {}) {
        this.product = product;
        this.normalizedProduct = normalizedProduct || product.toLowerCase().trim();
        this.store = store;
        this.price = Number(price);
        this.unitPrice = unitPrice != null ? Number(unitPrice) : null;
        this.currency = currency;
        this.date = date;
        this.url = url;
        this.isOffer = isOffer;
        this.raw = raw;
        this.metadata = metadata;
    }

    // Helper: calcular unitPrice si se provee quantity en metadata
    computeUnitPrice(quantity = 1) {
        if (!this.price || !quantity) return null;
        this.unitPrice = Number(this.price) / Number(quantity);
        return this.unitPrice;
    }
}

const priceRecordSchema = new mongoose.Schema({
    product: { type: String, required: true, index: true },
    normalizedProduct: { type: String, index: true },
    store: { type: String, required: true },
    price: { type: Number, required: true },
    unitPrice: { type: Number, default: null },
    currency: { type: String, default: 'COP' },
    date: { type: Date, default: Date.now },
    url: { type: String, default: null },
    isOffer: { type: Boolean, default: false },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata: {
        queryId: { type: String, default: null },
        confidence: { type: Number, default: 1.0 }
    }
});

// Index para consultas por producto + tienda + fecha (útil en búsquedas)
priceRecordSchema.index({ normalizedProduct: 1, store: 1, date: -1 });

const PriceRecordModel = mongoose.model('PriceRecord', priceRecordSchema);

module.exports = { PriceRecordEntity, PriceRecordModel };
