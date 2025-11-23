// services/subscriptionService.js

const SubscriptionRepository = require("../repositories/subscriptionRepo");
const UserRepository = require("../repositories/userRepo");
const SearchRepository = require("../repositories/searchRepo");

class SubscriptionService {
    constructor() {
        this.subRepo = new SubscriptionRepository(); // [CORREGIDO] Instanciamos correctamente
        this.userRepo = new UserRepository();        // [CORREGIDO] Instanciamos correctamente
        this.searchRepo = SearchRepository;          // Este parece ser exportado ya instanciado en tu código original

        // Planes base del productos
        this.plans = {
            // [ELIMINADO] Plan Saver borrado por solicitud.

            Pro: {
                price: 18800,
                maxSearchesPerMonth: 2000,
                features: ["10 tiendas", "reportes", "favoritos"],
            },
            Enterprise: {
                price: 0, // [MODIFICADO] Ahora es costo 0 (se otorga tras contacto/comprobación)
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

        // Crear una nueva suscripción con los datos definidos en this.plans
        const subscription = await this.subRepo.createSubscription({
            type: planName,
            price: this.plans[planName].price,
            features: this.plans[planName].features,
            maxSearchesPerMonth: this.plans[planName].maxSearchesPerMonth
        });

        // Asociar al usuario (Esto NO cambia el rol, solo el campo 'subscription')
        const updatedUser = await this.subRepo.attachSubscriptionToUser(
            userId,
            subscription._id
        );

        return {
            message: "Suscripción asignada exitosamente",
            user: updatedUser,
        };
    }

    async upgradePlan(userId, newPlan) {
        const plan = this.plans[newPlan];
        if (!plan) throw new Error("Ese plan no existe.");

        const current = await this.getUserSubscription(userId);

        // Si el usuario no tiene suscripción previa, usamos assignPlanToUser
        if (!current) {
            return this.assignPlanToUser(userId, newPlan);
        }

        if (current.type === newPlan) {
            throw new Error("El usuario ya tiene este plan.");
        }

        // Actualizamos la suscripción existente con los nuevos valores (precio 0 si es Enterprise)
        const updated = await this.subRepo.updateSubscription(current._id, {
            type: newPlan,
            price: plan.price,
            features: plan.features,
            maxSearchesPerMonth: plan.maxSearchesPerMonth
        });

        return { message: "Plan actualizado correctamente", subscription: updated };
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