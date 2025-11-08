const mongoose = require("mongoose");
const dotenv = require("dotenv");
const axios = require("axios");
const { spawn } = require('child_process');
const { join } = require('path');

// --- IMPORTACIONES DEL SERVIDOR (con require) ---
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');
const reportRoutes = require('./routes/reportRoutes.js');
const searchRoutes = require('./routes/searchRoutes.js');
const subscriptionRoutes = require('./routes/subscriptionRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
// -----------------------------------------

// --- Lógica de Rutas (Spawn) ---
// No necesitamos fileURLToPath con CommonJS, __dirname ya existe
const announcerPath = join(__dirname, 'network/announcer/discovery-announcer.js');

const port = process.env.PORT || 3000;

const announcer = spawn('node', [announcerPath, '--name', 'backend', '--port', port, '--secret', 'syntara'], { stdio: 'inherit' });

dotenv.config();

// --- Lógica de Base de Datos ---
async function connectDB() {
    try {
        const response = await axios.get("http://10.195.48.125.25:4000/ip");
        const mongoIP = response.data.ip;
        const encodedPass = encodeURIComponent(process.env.MONGO_PASS);

        const uri = `mongodb://${process.env.MONGO_USER}:${encodedPass}@${mongoIP}:27017/${process.env.MONGO_DB}?authSource=admin`;

        console.log("🌐 Conectando a:", uri);

        await mongoose.connect(uri);
        console.log("✅ Conectado exitosamente a MongoDB remoto");
    } catch (err) {
        console.error("Error de conexión a MongoDB:", err);
    }
}

connectDB();

// --- SERVIDOR EXPRESS ---
const app = express();

// Middlewares
app.use(cors()); // Permite conexiones desde otros dominios (tu frontend)
app.use(express.json()); // Permite al servidor entender JSON

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);

// Ruta de prueba
app.get('/api', (req, res) => {
    res.send('¡El servidor API de Syntara está funcionando!');
});

// Ponemos el servidor a escuchar en TODAS las interfaces de red (0.0.0.0)
// en el puerto 3000. Esto es CLAVE para la conexión en red local.
const HOST = '0.0.0.0';
app.listen(port, HOST, () => {
    console.log(`🚀 Servidor HTTP corriendo en http://localhost:${port} (accesible en red local)`);
});
// -------------------------------