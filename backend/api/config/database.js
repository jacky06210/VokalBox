// config/database.js
// Configuration et connexion à MySQL

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration du pool de connexions
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+00:00'
});

// Test de connexion
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connexion à MySQL réussie');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à MySQL:', error.message);
        return false;
    }
};

// Exécuter une requête
const query = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Erreur SQL:', error.message);
        throw error;
    }
};

// Obtenir une connexion du pool
const getConnection = async () => {
    return await pool.getConnection();
};

module.exports = {
    pool,
    query,
    getConnection,
    testConnection
};
