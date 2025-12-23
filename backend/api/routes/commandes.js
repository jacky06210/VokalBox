// routes/commandes.js
// Routes pour la gestion des commandes

const express = require('express');
const router = express.Router();
const { query, getConnection } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');

/**
 * POST /api/commandes
 * Créer une nouvelle commande (depuis Telnyx ou autre)
 */
router.post('/', optionalAuth, async (req, res, next) => {
    const connection = await getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            restaurant_id,
            nom_client,
            telephone_client,
            email_client,
            mode_retrait,
            items, // Array de {plat_id, quantite, notes}
            notes,
            telnyx_call_id
        } = req.body;

        // Validation
        if (!restaurant_id || !telephone_client || !items || items.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Données manquantes (restaurant_id, telephone_client, items requis)'
            });
        }

        // Calculer les montants
        let montant_ht = 0;
        const commandeItems = [];

        for (const item of items) {
            // Récupérer le prix du plat
            const [plats] = await connection.execute(
                `SELECT p.id, p.nom, p.prix, p.prix_promo, p.en_promotion
                FROM plats p
                JOIN categories c ON p.category_id = c.id
                WHERE p.id = ? AND c.restaurant_id = ? AND p.actif = TRUE`,
                [item.plat_id, restaurant_id]
            );

            if (plats.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: `Plat ${item.plat_id} non trouvé`
                });
            }

            const plat = plats[0];
            const prix_unitaire = plat.en_promotion && plat.prix_promo 
                ? parseFloat(plat.prix_promo) 
                : parseFloat(plat.prix);
            const total = prix_unitaire * item.quantite;

            montant_ht += total;

            commandeItems.push({
                plat_id: plat.id,
                nom_plat: plat.nom,
                prix_unitaire,
                quantite: item.quantite,
                total,
                notes: item.notes || null
            });
        }

        // TVA 10% (restauration)
        const montant_tva = montant_ht * 0.10;
        const montant_ttc = montant_ht + montant_tva;

        // Créer la commande
        const [commandeResult] = await connection.execute(
            `INSERT INTO commandes 
            (restaurant_id, nom_client, telephone_client, email_client, mode_retrait, 
             montant_ht, montant_tva, montant_ttc, notes, telnyx_call_id, statut) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nouvelle')`,
            [
                restaurant_id,
                nom_client || 'Client',
                telephone_client,
                email_client || null,
                mode_retrait || 'emporter',
                montant_ht.toFixed(2),
                montant_tva.toFixed(2),
                montant_ttc.toFixed(2),
                notes || null,
                telnyx_call_id || null
            ]
        );

        const commande_id = commandeResult.insertId;

        // Ajouter les items
        for (const item of commandeItems) {
            await connection.execute(
                `INSERT INTO commande_items 
                (commande_id, plat_id, nom_plat, prix_unitaire, quantite, total, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    commande_id,
                    item.plat_id,
                    item.nom_plat,
                    item.prix_unitaire,
                    item.quantite,
                    item.total,
                    item.notes
                ]
            );
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: {
                commande_id,
                restaurant_id,
                montant_ht: parseFloat(montant_ht.toFixed(2)),
                montant_tva: parseFloat(montant_tva.toFixed(2)),
                montant_ttc: parseFloat(montant_ttc.toFixed(2)),
                items: commandeItems,
                statut: 'nouvelle'
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        next(error);
    }
});

/**
 * GET /api/commandes/:restaurantId
 * Récupérer les commandes d'un restaurant (authentifié)
 */
router.get('/:restaurantId', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { statut, date, limit = 50 } = req.query;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        let sql = `SELECT * FROM commandes WHERE restaurant_id = ?`;
        const params = [restaurantId];

        if (statut) {
            sql += ` AND statut = ?`;
            params.push(statut);
        }

        if (date) {
            sql += ` AND DATE(created_at) = ?`;
            params.push(date);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        const commandes = await query(sql, params);

        // Pour chaque commande, récupérer les items
        for (let commande of commandes) {
            const items = await query(
                'SELECT * FROM commande_items WHERE commande_id = ?',
                [commande.id]
            );
            commande.items = items;
        }

        res.json({
            success: true,
            data: commandes
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/commandes/:restaurantId/today
 * Récupérer les commandes du jour
 */
router.get('/:restaurantId/today', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const commandes = await query(
            `SELECT * FROM commandes 
            WHERE restaurant_id = ? 
              AND DATE(created_at) = CURDATE()
              AND statut != 'annulee'
            ORDER BY created_at DESC`,
            [restaurantId]
        );

        // Pour chaque commande, récupérer les items
        for (let commande of commandes) {
            const items = await query(
                'SELECT * FROM commande_items WHERE commande_id = ?',
                [commande.id]
            );
            commande.items = items;
        }

        res.json({
            success: true,
            data: commandes
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/commandes/detail/:commandeId
 * Récupérer le détail d'une commande
 */
router.get('/detail/:commandeId', authenticateToken, async (req, res, next) => {
    try {
        const { commandeId } = req.params;

        const commandes = await query(
            `SELECT c.* FROM commandes c
            WHERE c.id = ? AND c.restaurant_id = ?`,
            [commandeId, req.restaurantId]
        );

        if (commandes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        const commande = commandes[0];

        // Récupérer les items
        const items = await query(
            'SELECT * FROM commande_items WHERE commande_id = ?',
            [commandeId]
        );

        commande.items = items;

        res.json({
            success: true,
            data: commande
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/commandes/:commandeId/status
 * Changer le statut d'une commande
 */
router.patch('/:commandeId/status', authenticateToken, async (req, res, next) => {
    try {
        const { commandeId } = req.params;
        const { statut } = req.body;

        const validStatuts = ['nouvelle', 'en_preparation', 'prete', 'livree', 'recuperee', 'annulee'];
        if (!validStatuts.includes(statut)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        // Vérifier que la commande appartient au restaurant
        const commandes = await query(
            'SELECT id FROM commandes WHERE id = ? AND restaurant_id = ?',
            [commandeId, req.restaurantId]
        );

        if (commandes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        // Mettre à jour le statut et les timestamps
        let timeField = null;
        if (statut === 'en_preparation') timeField = 'heure_preparation';
        if (statut === 'prete') timeField = 'heure_prete';
        if (statut === 'livree' || statut === 'recuperee') timeField = 'heure_livree';

        let sql = 'UPDATE commandes SET statut = ?';
        const params = [statut];

        if (timeField) {
            sql += `, ${timeField} = NOW()`;
        }

        sql += ' WHERE id = ?';
        params.push(commandeId);

        await query(sql, params);

        res.json({
            success: true,
            message: 'Statut mis à jour avec succès'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/commandes/panier/create
 * Créer un panier temporaire (pendant l'appel Telnyx)
 */
router.post('/panier/create', async (req, res, next) => {
    try {
        const { restaurant_id, telephone_client, session_id } = req.body;

        if (!restaurant_id || !session_id) {
            return res.status(400).json({
                success: false,
                message: 'restaurant_id et session_id requis'
            });
        }

        // Expiration dans 30 minutes
        const expire_at = new Date();
        expire_at.setMinutes(expire_at.getMinutes() + 30);

        const result = await query(
            `INSERT INTO paniers (session_id, restaurant_id, telephone_client, items, expire_at) 
            VALUES (?, ?, ?, '[]', ?)`,
            [session_id, restaurant_id, telephone_client || null, expire_at]
        );

        res.status(201).json({
            success: true,
            data: {
                panier_id: result.insertId,
                session_id,
                expire_at
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/commandes/panier/:sessionId/add
 * Ajouter un item au panier
 */
router.post('/panier/:sessionId/add', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { plat_id, quantite } = req.body;

        // Récupérer le panier
        const paniers = await query(
            'SELECT * FROM paniers WHERE session_id = ? AND expire_at > NOW()',
            [sessionId]
        );

        if (paniers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Panier non trouvé ou expiré'
            });
        }

        const panier = paniers[0];
        let items = JSON.parse(panier.items || '[]');

        // Ajouter ou mettre à jour l'item
        const existingIndex = items.findIndex(i => i.plat_id === plat_id);
        if (existingIndex >= 0) {
            items[existingIndex].quantite += quantite;
        } else {
            items.push({ plat_id, quantite });
        }

        await query(
            'UPDATE paniers SET items = ? WHERE session_id = ?',
            [JSON.stringify(items), sessionId]
        );

        res.json({
            success: true,
            message: 'Item ajouté au panier',
            data: { items }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
