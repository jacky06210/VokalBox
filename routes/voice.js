/**
 * Routes Voice - Telnyx Integration
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/v1/voice/dynamic-vars
 * Webhook pour Dynamic Variables Telnyx
 * Appelé au début de chaque conversation pour injecter les données restaurant
 * 
 * ⚠️ IMPORTANT : Doit répondre en moins de 1 seconde !
 */
router.post('/dynamic-vars', async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('[Dynamic Vars] Requête reçue:', JSON.stringify(req.body, null, 2));

        // Extraire le numéro appelé (le numéro VokalBox du restaurant)
        const telnyxAgentTarget = req.body?.data?.payload?.telnyx_agent_target;
        const telnyxEndUser = req.body?.data?.payload?.telnyx_end_user_target;

        if (!telnyxAgentTarget) {
            console.error('[Dynamic Vars] Numéro agent manquant');
            return res.status(400).json({
                error: 'telnyx_agent_target manquant'
            });
        }

        console.log(`[Dynamic Vars] Recherche restaurant pour numéro: ${telnyxAgentTarget}`);

        // Rechercher le restaurant par son numéro Telnyx
        const [restaurants] = await req.db.execute(
            'SELECT * FROM restaurants WHERE telnyx_phone_number = ? OR telephone_resto = ?',
            [telnyxAgentTarget, telnyxAgentTarget]
        );

        if (restaurants.length === 0) {
            console.warn(`[Dynamic Vars] Aucun restaurant trouvé pour ${telnyxAgentTarget}`);
            
            // Retourner des variables par défaut
            return res.json({
                dynamic_variables: {
                    restaurant_name: "Restaurant",
                    restaurant_id: "unknown",
                    horaires_ouverture: "12h-14h et 19h-22h",
                    jours_fermeture: "Non défini",
                    capacite_max: "30",
                    adresse: "Non définie",
                    telephone: telnyxAgentTarget,
                    menu_disponible: "Menu non configuré",
                    erreur: "Restaurant non configuré pour ce numéro"
                }
            });
        }

        const restaurant = restaurants[0];
        console.log(`[Dynamic Vars] Restaurant trouvé: ${restaurant.nom_restaurant} (ID: ${restaurant.id})`);

        // Récupérer le menu du restaurant depuis la table menus (format pizza)
        let menuDisponible = "";
        let categoriesMenu = [];
        
        try {
            const [menuItems] = await req.db.execute(
                'SELECT nom_plat, categorie, description, prix FROM menus WHERE restaurant_id = ? AND disponible = 1 ORDER BY categorie, ordre_affichage, nom_plat',
                [restaurant.id]
            );

            if (menuItems.length > 0) {
                // Grouper par catégorie
                const parCategorie = {};
                menuItems.forEach(item => {
                    const cat = item.categorie || 'Autres';
                    if (!parCategorie[cat]) {
                        parCategorie[cat] = [];
                    }
                    parCategorie[cat].push(`${item.nom_plat} (${parseFloat(item.prix).toFixed(2)}€)`);
                });

                // Construire la chaîne de menu
                categoriesMenu = Object.keys(parCategorie);
                menuDisponible = Object.entries(parCategorie)
                    .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
                    .join(' | ');

                console.log(`[Dynamic Vars] Menu récupéré: ${menuItems.length} items, ${categoriesMenu.length} catégories`);
            } else {
                console.warn('[Dynamic Vars] Aucun menu disponible pour ce restaurant');
                menuDisponible = "Menu en cours de configuration";
            }
        } catch (menuError) {
            console.warn('[Dynamic Vars] Erreur récupération menu:', menuError.message);
            menuDisponible = "Menu temporairement indisponible";
        }

        // Construire horaires lisibles
        let horairesOuverture = restaurant.horaires_texte || "";
        if (!horairesOuverture && restaurant.horaires_midi_debut) {
            const midiDebut = restaurant.horaires_midi_debut?.substring(0, 5) || "";
            const midiFin = restaurant.horaires_midi_fin?.substring(0, 5) || "";
            const soirDebut = restaurant.horaires_soir_debut?.substring(0, 5) || "";
            const soirFin = restaurant.horaires_soir_fin?.substring(0, 5) || "";
            horairesOuverture = `Midi ${midiDebut}-${midiFin}, Soir ${soirDebut}-${soirFin}`;
        }
        if (!horairesOuverture) {
            horairesOuverture = "12h-14h et 19h-22h";
        }

        // Construire les variables dynamiques
        const dynamicVariables = {
            restaurant_id: restaurant.id.toString(),
            restaurant_name: restaurant.nom_restaurant || "Restaurant",
            horaires_ouverture: horairesOuverture,
            jours_fermeture: restaurant.jours_fermeture || "Dimanche",
            capacite_max: (restaurant.capacite_couverts || 50).toString(),
            adresse: restaurant.adresse_complete || restaurant.adresse_rue || "Non définie",
            telephone: restaurant.telephone_resto || telnyxAgentTarget,
            ville: restaurant.ville || "",
            code_postal: restaurant.code_postal || "",
            email: restaurant.email || "",
            menu_disponible: menuDisponible,
            categories_menu: categoriesMenu.join(', '),
            appelant_numero: telnyxEndUser || "Inconnu"
        };

        const responseTime = Date.now() - startTime;
        console.log(`[Dynamic Vars] Réponse envoyée en ${responseTime}ms pour ${restaurant.nom_restaurant}`);

        // Répondre à Telnyx (RAPIDEMENT !)
        return res.json({
            dynamic_variables: dynamicVariables
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error(`[Dynamic Vars] Erreur après ${responseTime}ms:`, error);
        
        // Même en cas d'erreur, renvoyer des variables par défaut
        return res.json({
            dynamic_variables: {
                restaurant_name: "Restaurant",
                restaurant_id: "error",
                horaires_ouverture: "12h-14h et 19h-22h",
                jours_fermeture: "Non défini",
                capacite_max: "30",
                telephone: req.body?.data?.payload?.telnyx_agent_target || "",
                menu_disponible: "Menu indisponible",
                erreur: `Erreur serveur: ${error.message}`
            }
        });
    }
});

/**
 * GET /api/v1/voice/menu/:apiKey
 * Récupère le menu pour l'assistant vocal
 */
router.get('/menu/:apiKey', async (req, res) => {
    try {
        const { apiKey } = req.params;
        
        // Récupérer le restaurant
        const [restaurants] = await req.db.execute(
            'SELECT * FROM restaurants WHERE api_key = ? OR code_restaurant = ?',
            [apiKey, apiKey]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        const restaurant = restaurants[0];

        // Récupérer le menu
        const [menus] = await req.db.execute(
            'SELECT * FROM menus WHERE restaurant_id = ? ORDER BY created_at DESC LIMIT 1',
            [restaurant.id]
        );

        let menuData = null;
        if (menus.length > 0 && menus[0].menu_data) {
            menuData = JSON.parse(menus[0].menu_data);
        }

        res.json({
            success: true,
            message: 'Menu vocal récupéré',
            data: {
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.nom_restaurant,
                    apiKey: restaurant.api_key
                },
                menu: menuData
            }
        });
    } catch (error) {
        console.error('Erreur /voice/menu:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du menu vocal',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/voice/order
 * Créer une commande depuis l'assistant vocal
 */
router.post('/order', async (req, res) => {
    try {
        const orderData = req.body;
        
        // TODO: Implémenter la logique de création de commande vocale
        res.json({
            success: true,
            message: 'Commande vocale créée',
            data: {
                orderId: 'temp-' + Date.now(),
                ...orderData
            }
        });
    } catch (error) {
        console.error('Erreur /voice/order:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la commande vocale',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/voice/confirm-sms
 * Envoyer SMS de confirmation
 */
router.post('/confirm-sms', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        
        // TODO: Implémenter l'envoi de SMS via Telnyx
        res.json({
            success: true,
            message: 'SMS de confirmation envoyé',
            data: {
                phone,
                orderId
            }
        });
    } catch (error) {
        console.error('Erreur /voice/confirm-sms:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du SMS',
            error: error.message
        });
    }
});

/**
 * GET /api/v1/voice/test-dynamic-vars/:restaurant_id
 * Endpoint de test pour simuler l'appel Telnyx Dynamic Variables
 */
router.get('/test-dynamic-vars/:restaurant_id', async (req, res) => {
    try {
        const { restaurant_id } = req.params;
        
        // Récupérer le restaurant
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

        // Simuler l'appel Telnyx
        const mockTelnyxPayload = {
            data: {
                event_type: "assistant.initialization",
                payload: {
                    telnyx_agent_target: restaurant.telnyx_phone_number || restaurant.telephone_resto,
                    telnyx_end_user_target: "+33612345678",
                    call_control_id: "v3:test-" + Date.now(),
                    assistant_id: "assistant_test_" + restaurant.id
                }
            }
        };

        // Appeler l'endpoint dynamic-vars en interne
        const telnyxAgentTarget = mockTelnyxPayload.data.payload.telnyx_agent_target;
        const [restCheck] = await req.db.execute(
            'SELECT * FROM restaurants WHERE telnyx_phone_number = ? OR telephone_resto = ?',
            [telnyxAgentTarget, telnyxAgentTarget]
        );

        if (restCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé avec ce numéro Telnyx'
            });
        }

        const rest = restCheck[0];

        // Récupérer le menu
        const [menuItems] = await req.db.execute(
            'SELECT nom_plat, categorie, prix FROM menus WHERE restaurant_id = ? AND disponible = 1 ORDER BY categorie, nom_plat',
            [rest.id]
        );

        let menuDisponible = "";
        if (menuItems.length > 0) {
            const parCategorie = {};
            menuItems.forEach(item => {
                const cat = item.categorie || 'Autres';
                if (!parCategorie[cat]) parCategorie[cat] = [];
                parCategorie[cat].push(`${item.nom_plat} (${parseFloat(item.prix).toFixed(2)}€)`);
            });
            menuDisponible = Object.entries(parCategorie)
                .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
                .join(' | ');
        }

        // Construire horaires
        let horairesOuverture = rest.horaires_texte || "";
        if (!horairesOuverture && rest.horaires_midi_debut) {
            const midiDebut = rest.horaires_midi_debut?.substring(0, 5) || "";
            const midiFin = rest.horaires_midi_fin?.substring(0, 5) || "";
            const soirDebut = rest.horaires_soir_debut?.substring(0, 5) || "";
            const soirFin = rest.horaires_soir_fin?.substring(0, 5) || "";
            horairesOuverture = `Midi ${midiDebut}-${midiFin}, Soir ${soirDebut}-${soirFin}`;
        }

        const dynamicVariables = {
            restaurant_id: rest.id.toString(),
            restaurant_name: rest.nom_restaurant || "Restaurant",
            horaires_ouverture: horairesOuverture || "12h-14h et 19h-22h",
            jours_fermeture: rest.jours_fermeture || "Dimanche",
            capacite_max: (rest.capacite_couverts || 50).toString(),
            adresse: rest.adresse_complete || rest.adresse_rue || "Non définie",
            telephone: rest.telephone_resto || telnyxAgentTarget,
            ville: rest.ville || "",
            code_postal: rest.code_postal || "",
            email: rest.email || "",
            menu_disponible: menuDisponible || "Menu non configuré"
        };

        res.json({
            success: true,
            message: 'Test Dynamic Variables',
            restaurant: {
                id: rest.id,
                name: rest.nom_restaurant,
                telnyx_number: rest.telnyx_phone_number
            },
            menu_items_count: menuItems.length,
            telnyx_payload: mockTelnyxPayload,
            dynamic_variables: dynamicVariables
        });

    } catch (error) {
        console.error('Erreur /voice/test-dynamic-vars:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du test',
            error: error.message
        });
    }
});

module.exports = router;
