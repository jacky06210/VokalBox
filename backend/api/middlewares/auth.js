// middlewares/auth.js
// Middleware d'authentification JWT

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Vérifier le token JWT
const authenticateToken = async (req, res, next) => {
    try {
        // Récupérer le token depuis le header Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token d\'authentification requis'
            });
        }

        // Vérifier le token
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token invalide ou expiré'
                });
            }

            // Vérifier que le restaurant existe et est actif
            const restaurant = await query(
                'SELECT id, nom_restaurant, email, statut FROM restaurants WHERE id = ? AND statut IN ("actif", "attente_numerisation")',
                [decoded.restaurantId]
            );

            if (!restaurant || restaurant.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Restaurant non trouvé ou inactif'
                });
            }

            // Ajouter les infos du restaurant à la requête
            req.restaurant = restaurant[0];
            req.restaurantId = decoded.restaurantId;
            
            next();
        });
    } catch (error) {
        console.error('Erreur authentification:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'authentification'
        });
    }
};

// Middleware optionnel : authentification ou accès public
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const restaurant = await query(
            'SELECT id, nom_restaurant, email FROM restaurants WHERE id = ?',
            [decoded.restaurantId]
        );

        if (restaurant && restaurant.length > 0) {
            req.restaurant = restaurant[0];
            req.restaurantId = decoded.restaurantId;
        }
    } catch (error) {
        // Token invalide mais on continue quand même
    }

    next();
};

// Générer un token JWT
const generateToken = (restaurantId) => {
    return jwt.sign(
        { restaurantId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token valide 7 jours
    );
};

// Générer un refresh token
const generateRefreshToken = (restaurantId) => {
    return jwt.sign(
        { restaurantId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Refresh token valide 30 jours
    );
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    generateRefreshToken
};
