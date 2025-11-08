// Subscription.js
// Clase de dominio + esquema / modelo Mongoose para suscripciones

const mongoose = require('mongoose');

class SubscriptionEntity {
    constructor({ type, price, currency = 'COP', features = [], maxSearchesPerMonth = 0, active = true, startDate = new Date(), endDate = null } = {}) {
        this.type = type;
        this.price = price;
        this.currency = currency;
        this.features = features;
        this.maxSearchesPerMonth = maxSearchesPerMonth;
        this.active = active;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    // Ejemplo de helper: comprobar si está activa
    isActive() {
        if (!this.active) return false;
        if (this.endDate && new Date() > new Date(this.endDate)) return false;
        return true;
    }
}

const subscriptionSchema = new mongoose.Schema({
    type: { type: String, enum: ['Pro', 'Enterprise'], required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'COP' },
    features: [{ type: String }],
    maxSearchesPerMonth: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null }
});

const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);

module.exports = { SubscriptionEntity, SubscriptionModel };
