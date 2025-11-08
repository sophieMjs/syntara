// services/subscriptionService.js

const SubscriptionRepository = require("../repositories/subscriptionRepo");
const SearchRepository = require("../repositories/searchRepo");

class SubscriptionService {
    constructor() {
        this.subRepo = new SubscriptionRepository();
        this.searchRepo = new SearchRepository();

        // Planes base del producto
        this.plans = {
            Saver: {
                price: 3000,
                maxSearchesPerMonth: 20,
                features: ["comparación básica", "3 tiendas"],
            },
            Pro: {
                price: 12000,
                maxSearchesPerMonth: 200,
                features: ["10 tiendas", "reportes", "favoritos"],
            },
            Enterprise: {
                price: 70000,
                maxSearchesPerMonth: 5000,
                features: [
                    "reportes avanzados",
                    "API Key",
                    "inteligencia de mercado",
                    "todas las tiendas",
                ],
            },
        };
    }

    async assignPlanToUser(userId, planName) {
        if (!this.plans[planName]) {
            throw new Error("El plan no existe.");
        }

        // Crear una nueva suscripción
        const subscription = await this.subRepo.createSubscription({
            type: planName,
            price: this.plans[planName].price,
            features: this.plans[planName].features,
            maxSearchesPerMonth: this.plans[planName].maxSearchesPerMonth
        });

        // Asociar al usuario
        const updatedUser = await this.subRepo.attachSubscriptionToUser(
            userId,
            subscription._id
        );

        return {
            message: "Suscripción asignada",
            user: updatedUser,
        };
    }

    async upgradePlan(userId, newPlan) {
        const plan = this.plans[newPlan];
        if (!plan) throw new Error("Ese plan no existe.");

        const current = await this.getUserSubscription(userId);

        if (current?.type === newPlan) {
            throw new Error("El usuario ya tiene este plan.");
        }

        const updated = await this.subRepo.updateSubscription(current._id, {
            type: newPlan,
            price: plan.price,
            features: plan.features,
            maxSearchesPerMonth: plan.maxSearchesPerMonth
        });

        return { message: "Plan actualizado", subscription: updated };
    }

    async getUserSubscription(userId) {
        return this.subRepo.getUserSubscription(userId);
    }

    async checkMonthlyLimit(userId) {
        const subscription = await this.getUserSubscription(userId);

        // Si no tiene plan → modo FREE (5 búsquedas)
        if (!subscription) {
            const searches = await this.searchRepo.countSearchesThisMonth(userId);
            return {
                plan: "FREE",
                remaining: Math.max(0, 5 - searches),
                allowed: searches < 5
            };
        }

        const searches = await this.searchRepo.countSearchesThisMonth(userId);

        return {
            plan: subscription.type,
            remaining: Math.max(0, subscription.maxSearchesPerMonth - searches),
            allowed: searches < subscription.maxSearchesPerMonth
        };
    }
}

module.exports = SubscriptionService;
