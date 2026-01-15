const express = require('express');
const router = express.Router();

/**
 * Route pour récupérer le menu de pizzas d'un restaurant
 * GET /api/commandes/menu-pizzas
 * Query params: restaurant_id (obligatoire)
 */
router.get('/menu-pizzas', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { restaurant_id } = req.query;
        
        if (!restaurant_id) {
            return res.status(400).json({
                success: false,
                message: 'Le paramètre restaurant_id est obligatoire'
            });
        }
        
        // Récupérer toutes les pizzas du restaurant
        const [pizzas] = await req.db.execute(`
            SELECT 
                id, 
                nom_plat, 
                description, 
                prix, 
                disponible
            FROM menus
            WHERE restaurant_id = ?
            AND categorie = 'Pizza'
            AND disponible = 1
            ORDER BY ordre_affichage
        `, [restaurant_id]);
        
        const executionTime = Date.now() - startTime;
        
        return res.json({
            success: true,
            data: pizzas,
            count: pizzas.length,
            execution_time_ms: executionTime
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération du menu pizzas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du menu',
            error: error.message
        });
    }
});

/**
 * Route pour créer une nouvelle commande de pizza
 * POST /api/commandes/create
 * Body: {
 *   restaurant_id: string/number,
 *   customer_name: string,
 *   customer_phone: string,
 *   items: [{ plat_id: number, quantite: number, notes: string }],
 *   mode_retrait: 'livraison' | 'click_collect',
 *   adresse_livraison: string (optionnel si click_collect),
 *   code_postal: string (optionnel),
 *   ville: string (optionnel),
 *   call_id: string (optionnel)
 * }
 */
router.post('/create', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { 
            restaurant_id, 
            customer_name, 
            customer_phone,
            items,
            mode_retrait = 'click_collect',
            adresse_livraison,
            code_postal,
            ville,
            call_id
        } = req.body;
        
        // Validation des champs obligatoires
        if (!restaurant_id || !customer_name || !customer_phone || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Champs obligatoires manquants: restaurant_id, customer_name, customer_phone, items'
            });
        }
        
        // Vérifier que le restaurant existe
        const [restaurants] = await req.db.execute(
            'SELECT * FROM restaurants WHERE id = ? OR api_key = ? OR code_restaurant = ?',
            [restaurant_id, restaurant_id, restaurant_id]
        );
        
        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }
        
        const restaurant = restaurants[0];
        
        // Récupérer les prix des plats commandés
        const platIds = items.map(item => item.plat_id);
        const placeholders = platIds.map(() => '?').join(',');
        const [plats] = await req.db.execute(
            `SELECT id, nom_plat, prix, disponible FROM menus WHERE id IN (${placeholders}) AND restaurant_id = ?`,
            [...platIds, restaurant.id]
        );
        
        // Vérifier que tous les plats existent et sont disponibles
        if (plats.length !== platIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Un ou plusieurs plats n\'existent pas ou ne sont pas disponibles'
            });
        }
        
        // Calculer le montant total
        let montantTotal = 0;
        const itemsWithPrices = items.map(item => {
            const plat = plats.find(p => p.id === item.plat_id);
            const sousTotal = parseFloat(plat.prix) * parseInt(item.quantite);
            montantTotal += sousTotal;
            return {
                ...item,
                prix_unitaire: plat.prix,
                nom_plat: plat.nom_plat
            };
        });
        
        // Frais de livraison si applicable
        let fraisLivraison = 0;
        if (mode_retrait === 'livraison') {
            fraisLivraison = 3.50; // Frais de livraison standard
            montantTotal += fraisLivraison;
        }
        
        // Créer la commande JSON
        const commandeJson = {
            items: itemsWithPrices.map(item => ({
                plat_id: item.plat_id,
                nom_plat: item.nom_plat,
                quantite: item.quantite,
                prix_unitaire: item.prix_unitaire,
                notes: item.notes || ''
            }))
        };
        
        // Insérer la commande dans la base de données
        const [result] = await req.db.execute(`
            INSERT INTO commandes 
            (restaurant_id, telephone_client, nom_client, adresse_livraison, code_postal, ville, 
             mode_retrait, frais_livraison, montant_ttc, montant_total, source, call_id, commande, statut, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vocal', ?, ?, 'nouvelle', NOW())
        `, [
            restaurant.id,
            customer_phone,
            customer_name,
            adresse_livraison || null,
            code_postal || null,
            ville || null,
            mode_retrait,
            fraisLivraison,
            montantTotal,
            montantTotal,
            call_id || null,
            JSON.stringify(commandeJson)
        ]);
        
        const commandeId = result.insertId;
        
        // Insérer les items dans commande_items
        for (const item of itemsWithPrices) {
            await req.db.execute(`
                INSERT INTO commande_items 
                (commande_id, plat_id, quantite, prix_unitaire, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [
                commandeId,
                item.plat_id,
                item.quantite,
                item.prix_unitaire,
                item.notes || null
            ]);
        }
        
        const executionTime = Date.now() - startTime;
        
        // Réponse de succès
        return res.status(201).json({
            success: true,
            message: `Commande confirmée pour ${customer_name}. Montant total : ${montantTotal.toFixed(2)}€. Mode de retrait : ${mode_retrait === 'livraison' ? 'livraison' : 'à emporter'}.`,
            data: {
                commande_id: commandeId,
                restaurant_name: restaurant.nom_restaurant,
                customer_name: customer_name,
                customer_phone: customer_phone,
                items: itemsWithPrices.map(item => ({
                    nom_plat: item.nom_plat,
                    quantite: item.quantite,
                    prix_unitaire: parseFloat(item.prix_unitaire),
                    notes: item.notes || ''
                })),
                mode_retrait: mode_retrait,
                adresse_livraison: adresse_livraison || null,
                frais_livraison: fraisLivraison,
                montant_total: montantTotal,
                statut: 'nouvelle',
                estimated_time: mode_retrait === 'click_collect' ? '20-30 minutes' : '30-45 minutes'
            },
            execution_time_ms: executionTime
        });
        
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la commande',
            error: error.message
        });
    }
});

module.exports = router;
