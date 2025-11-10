const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../db-conection'); // Asegúrate que la ruta a tu conexión sequelize sea correcta

class User extends Model {
    // ... (tus otros métodos de instancia si tienes)
}

User.init(
    {
        // Definición de las columnas
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastname: { // <-- Corregido para que coincida con lo que espera el frontend
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'sin suscripcion', // Valor por defecto
        },
        createdAt: { // Sequelize maneja esto, pero si lo tienes explícito...
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: 'User',
        hooks: {
            // ESTE ES EL HOOK CORRECTO Y ÚNICO
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    }
);

// ¡ELIMINADO! Ya no hay un User.beforeCreate duplicado aquí.

module.exports = User;