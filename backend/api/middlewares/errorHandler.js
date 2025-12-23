// middlewares/errorHandler.js
// Middleware de gestion centralisée des erreurs

const errorHandler = (err, req, res, next) => {
    console.error('❌ Erreur:', err);

    // Erreur de validation
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Erreur de validation',
            errors: err.errors
        });
    }

    // Erreur SQL
    if (err.code && err.code.startsWith('ER_')) {
        let message = 'Erreur de base de données';
        
        switch (err.code) {
            case 'ER_DUP_ENTRY':
                message = 'Cette entrée existe déjà';
                break;
            case 'ER_NO_REFERENCED_ROW_2':
                message = 'Référence invalide';
                break;
            case 'ER_BAD_FIELD_ERROR':
                message = 'Champ invalide';
                break;
        }

        return res.status(400).json({
            success: false,
            message,
            code: err.code
        });
    }

    // Erreur JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token invalide'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expiré'
        });
    }

    // Erreur Stripe
    if (err.type && err.type.startsWith('Stripe')) {
        return res.status(402).json({
            success: false,
            message: 'Erreur de paiement',
            details: err.message
        });
    }

    // Erreur par défaut
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Erreur serveur interne',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Middleware pour les routes non trouvées
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route non trouvée: ${req.method} ${req.originalUrl}`
    });
};

module.exports = {
    errorHandler,
    notFound
};
