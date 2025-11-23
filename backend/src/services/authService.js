// services/authService.js
// Servicio encargado de autenticación y gestión de credenciales

const jwt = require("jsonwebtoken");
const UserRepository = require("../repositories/userRepo");
// services/authService.js

// ... (imports)

class AuthService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async register({ name, lastname, email, password }) {

        console.log("[DEBUG] Iniciando authService.register..."); // <-- AÑADE ESTO

        const existing = await this.userRepository.findByEmail(email);

        console.log("[DEBUG] findByEmail completado."); // <-- AÑADE ESTO

        if (existing) {
            console.log("[DEBUG] El usuario ya existe."); // <-- AÑADE ESTO
            throw new Error("El correo ya está registrado.");
        }

        console.log("[DEBUG] Creando usuario en el repo..."); // <-- AÑADE ESTO

        const user = await this.userRepository.createUser({
            name,
            lastname,
            email,
            password
        });

        console.log("[DEBUG] Usuario creado exitosamente en el repo."); // <-- AÑADE ESTO

        return {
            message: "Usuario registrado exitosamente",
            user
        };
    }

    // ... (resto del archivo)

    // services/authService.js

// ... (imports y clase) ...

    async login(email, password) {
        try { // <--- AÑADE UN TRY/CATCH AQUÍ DENTRO
            console.log(`[DEBUG LOGIN] Buscando usuario: ${email}`);
            console.log(`[DEBUG LOGIN] Contraseña recibida (plain): ${password}`);

            const user = await this.userRepository.findByEmail(email);

            if (!user) {
                console.log("[DEBUG LOGIN] ERROR: Usuario no encontrado.");
                throw new Error("Credenciales inválidas.");
            }

            console.log(`[DEBUG LOGIN] Usuario encontrado. Hash en BD: ${user.password}`);

            const isMatch = await user.comparePassword(password);

            if (!isMatch) {
                console.log("[DEBUG LOGIN] ERROR: La comparación de bcrypt falló (isMatch: false).");
                throw new Error("Credenciales inválidas.");
            }

            console.log("[DEBUG LOGIN] ¡Login exitoso! Generando token.");
            const token = this.generateToken(user);

            const hasActiveSubscription = !!user.subscription;

            return {
                message: "Login exitoso",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    role: user.role,
                    isSubscribed: hasActiveSubscription
                }
            };
        } catch (err) {
            // Re-lanzamos el error para que el controlador lo atrape
            throw err;
        }
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

module.exports = new AuthService();