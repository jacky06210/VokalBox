// routes/telnyx.js
// Routes pour les webhooks Telnyx

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const crypto = require('crypto');

/**
 * POST /webhooks/telnyx
 * Webhook pour recevoir les événements Telnyx
 */
router.post('/', express.json(), async (req, res) => {
    try {
        const event = req.body;

        // Vérifier la signature (si configurée)
        if (process.env.TELNYX_WEBHOOK_SECRET) {
            const signature = req.headers['telnyx-signature-ed25519'];
            const timestamp = req.headers['telnyx-timestamp-unix'];
            
            if (!verifyTelnyxSignature(req.body, signature, timestamp)) {
                console.error('❌ Signature Telnyx invalide');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        console.log('✅ Webhook Telnyx reçu:', event.data.event_type);

        // Traiter l'événement selon son type
        switch (event.data.event_type) {
            
            // Appel entrant
            case 'call.initiated':
                await handleCallInitiated(event.data.payload);
                break;

            // Appel répondu
            case 'call.answered':
                await handleCallAnswered(event.data.payload);
                break;

            // Appel terminé
            case 'call.hangup':
                await handleCallHangup(event.data.payload);
                break;

            // Appel en attente (pour gestion de menu)
            case 'call.dtmf.received':
                await handleDTMF(event.data.payload);
                break;

            default:
                console.log(`Type d'événement non géré: ${event.data.event_type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('❌ Erreur traitement webhook Telnyx:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Vérifier la signature Telnyx
 */
function verifyTelnyxSignature(body, signature, timestamp) {
    try {
        const payload = `${timestamp}|${JSON.stringify(body)}`;
        const hash = crypto
            .createHmac('sha256', process.env.TELNYX_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');
        
        return hash === signature;
    } catch (error) {
        return false;
    }
}

/**
 * Gérer un appel initié
 */
async function handleCallInitiated(payload) {
    console.log('📞 Appel initié:', payload.call_control_id);

    const { call_control_id, from, to } = payload;

    // Trouver le restaurant associé à ce numéro
    const restaurants = await query(
        'SELECT id, nom_restaurant FROM restaurants WHERE telnyx_number = ? AND statut = "actif"',
        [to]
    );

    if (restaurants.length === 0) {
        console.error('❌ Aucun restaurant trouvé pour ce numéro:', to);
        return;
    }

    const restaurant = restaurants[0];

    // Logger l'appel
    await query(
        `INSERT INTO logs (restaurant_id, type, action, details) 
        VALUES (?, 'info', 'appel_recu', ?)`,
        [
            restaurant.id,
            JSON.stringify({
                call_id: call_control_id,
                from: from,
                to: to,
                timestamp: new Date().toISOString()
            })
        ]
    );

    console.log(`✅ Appel reçu pour ${restaurant.nom_restaurant}`);
}

/**
 * Gérer un appel répondu
 */
async function handleCallAnswered(payload) {
    console.log('✅ Appel répondu:', payload.call_control_id);

    const { call_control_id } = payload;

    // Ici on pourrait démarrer la logique d'IA vocale
    // Pour l'instant, on log simplement
    await query(
        `INSERT INTO logs (type, action, details) 
        VALUES ('info', 'appel_repondu', ?)`,
        [JSON.stringify({ call_id: call_control_id })]
    );
}

/**
 * Gérer la fin d'un appel
 */
async function handleCallHangup(payload) {
    console.log('📴 Appel terminé:', payload.call_control_id);

    const { call_control_id, call_duration, hangup_cause } = payload;

    // Logger la fin de l'appel
    await query(
        `INSERT INTO logs (type, action, details) 
        VALUES ('info', 'appel_termine', ?)`,
        [
            JSON.stringify({
                call_id: call_control_id,
                duration: call_duration,
                cause: hangup_cause
            })
        ]
    );

    // Si un panier existe pour cet appel, le marquer comme expiré
    await query(
        `UPDATE paniers 
        SET expire_at = NOW() 
        WHERE session_id = ?`,
        [call_control_id]
    );
}

/**
 * Gérer les touches DTMF (menu vocal)
 */
async function handleDTMF(payload) {
    console.log('🔢 DTMF reçu:', payload.digit);

    const { call_control_id, digit } = payload;

    // Logger le DTMF
    await query(
        `INSERT INTO logs (type, action, details) 
        VALUES ('info', 'dtmf_recu', ?)`,
        [JSON.stringify({ call_id: call_control_id, digit })]
    );

    // Ici on pourrait gérer la navigation dans le menu vocal
    // Ex: 1 = Commander, 2 = Horaires, 3 = Parler à un conseiller, etc.
}

/**
 * POST /webhooks/telnyx/voice-response
 * Endpoint pour les réponses vocales (utilisé par l'IA)
 */
router.post('/voice-response', express.json(), async (req, res) => {
    try {
        const { restaurant_id, call_id, action, data } = req.body;

        console.log(`🎙️ Action vocale: ${action} pour restaurant ${restaurant_id}`);

        switch (action) {
            case 'get_menu':
                // Récupérer le menu pour l'IA
                const menu = await getRestaurantMenu(restaurant_id);
                res.json({ success: true, menu });
                break;

            case 'create_order':
                // Créer une commande depuis l'IA
                const commande = await createOrderFromVoice(restaurant_id, call_id, data);
                res.json({ success: true, commande });
                break;

            case 'check_availability':
                // Vérifier la disponibilité d'un plat
                const available = await checkPlatAvailability(restaurant_id, data.plat_id);
                res.json({ success: true, available });
                break;

            default:
                res.status(400).json({ success: false, message: 'Action inconnue' });
        }

    } catch (error) {
        console.error('❌ Erreur voice-response:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Récupérer le menu d'un restaurant pour l'IA
 */
async function getRestaurantMenu(restaurant_id) {
    const categories = await query(
        `SELECT id, nom FROM categories 
        WHERE restaurant_id = ? AND actif = TRUE 
        ORDER BY ordre`,
        [restaurant_id]
    );

    const menu = [];
    for (const category of categories) {
        const plats = await query(
            `SELECT id, nom, description, prix, prix_promo, en_promotion 
            FROM plats 
            WHERE category_id = ? AND actif = TRUE AND disponible = TRUE`,
            [category.id]
        );

        menu.push({
            categorie: category.nom,
            plats: plats.map(p => ({
                id: p.id,
                nom: p.nom,
                description: p.description,
                prix: p.en_promotion && p.prix_promo ? parseFloat(p.prix_promo) : parseFloat(p.prix)
            }))
        });
    }

    return menu;
}

/**
 * Créer une commande depuis l'appel vocal
 */
async function createOrderFromVoice(restaurant_id, call_id, orderData) {
    const { telephone_client, items, nom_client } = orderData;

    // Créer la commande
    const result = await query(
        `INSERT INTO commandes 
        (restaurant_id, nom_client, telephone_client, mode_retrait, 
         montant_ht, montant_tva, montant_ttc, telnyx_call_id, statut) 
        VALUES (?, ?, ?, 'emporter', ?, ?, ?, ?, 'nouvelle')`,
        [
            restaurant_id,
            nom_client || 'Client Vocal',
            telephone_client,
            orderData.montant_ht,
            orderData.montant_tva,
            orderData.montant_ttc,
            call_id
        ]
    );

    const commande_id = result.insertId;

    // Ajouter les items
    for (const item of items) {
        await query(
            `INSERT INTO commande_items 
            (commande_id, plat_id, nom_plat, prix_unitaire, quantite, total) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [commande_id, item.plat_id, item.nom, item.prix, item.quantite, item.total]
        );
    }

    return { commande_id, montant_ttc: orderData.montant_ttc };
}

/**
 * Vérifier la disponibilité d'un plat
 */
async function checkPlatAvailability(restaurant_id, plat_id) {
    const plats = await query(
        `SELECT p.disponible FROM plats p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? AND c.restaurant_id = ? AND p.actif = TRUE`,
        [plat_id, restaurant_id]
    );

    return plats.length > 0 && plats[0].disponible;
}

module.exports = router;
