// src/services/userService.js

const { UserModel } = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class UserService {

    /**
     * Registrar un nuevo usuario
     */
    async register({ name, lastname, email, password }) { // <-- CAMBIO AQUÍ
        const existing = await UserModel.findOne({ email });
        if (existing) {
            throw new Error("El correo ya está registrado");
        }

        const user = new UserModel({ name, lastname, email, password }); // <-- CAMBIO AQUÍ
        await user.save();

        return {
            id: user._id,
            name: user.name,
            lastname: user.lastname, // <-- CAMBIO AQUÍ
            email: user.email,
        };
    }

    /**
     * Iniciar sesión
     */
    async login({ email, password }) {
        const user = await UserModel.findOne({ email });
        if (!user) throw new Error("Usuario no encontrado");

        const matches = await user.comparePassword(password);
        if (!matches) throw new Error("Contraseña incorrecta");

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                lastname: user.lastname, // <-- CAMBIO AQUÍ
                email: user.email,
                role: user.role,
            },
        };
    }

    /**
     * Obtener perfil
     */
    async getProfile(userId) {
        // .populate("subscription") ya estaba, lo cual es correcto.
        const user = await UserModel.findById(userId).populate("subscription");
        if (!user) throw new Error("Usuario no encontrado");

        return user;
    }

    /**
     * Actualizar datos de usuario
     */
    async updateUser(userId, data) {
        const updated = await UserModel.findByIdAndUpdate(
            userId,
            data,
            { new: true }
        );

        return updated;
    }

    /**
     * Asignar suscripción a un usuario
     */
    async assignSubscription(userId, subscriptionId) {
        return UserModel.findByIdAndUpdate(
            userId,
            { subscription: subscriptionId },
            { new: true }
        );
    }
}

module.exports = new UserService();