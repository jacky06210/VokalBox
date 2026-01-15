/**
 * CONTRÔLEUR VOCAL
 * Gestion des interactions vocales avec Telnyx
 */

const mysql = require('mysql2/promise');
const smsService = require('../utils/smsService');

// Pool de connexions MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Récupérer le menu formaté pour la lecture vocale
 */
exports.getMenuForVoice = async (req, res) => {
    try {
        const { apiKey } = req.params;

        // Récupérer le restaurant
        const [restaurants] = await pool.execute(
            'SELECT id, nom FROM restaurants WHERE api_key = ?',
            [apiKey]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        const restaurant = restaurants[0];

        // Récupérer les catégories et plats
        const [categories] = await pool.execute(
            'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY ordre',
            [restaurant.id]
        );

        const menuFormate = {
            restaurantId: restaurant.id,
            restaurantNom: restaurant.nom,
            categories: []
        };

        for (const categorie of categories) {
            const [plats] = await pool.execute(
                'SELECT id, nom, description, prix, disponible FROM plats WHERE categorie_id = ? ORDER BY ordre',
                [categorie.id]
            );

            const platsDisponibles = plats.filter(p => p.disponible);

            if (platsDisponibles.length > 0) {
                menuFormate.categories.push({
                    nom: categorie.nom,
                    plats: platsDisponibles.map(p => ({
                        id: p.id,
                        nom: p.nom,
                        description: p.description,
                        prix: parseFloat(p.prix),
                        prixVocal: `${parseFloat(p.prix).toFixed(2).replace('.', ' euros ')} centimes`
                    }))
                });
            }
        }

        res.json({
            success: true,
            data: menuFormate
        });

    } catch (error) {
        console.error('Erreur menu vocal:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du menu',
            error: error.message
        });
    }
};

/**
 * Créer une commande depuis l'appel téléphonique
 */
exports.createVoiceOrder = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            apiKey,
            clientNom,
            clientTelephone,
            items
        } = req.body;

        // Récupérer le restaurant
        const [restaurants] = await connection.execute(
            'SELECT id FROM restaurants WHERE api_key = ?',
            [apiKey]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        const restaurantId = restaurants[0].id;

        // Validation
        if (!clientNom || !clientTelephone || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes'
            });
        }

        // Calculer le montant total
        const montantTotal = items.reduce((sum, item) => {
            return sum + (item.prixUnitaire * item.quantite);
        }, 0);

        // Générer numéro de commande
        const [lastOrder] = await connection.execute(
            'SELECT MAX(id) as lastId FROM commandes WHERE restaurant_id = ?',
            [restaurantId]
        );
        const orderNumber = `CMD-${String((lastOrder[0].lastId || 0) + 1).padStart(6, '0')}`;

        // Insérer la commande
        const [result] = await connection.execute(
            `INSERT INTO commandes (
                restaurant_id, numero_commande, client_nom, client_telephone,
                montant_total, statut, type_commande, source
            ) VALUES (?, ?, ?, ?, ?, 'en_attente', 'emporter', 'telephone')`,
            [restaurantId, orderNumber, clientNom, clientTelephone, montantTotal]
        );

        const commandeId = result.insertId;

        // Insérer les items
        for (const item of items) {
            await connection.execute(
                `INSERT INTO commande_items (commande_id, plat_id, quantite, prix_unitaire)
                 VALUES (?, ?, ?, ?)`,
                [commandeId, item.platId, item.quantite, item.prixUnitaire]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Commande créée',
            data: {
                commandeId,
                numeroCommande: orderNumber,
                montantTotal
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur commande vocale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la commande',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Envoyer un SMS de confirmation
 */
exports.sendConfirmationSMS = async (req, res) => {
    try {
        const { telephone, numeroCommande, montantTotal, restaurantNom } = req.body;

        if (!telephone || !numeroCommande) {
            return res.status(400).json({
                success: false,
                message: 'Téléphone et numéro de commande requis'
            });
        }

        const message = `${restaurantNom || 'VocalBox'}: Votre commande ${numeroCommande} de ${montantTotal}€ est confirmée. Merci !`;

        await smsService.sendSMS(telephone, message);

        res.json({
            success: true,
            message: 'SMS envoyé'
        });

    } catch (error) {
        console.error('Erreur envoi SMS:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du SMS',
            error: error.message
        });
    }
};

/**
 * Vérifier la disponibilité d'un plat
 */
exports.checkDisponibilite = async (req, res) => {
    try {
        const { platId } = req.params;

        const [plats] = await pool.execute(
            'SELECT disponible FROM plats WHERE id = ?',
            [platId]
        );

        if (plats.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plat non trouvé'
            });
        }

        res.json({
            success: true,
            disponible: plats[0].disponible === 1
        });

    } catch (error) {
        console.error('Erreur vérification disponibilité:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification',
            error: error.message
        });
    }
};
