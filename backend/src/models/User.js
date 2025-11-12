// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. Definimos el Esquema (Schema) con Mongoose
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        lastname: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            // Validación simple de email (Mongoose no tiene un 'isEmail' tan directo como Sequelize)
            match: [/.+\@.+\..+/, 'Por favor ingrese un email válido'],
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: 'sin suscripcion', // Valor por defecto
        },
    },
    {
        // Esto añade createdAt y updatedAt automáticamente
        timestamps: true,
    }
);

// 2. Usamos un 'hook' de Mongoose (pre-save) para encriptar la contraseña
// Esto se ejecuta ANTES de que un documento 'User' se guarde
userSchema.pre('save', async function (next) {
    // Solo encripta la contraseña si ha sido modificada (o es nueva)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// 3. Creamos y exportamos el Modelo
// Mongoose usará el string 'User' para crear una colección llamada 'users' en MongoDB
const User = mongoose.model('User', userSchema);

module.exports = User;