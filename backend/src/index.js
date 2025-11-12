// backend/src/index.js

// 1. Carga de .env debe ser la PRIMERA línea
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const { spawn } = require('child_process');
const { join } = require('path');

// --- IMPORTACIONES DEL SERVIDOR (con require) ---
const express = require('express');

// --- CORRECCIÓN: La ruta correcta es './models/User' ---
const User = require('./models/User'); //

const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');
const reportRoutes = require('./routes/reportRoutes.js');
const searchRoutes = require('./routes/searchRoutes.js');
const subscriptionRoutes = require('./routes/subscriptionRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
// -----------------------------------------

// --- Lógica de Rutas (Spawn) ---
// Verifica que esta ruta sea correcta según tu estructura de carpetas
const announcerPath = join(__dirname, 'network/announcer/discovery-announcer.js');

// 'port' ahora leerá correctamente el .env
const port = process.env.PORT || 3000;

const announcer = spawn('node', [announcerPath, '--name', 'backend', '--port', port, '--secret', 'syntara'], { stdio: 'inherit' });


// --- Lógica de Base de Datos (Corregida) ---
async function connectDB() {
    try {
        // 2. Usamos las variables del .env (MONGODB_HOST, MONGODB_PORT, etc.)
        const uri = `mongodb://${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}`;

        console.log("🌐 Conectando a:", uri);

        // Opciones recomendadas para Mongoose
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };

        // 3. Conectamos Mongoose
        await mongoose.connect(uri, options);
        console.log("✅ Conectado exitosamente a MongoDB (con Mongoose)");
    } catch (err) {
        console.error("Error de conexión a MongoDB:", err.message);
        process.exit(1); // Cerramos la app si no hay BD
    }
}

// Llamamos a la función para que se conecte al arrancar
connectDB();

// --- SERVIDOR EXPRESS ---
// 6. ¡INICIALIZAR APP AQUÍ!
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());


app.use((req, res, next) => {
    console.log(`[CONEXIÓN FRONTEND] ${req.method} ${req.originalUrl}`);

    console.log('[REQ.BODY]:', req.body);

    next();
});
// ----------------------------------------------------

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);

// Ruta de prueba
app.get('/api', (req, res) => {
    res.send('¡El servidor API de Syntara está funcionando!');
});

// Ruta de Ping para el frontend (Solución 2)
app.get('/api/ping', (req, res) => {
    console.log('✅ ¡El frontend ha hecho PING!');
    res.status(200).send('pong');
});

// Ruta para probar la conexión a la BD
app.get('/api/db-status', (req, res) => {
    const state = mongoose.connection.readyState;
    let statusMessage = 'Desconocido';

    // Estados de Mongoose: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    switch (state) {
        case 0:
            statusMessage = 'Desconectado';
            break;
        case 1:
            statusMessage = '¡Conectado exitosamente!';
            break;
        case 2:
            statusMessage = 'Conectando...';
            break;
        case 3:
            statusMessage = 'Desconectando...';
            break;
    }
    res.json({
        connectionState: state,
        statusMessage: statusMessage
    });
});

module.exports = {
    User,
    // Subscription,
    // PriceRecord,
    // Search,
    // Report
};

// 8. Iniciar el servidor
const HOST = '0.0.0.0';
app.listen(port, HOST, () => {
    console.log(`🚀 Servidor HTTP corriendo en http://localhost:${port} (accesible en red local)`);
    console.log(`✅ Prueba la conexión de BD en: http://localhost:${port}/api/db-status`);
    console.log(`✅ Prueba el ping del frontend en: http://localhost:${port}/api/ping`);
});