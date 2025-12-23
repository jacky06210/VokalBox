// routes/menus.js
// Routes pour la gestion des menus et plats

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

/**
 * GET /api/menus/:restaurantId
 * Récupérer le menu complet d'un restaurant (public ou authentifié)
 */
router.get('/:restaurantId', async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        // Récupérer les catégories
        const categories = await query(
            `SELECT id, nom, description, ordre 
            FROM categories 
            WHERE restaurant_id = ? AND actif = TRUE 
            ORDER BY ordre ASC`,
            [restaurantId]
        );

        if (categories.length === 0) {
            return res.json({
                success: true,
                data: {
                    restaurant_id: restaurantId,
                    categories: []
                }
            });
        }

        // Pour chaque catégorie, récupérer les plats
        const menu = [];
        for (const category of categories) {
            const plats = await query(
                `SELECT id, nom, description, prix, prix_promo, en_promotion, disponible
                FROM plats 
                WHERE category_id = ? AND actif = TRUE
                ORDER BY id ASC`,
                [category.id]
            );

            menu.push({
                id: category.id,
                nom: category.nom,
                description: category.description,
                ordre: category.ordre,
                plats: plats.map(plat => ({
                    id: plat.id,
                    nom: plat.nom,
                    description: plat.description,
                    prix: plat.en_promotion && plat.prix_promo ? parseFloat(plat.prix_promo) : parseFloat(plat.prix),
                    prix_original: parseFloat(plat.prix),
                    en_promotion: Boolean(plat.en_promotion),
                    disponible: Boolean(plat.disponible)
                }))
            });
        }

        res.json({
            success: true,
            data: {
                restaurant_id: parseInt(restaurantId),
                categories: menu
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/menus/:restaurantId/categories
 * Créer une nouvelle catégorie (authentifié)
 */
router.post('/:restaurantId/categories', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { nom, description, ordre } = req.body;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        if (!nom) {
            return res.status(400).json({
                success: false,
                message: 'Le nom de la catégorie est requis'
            });
        }

        const result = await query(
            `INSERT INTO categories (restaurant_id, nom, description, ordre) 
            VALUES (?, ?, ?, ?)`,
            [restaurantId, nom, description || null, ordre || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Catégorie créée avec succès',
            data: {
                id: result.insertId,
                nom,
                description,
                ordre
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/menus/:restaurantId/plats
 * Créer un nouveau plat (authentifié)
 */
router.post('/:restaurantId/plats', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { category_id, nom, description, prix } = req.body;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        if (!category_id || !nom || !prix) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes (category_id, nom, prix requis)'
            });
        }

        // Vérifier que la catégorie appartient au restaurant
        const categories = await query(
            'SELECT id FROM categories WHERE id = ? AND restaurant_id = ?',
            [category_id, restaurantId]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Catégorie non trouvée'
            });
        }

        const result = await query(
            `INSERT INTO plats (category_id, nom, description, prix) 
            VALUES (?, ?, ?, ?)`,
            [category_id, nom, description || null, prix]
        );

        res.status(201).json({
            success: true,
            message: 'Plat créé avec succès',
            data: {
                id: result.insertId,
                category_id,
                nom,
                description,
                prix: parseFloat(prix)
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/menus/plats/:platId
 * Mettre à jour un plat (authentifié)
 */
router.put('/plats/:platId', authenticateToken, async (req, res, next) => {
    try {
        const { platId } = req.params;
        const { nom, description, prix, prix_promo, en_promotion, disponible } = req.body;

        // Vérifier que le plat appartient au restaurant
        const plats = await query(
            `SELECT p.id FROM plats p
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND c.restaurant_id = ?`,
            [platId, req.restaurantId]
        );

        if (plats.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plat non trouvé'
            });
        }

        const updates = [];
        const values = [];

        if (nom) {
            updates.push('nom = ?');
            values.push(nom);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (prix) {
            updates.push('prix = ?');
            values.push(prix);
        }
        if (prix_promo !== undefined) {
            updates.push('prix_promo = ?');
            values.push(prix_promo);
        }
        if (en_promotion !== undefined) {
            updates.push('en_promotion = ?');
            values.push(en_promotion ? 1 : 0);
        }
        if (disponible !== undefined) {
            updates.push('disponible = ?');
            values.push(disponible ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour'
            });
        }

        values.push(platId);

        await query(
            `UPDATE plats SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Plat mis à jour avec succès'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/menus/plats/:platId
 * Supprimer un plat (soft delete - met actif à FALSE)
 */
router.delete('/plats/:platId', authenticateToken, async (req, res, next) => {
    try {
        const { platId } = req.params;

        // Vérifier que le plat appartient au restaurant
        const plats = await query(
            `SELECT p.id FROM plats p
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND c.restaurant_id = ?`,
            [platId, req.restaurantId]
        );

        if (plats.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plat non trouvé'
            });
        }

        await query(
            'UPDATE plats SET actif = FALSE WHERE id = ?',
            [platId]
        );

        res.json({
            success: true,
            message: 'Plat supprimé avec succès'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/menus/:restaurantId/promotions
 * Récupérer les plats en promotion
 */
router.get('/:restaurantId/promotions', async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        const promos = await query(
            `SELECT p.id, p.nom, p.description, p.prix, p.prix_promo, c.nom as categorie
            FROM plats p
            JOIN categories c ON p.category_id = c.id
            WHERE c.restaurant_id = ? 
              AND p.en_promotion = TRUE 
              AND p.actif = TRUE
              AND p.disponible = TRUE
              AND (p.date_fin_promo IS NULL OR p.date_fin_promo > NOW())`,
            [restaurantId]
        );

        res.json({
            success: true,
            data: promos.map(p => ({
                id: p.id,
                nom: p.nom,
                description: p.description,
                prix_original: parseFloat(p.prix),
                prix_promo: parseFloat(p.prix_promo),
                economie: parseFloat(p.prix) - parseFloat(p.prix_promo),
                categorie: p.categorie
            }))
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
