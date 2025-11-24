
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");

const express = require('express');
const cors = require('cors');

const User = require('./models/User');
const { CartEntity, CartModel } = require('./models/Cart.js');

const authRoutes = require('./routes/authRoutes.js');
const reportRoutes = require('./routes/reportRoutes.js');
const searchRoutes = require('./routes/searchRoutes.js');
const subscriptionRoutes = require('./routes/subscriptionRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const cartRoutes = require('./routes/cartRoutes.js');

const port = process.env.PORT || 3000;

async function connectDB() {
    try {
        const uri = `mongodb://${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}`;

        console.log(" Conectando a:", uri);

        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };

        await mongoose.connect(uri, options);
        console.log(" Conectado exitosamente a MongoDB (con Mongoose)");
    } catch (err) {
        console.error("Error de conexión a MongoDB:", err.message);
        process.exit(1);
    }
}

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[CONEXIÓN FRONTEND] ${req.method} ${req.originalUrl}`);
    next();
});


app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);

app.get('/api', (req, res) => {
    res.send('¡El servidor API de Syntara está funcionando!');
});

app.get('/api/ping', (req, res) => {
    console.log(' ¡El frontend ha hecho PING!');
    res.status(200).send('pong');
});

app.get('/api/db-status', (req, res) => {
    const state = mongoose.connection.readyState;
    let statusMessage = 'Desconocido';

    switch (state) {
        case 0: statusMessage = 'Desconectado'; break;
        case 1: statusMessage = '¡Conectado exitosamente!'; break;
        case 2: statusMessage = 'Conectando...'; break;
        case 3: statusMessage = 'Desconectando...'; break;
    }
    res.json({ connectionState: state, statusMessage: statusMessage });
});

module.exports = {
    User,
    CartEntity,
    CartModel
};

const HOST = '0.0.0.0';
app.listen(port, HOST, () => {
    console.log(` Servidor HTTP corriendo en http://localhost:${port} (accesible en red local)`);
    console.log(` Prueba la conexión de BD en: http://localhost:${port}/api/db-status`);
    console.log(` Prueba el ping del frontend en: http://localhost:${port}/api/ping`);
});