// routes/stats.js
// Routes pour les statistiques

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

/**
 * GET /api/stats/:restaurantId
 * Statistiques globales du restaurant
 */
router.get('/:restaurantId', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        // CA du jour
        const [caJour] = await query(
            `SELECT 
                COUNT(*) as commandes_jour,
                COALESCE(SUM(montant_ttc), 0) as ca_jour,
                COALESCE(AVG(montant_ttc), 0) as panier_moyen_jour
            FROM commandes 
            WHERE restaurant_id = ? 
              AND DATE(created_at) = CURDATE()
              AND statut != 'annulee'`,
            [restaurantId]
        );

        // CA de la semaine
        const [caSemaine] = await query(
            `SELECT 
                COUNT(*) as commandes_semaine,
                COALESCE(SUM(montant_ttc), 0) as ca_semaine
            FROM commandes 
            WHERE restaurant_id = ? 
              AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
              AND statut != 'annulee'`,
            [restaurantId]
        );

        // CA du mois
        const [caMois] = await query(
            `SELECT 
                COUNT(*) as commandes_mois,
                COALESCE(SUM(montant_ttc), 0) as ca_mois
            FROM commandes 
            WHERE restaurant_id = ? 
              AND YEAR(created_at) = YEAR(CURDATE())
              AND MONTH(created_at) = MONTH(CURDATE())
              AND statut != 'annulee'`,
            [restaurantId]
        );

        // Commandes en attente
        const [commandesEnAttente] = await query(
            `SELECT COUNT(*) as en_attente
            FROM commandes 
            WHERE restaurant_id = ? 
              AND statut IN ('nouvelle', 'en_preparation')`,
            [restaurantId]
        );

        res.json({
            success: true,
            data: {
                aujourd_hui: {
                    commandes: caJour[0].commandes_jour,
                    ca: parseFloat(caJour[0].ca_jour),
                    panier_moyen: parseFloat(caJour[0].panier_moyen_jour)
                },
                semaine: {
                    commandes: caSemaine[0].commandes_semaine,
                    ca: parseFloat(caSemaine[0].ca_semaine)
                },
                mois: {
                    commandes: caMois[0].commandes_mois,
                    ca: parseFloat(caMois[0].ca_mois)
                },
                commandes_en_attente: commandesEnAttente[0].en_attente
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/:restaurantId/plats-populaires
 * Plats les plus vendus
 */
router.get('/:restaurantId/plats-populaires', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { limit = 10, periode = '30' } = req.query;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const platsPopulaires = await query(
            `SELECT 
                ci.nom_plat,
                SUM(ci.quantite) as total_vendus,
                COUNT(DISTINCT ci.commande_id) as nombre_commandes,
                SUM(ci.total) as ca_total
            FROM commande_items ci
            JOIN commandes c ON ci.commande_id = c.id
            WHERE c.restaurant_id = ?
              AND c.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND c.statut != 'annulee'
            GROUP BY ci.nom_plat
            ORDER BY total_vendus DESC
            LIMIT ?`,
            [restaurantId, parseInt(periode), parseInt(limit)]
        );

        res.json({
            success: true,
            data: platsPopulaires.map(p => ({
                nom: p.nom_plat,
                quantite_vendue: p.total_vendus,
                nombre_commandes: p.nombre_commandes,
                ca_genere: parseFloat(p.ca_total)
            }))
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/:restaurantId/historique
 * Historique du CA par jour
 */
router.get('/:restaurantId/historique', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { jours = 30 } = req.query;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const historique = await query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as nombre_commandes,
                SUM(montant_ttc) as ca
            FROM commandes
            WHERE restaurant_id = ?
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND statut != 'annulee'
            GROUP BY DATE(created_at)
            ORDER BY date ASC`,
            [restaurantId, parseInt(jours)]
        );

        res.json({
            success: true,
            data: historique.map(h => ({
                date: h.date,
                commandes: h.nombre_commandes,
                ca: parseFloat(h.ca)
            }))
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/:restaurantId/heures-pointe
 * Heures de pointe (heures avec le plus de commandes)
 */
router.get('/:restaurantId/heures-pointe', authenticateToken, async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { jours = 30 } = req.query;

        // Vérifier que c'est bien le restaurant du token
        if (parseInt(restaurantId) !== req.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const heuresPointe = await query(
            `SELECT 
                HOUR(created_at) as heure,
                COUNT(*) as nombre_commandes,
                SUM(montant_ttc) as ca
            FROM commandes
            WHERE restaurant_id = ?
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND statut != 'annulee'
            GROUP BY HOUR(created_at)
            ORDER BY nombre_commandes DESC`,
            [restaurantId, parseInt(jours)]
        );

        res.json({
            success: true,
            data: heuresPointe.map(h => ({
                heure: `${h.heure}:00`,
                commandes: h.nombre_commandes,
                ca: parseFloat(h.ca)
            }))
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
