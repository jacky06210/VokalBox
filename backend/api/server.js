// server.js
// Serveur principal VokalBoxAPI

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

// Import des routes
const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const menuRoutes = require('./routes/menus');
const commandeRoutes = require('./routes/commandes');
const stripeRoutes = require('./routes/stripe');
const telnyxRoutes = require('./routes/telnyx');
const statsRoutes = require('./routes/stats');

// Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARES GLOBAUX
// =====================================================

// Sécurité
app.use(helmet());

// CORS - Autoriser les requêtes depuis le frontend
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        process.env.DASHBOARD_URL,
        'http://localhost:3000',
        'http://localhost:5173',
        'https://vokalbox.fr',
        'https://dashboard.vokalbox.fr',
        'https://api.vokalbox.fr'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression des réponses
app.use(compression());

// Parser JSON et URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logs des requêtes (seulement en dev)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting - Protection contre les abus
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requêtes max
    message: {
        success: false,
        message: 'Trop de requêtes, veuillez réessayer plus tard'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Appliquer le rate limiting sur toutes les routes sauf les webhooks
app.use('/api/', limiter);

// =====================================================
// ROUTES
// =====================================================

// Route de santé (health check)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'VokalBoxAPI est en ligne',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Bienvenue sur VokalBoxAPI',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            restaurants: '/api/restaurants',
            menus: '/api/menus',
            commandes: '/api/commandes',
            stats: '/api/stats',
            stripe: '/webhooks/stripe',
            telnyx: '/webhooks/telnyx'
        }
    });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/commandes', commandeRoutes);
app.use('/api/stats', statsRoutes);

// Webhooks (sans rate limiting)
app.use('/webhooks/stripe', stripeRoutes);
app.use('/webhooks/telnyx', telnyxRoutes);

// =====================================================
// GESTION DES ERREURS
// =====================================================

// Route non trouvée
app.use(notFound);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

const startServer = async () => {
    try {
        // Tester la connexion à la base de données
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Impossible de démarrer sans connexion à la base de données');
            process.exit(1);
        }

        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log('');
            console.log('╔═══════════════════════════════════════════════╗');
            console.log('║                                               ║');
            console.log('║        🎙️  VOKALBOX API v1.0.0               ║');
            console.log('║                                               ║');
            console.log('╚═══════════════════════════════════════════════╝');
            console.log('');
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Base de données: ${process.env.DB_NAME}`);
            console.log('');
            console.log('📋 Routes disponibles:');
            console.log('   GET  /health');
            console.log('   POST /api/auth/login');
            console.log('   POST /api/auth/register');
            console.log('   GET  /api/restaurants');
            console.log('   GET  /api/menus/:restaurantId');
            console.log('   POST /api/commandes');
            console.log('   GET  /api/stats/:restaurantId');
            console.log('   POST /webhooks/stripe');
            console.log('   POST /webhooks/telnyx');
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erreur au démarrage du serveur:', error);
        process.exit(1);
    }
};

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('❌ Erreur non gérée:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Exception non capturée:', err);
    process.exit(1);
});

// Démarrer le serveur
startServer();

module.exports = app;
