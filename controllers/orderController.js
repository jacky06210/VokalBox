/**
 * CONTRÔLEUR DES COMMANDES
 * Gestion complète du cycle de vie des commandes
 */

const mysql = require('mysql2/promise');

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
 * Créer une nouvelle commande
 */
exports.createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            restaurantId,
            clientNom,
            clientTelephone,
            clientEmail,
            items,
            typeCommande,
            adresseLivraison,
            notes,
            source
        } = req.body;

        // Validation
        if (!restaurantId || !clientNom || !clientTelephone || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes (restaurantId, clientNom, clientTelephone, items requis)'
            });
        }

        // Calculer le montant total
        const montantTotal = items.reduce((sum, item) => {
            return sum + (item.prixUnitaire * item.quantite);
        }, 0);

        // Générer un numéro de commande unique
        const [lastOrder] = await connection.execute(
            'SELECT MAX(id) as lastId FROM commandes WHERE restaurant_id = ?',
            [restaurantId]
        );
        const orderNumber = `CMD-${String((lastOrder[0].lastId || 0) + 1).padStart(6, '0')}`;

        // Insérer la commande
        const [result] = await connection.execute(
            `INSERT INTO commandes (
                restaurant_id, numero_commande, client_nom, client_telephone, client_email,
                montant_total, statut, type_commande, adresse_livraison, notes, source
            ) VALUES (?, ?, ?, ?, ?, ?, 'en_attente', ?, ?, ?, ?)`,
            [
                restaurantId,
                orderNumber,
                clientNom,
                clientTelephone,
                clientEmail || null,
                montantTotal,
                typeCommande || 'emporter',
                adresseLivraison || null,
                notes || null,
                source || 'web'
            ]
        );

        const commandeId = result.insertId;

        // Insérer les items de la commande
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
            message: 'Commande créée avec succès',
            data: {
                commandeId,
                numeroCommande: orderNumber,
                montantTotal,
                statut: 'en_attente'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur création commande:', error);
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
 * Récupérer les commandes d'un restaurant
 */
exports.getOrders = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { statut, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT c.*, 
                   COUNT(ci.id) as nombre_items
            FROM commandes c
            LEFT JOIN commande_items ci ON c.id = ci.commande_id
            WHERE c.restaurant_id = ?
        `;
        
        const params = [restaurantId];

        if (statut) {
            query += ' AND c.statut = ?';
            params.push(statut);
        }

        query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [commandes] = await pool.execute(query, params);

        res.json({
            success: true,
            count: commandes.length,
            data: commandes
        });

    } catch (error) {
        console.error('Erreur récupération commandes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des commandes',
            error: error.message
        });
    }
};

/**
 * Récupérer les détails d'une commande
 */
exports.getOrderDetail = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Récupérer la commande
        const [commandes] = await pool.execute(
            'SELECT * FROM commandes WHERE id = ?',
            [orderId]
        );

        if (commandes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        const commande = commandes[0];

        // Récupérer les items de la commande avec les détails des plats
        const [items] = await pool.execute(
            `SELECT ci.*, p.nom as plat_nom, p.description
             FROM commande_items ci
             LEFT JOIN plats p ON ci.plat_id = p.id
             WHERE ci.commande_id = ?`,
            [orderId]
        );

        res.json({
            success: true,
            data: {
                ...commande,
                items
            }
        });

    } catch (error) {
        console.error('Erreur détails commande:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des détails',
            error: error.message
        });
    }
};

/**
 * Mettre à jour le statut d'une commande
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { statut } = req.body;

        const statutsValides = ['en_attente', 'en_preparation', 'pret', 'livree', 'annulee'];
        
        if (!statutsValides.includes(statut)) {
            return res.status(400).json({
                success: false,
                message: `Statut invalide. Valeurs autorisées: ${statutsValides.join(', ')}`
            });
        }

        const [result] = await pool.execute(
            'UPDATE commandes SET statut = ?, updated_at = NOW() WHERE id = ?',
            [statut, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Statut mis à jour',
            data: { statut }
        });

    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du statut',
            error: error.message
        });
    }
};

/**
 * Annuler une commande
 */
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const [result] = await pool.execute(
            'UPDATE commandes SET statut = "annulee", updated_at = NOW() WHERE id = ?',
            [orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Commande annulée'
        });

    } catch (error) {
        console.error('Erreur annulation commande:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'annulation',
            error: error.message
        });
    }
};

/**
 * Récupérer les statistiques des commandes
 */
exports.getStats = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { dateDebut, dateFin } = req.query;

        let whereClause = 'WHERE restaurant_id = ?';
        const params = [restaurantId];

        if (dateDebut && dateFin) {
            whereClause += ' AND DATE(created_at) BETWEEN ? AND ?';
            params.push(dateDebut, dateFin);
        }

        // Statistiques globales
        const [stats] = await pool.execute(
            `SELECT 
                COUNT(*) as total_commandes,
                SUM(CASE WHEN statut = 'livree' THEN montant_total ELSE 0 END) as chiffre_affaires,
                AVG(CASE WHEN statut = 'livree' THEN montant_total ELSE NULL END) as panier_moyen,
                COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) as commandes_en_attente,
                COUNT(CASE WHEN statut = 'en_preparation' THEN 1 END) as commandes_en_preparation,
                COUNT(CASE WHEN statut = 'pret' THEN 1 END) as commandes_pretes,
                COUNT(CASE WHEN statut = 'livree' THEN 1 END) as commandes_livrees,
                COUNT(CASE WHEN statut = 'annulee' THEN 1 END) as commandes_annulees
             FROM commandes ${whereClause}`,
            params
        );

        // Plats les plus commandés
        const [topPlats] = await pool.execute(
            `SELECT p.nom, SUM(ci.quantite) as total_quantite, SUM(ci.quantite * ci.prix_unitaire) as total_ventes
             FROM commande_items ci
             JOIN commandes c ON ci.commande_id = c.id
             JOIN plats p ON ci.plat_id = p.id
             ${whereClause}
             GROUP BY ci.plat_id
             ORDER BY total_quantite DESC
             LIMIT 10`,
            params
        );

        res.json({
            success: true,
            data: {
                statistiques: stats[0],
                topPlats
            }
        });

    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: error.message
        });
    }
};
