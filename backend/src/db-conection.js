require('dotenv').config();

const { MongoClient } = require('mongodb');

const dbHost = process.env.MONGODB_HOST;
const dbPort = process.env.MONGODB_PORT;
const dbName = process.env.MONGODB_DB_NAME;

const uri = `mongodb://${dbHost}:${dbPort}`;
const client = new MongoClient(uri);

let db; // Instancia Singleton

// Conecta a la BD (llamar 1 vez)
async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`✅ Conectado a MongoDB (${dbName} en ${dbHost})`);
    } catch (e) {
        console.error("Falló la conexión a la base de datos", e);
        process.exit(1);
    }
}

// Obtiene la instancia de la BD
function getDb() {
    if (!db) {
        throw new Error("connectToDatabase() debe llamarse primero");
    }
    return db;
}

// Cierra la conexión (para pruebas)
async function closeDatabaseConnection() {
    try {
        await client.close();
        console.log("🔌 Conexión a MongoDB cerrada.");
    } catch (e) {
        console.error("Error cerrando la conexión", e);
    }
}

module.exports = {
    connectToDatabase,
    getDb,
    closeDatabaseConnection
};