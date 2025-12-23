// routes/restaurants.js
// Routes pour la gestion des restaurants

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

/**
 * GET /api/restaurants/me
 * Récupérer les informations du restaurant connecté
 */
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const restaurants = await query(
            `SELECT id, nom_restaurant, adresse, code_postal, ville, telephone, email, 
                    horaires, telnyx_number, statut, date_debut_abonnement, date_fin_abonnement,
                    created_at, updated_at
            FROM restaurants 
            WHERE id = ?`,
            [req.restaurantId]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        res.json({
            success: true,
            data: restaurants[0]
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/restaurants/me
 * Mettre à jour les informations du restaurant
 */
router.put('/me', authenticateToken, async (req, res, next) => {
    try {
        const { nom_restaurant, adresse, code_postal, ville, telephone, horaires } = req.body;

        const updates = [];
        const values = [];

        if (nom_restaurant) {
            updates.push('nom_restaurant = ?');
            values.push(nom_restaurant);
        }
        if (adresse) {
            updates.push('adresse = ?');
            values.push(adresse);
        }
        if (code_postal) {
            updates.push('code_postal = ?');
            values.push(code_postal);
        }
        if (ville) {
            updates.push('ville = ?');
            values.push(ville);
        }
        if (telephone) {
            updates.push('telephone = ?');
            values.push(telephone);
        }
        if (horaires !== undefined) {
            updates.push('horaires = ?');
            values.push(horaires);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour'
            });
        }

        values.push(req.restaurantId);

        await query(
            `UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Restaurant mis à jour avec succès'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/restaurants/by-phone/:phone
 * Récupérer un restaurant par son numéro Telnyx (pour les appels)
 */
router.get('/by-phone/:phone', async (req, res, next) => {
    try {
        const { phone } = req.params;

        const restaurants = await query(
            `SELECT id, nom_restaurant, telephone, statut 
            FROM restaurants 
            WHERE telnyx_number = ? AND statut = 'actif'`,
            [phone]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé pour ce numéro'
            });
        }

        res.json({
            success: true,
            data: restaurants[0]
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/restaurants/upload-menu-photos
 * Upload des photos de menu (appelé après le paiement)
 */
router.post('/upload-menu-photos', authenticateToken, async (req, res, next) => {
    try {
        const { photos } = req.body; // Array de base64 ou URLs

        if (!photos || !Array.isArray(photos) || photos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune photo fournie'
            });
        }

        // Enregistrer les photos en base
        const photoRecords = [];
        for (const photo of photos) {
            const result = await query(
                `INSERT INTO menu_photos 
                (restaurant_id, filename, filepath, filesize, mime_type, statut) 
                VALUES (?, ?, ?, ?, ?, 'en_attente')`,
                [
                    req.restaurantId,
                    photo.filename || 'menu.jpg',
                    photo.filepath || photo.data, // Peut être une URL ou base64
                    photo.size || 0,
                    photo.type || 'image/jpeg'
                ]
            );

            photoRecords.push({
                id: result.insertId,
                filename: photo.filename
            });
        }

        // Mettre à jour le statut du restaurant
        await query(
            `UPDATE restaurants SET statut = 'attente_numerisation' WHERE id = ?`,
            [req.restaurantId]
        );

        res.json({
            success: true,
            message: 'Photos uploadées avec succès',
            data: {
                photos: photoRecords,
                nextStep: 'numerisation'
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/restaurants/:id/status
 * Vérifier le statut de numérisation du menu
 */
router.get('/:id/status', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(id) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const restaurants = await query(
            'SELECT statut FROM restaurants WHERE id = ?',
            [id]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        // Vérifier le statut des photos
        const photos = await query(
            'SELECT COUNT(*) as total, statut FROM menu_photos WHERE restaurant_id = ? GROUP BY statut',
            [id]
        );

        res.json({
            success: true,
            data: {
                statut: restaurants[0].statut,
                photos: photos
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
