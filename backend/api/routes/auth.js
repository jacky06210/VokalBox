// routes/auth.js
// Routes d'authentification

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middlewares/auth');

/**
 * POST /api/auth/register
 * Inscription d'un nouveau restaurant (après paiement Stripe)
 */
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, nom_restaurant, telephone, adresse, code_postal, ville } = req.body;

        // Validation
        if (!email || !password || !nom_restaurant || !telephone) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes'
            });
        }

        // Vérifier si l'email existe déjà
        const existing = await query(
            'SELECT id FROM restaurants WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Créer le restaurant
        const result = await query(
            `INSERT INTO restaurants 
            (nom_restaurant, adresse, code_postal, ville, telephone, email, password_hash, statut) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'attente_paiement')`,
            [nom_restaurant, adresse, code_postal, ville, telephone, email, passwordHash]
        );

        const restaurantId = result.insertId;

        // Générer les tokens
        const token = generateToken(restaurantId);
        const refreshToken = generateRefreshToken(restaurantId);

        res.status(201).json({
            success: true,
            message: 'Restaurant créé avec succès',
            data: {
                restaurantId,
                token,
                refreshToken
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/login
 * Connexion d'un restaurant
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        // Récupérer le restaurant
        const restaurants = await query(
            `SELECT id, nom_restaurant, email, password_hash, statut 
            FROM restaurants 
            WHERE email = ?`,
            [email]
        );

        if (restaurants.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        const restaurant = restaurants[0];

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, restaurant.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier le statut
        if (restaurant.statut === 'suspendu' || restaurant.statut === 'resilie') {
            return res.status(403).json({
                success: false,
                message: 'Compte suspendu ou résilié. Contactez le support.'
            });
        }

        // Générer les tokens
        const token = generateToken(restaurant.id);
        const refreshToken = generateRefreshToken(restaurant.id);

        res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
                restaurantId: restaurant.id,
                nom_restaurant: restaurant.nom_restaurant,
                email: restaurant.email,
                statut: restaurant.statut,
                token,
                refreshToken
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/refresh
 * Rafraîchir le token JWT
 */
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token requis'
            });
        }

        // Vérifier le refresh token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        if (decoded.type !== 'refresh') {
            return res.status(403).json({
                success: false,
                message: 'Token invalide'
            });
        }

        // Générer un nouveau token
        const newToken = generateToken(decoded.restaurantId);

        res.json({
            success: true,
            data: {
                token: newToken
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
