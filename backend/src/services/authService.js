// services/authService.js
// Servicio encargado de autenticación y gestión de credenciales

const jwt = require("jsonwebtoken");
const UserRepository = require("../repositories/userRepo");

class AuthService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async register({ name, lastname, email, password }) { // <-- CAMBIO AQUÍ
        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new Error("El correo ya está registrado.");
        }

        const user = await this.userRepository.createUser({
            name,
            lastname, // <-- CAMBIO AQUÍ
            email,
            password
        });

        return {
            message: "Usuario registrado exitosamente",
            user
        };
    }

    async login(email, password) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) throw new Error("Credenciales inválidas.");

        const isMatch = await user.comparePassword(password);
        if (!isMatch) throw new Error("Credenciales inválidas.");

        const token = this.generateToken(user);

        return {
            message: "Login exitoso",
            token,
            user: {
                id: user._id,
                name: user.name,
                lastname: user.lastname, // <-- (Opcional) Devolverlo en el login
                email: user.email,
                role: user.role
            }
        };
    }

    generateToken(user) {
        const payload = {
            id: user._id,
            role: user.role
        };

        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });
    }

    async getProfile(userId) {
        return this.userRepository.findById(userId);
    }
}

module.exports = AuthService;
