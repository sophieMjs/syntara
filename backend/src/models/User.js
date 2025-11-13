// User.js
// Clase de dominio + esquema / modelo Mongoose para usuarios

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//
// Clase de dominio (lógica de negocio simple)
//
class UserEntity {
    constructor({ name, lastname, email, password, role = 'user', createdAt = new Date() } = {}) {
        this.name = name;
        this.lastname = lastname; // <-- AÑADIDO
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = createdAt;
    }

    // Lógica de negocio: saludo
    greet() {
        return `Hola ${this.name}, bienvenido a Syntara`;
    }


    // Comparar contraseña
    async comparePassword(plain) {
        return bcrypt.compare(plain, this.password);
    }
}

//
// Mongoose Schema & Model
//
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true }, // <-- AÑADIDO
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    createdAt: { type: Date, default: Date.now }
});

// Pre-save: asegurar password hasheada
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Instance method (si quieres usar desde doc)
userSchema.methods.comparePassword = async function (plain) {
    return bcrypt.compare(plain, this.password);
};

const UserModel = mongoose.model('User', userSchema);

module.exports = { UserEntity, UserModel };