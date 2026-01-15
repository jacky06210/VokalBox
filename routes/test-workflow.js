/**
 * Routes de test - Workflow complet Restaurant + Menu
 */

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

/**
 * POST /api/test-workflow/create-complete
 * Crée un restaurant complet avec menu numérisé
 */
router.post('/create-complete', async (req, res) => {
    const connection = await req.db.getConnection();
    
    try {
        const {
            nom_restaurant,
            adresse_complete,
            telephone_resto,
            email,
            images
        } = req.body;

        // Validation
        if (!nom_restaurant || !telephone_resto || !images || images.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Champs obligatoires: nom_restaurant, telephone_resto, images'
            });
        }

        console.log(`🧪 [TEST] Création restaurant: ${nom_restaurant}`);

        await connection.beginTransaction();

        // 1. Créer le restaurant
        const code_restaurant = 'TEST-' + Date.now();
        const api_key = 'KEY-TEST-' + Math.random().toString(36).substring(2, 15);

        const [restaurantResult] = await connection.execute(`
            INSERT INTO restaurants 
            (nom_restaurant, adresse_complete, telephone_resto, email, code_restaurant, api_key, statut_abonnement, telnyx_phone_number, date_inscription)
            VALUES (?, ?, ?, ?, ?, ?, 'test', '+33000000000', NOW())
        `, [
            nom_restaurant,
            adresse_complete || null,
            telephone_resto,
            email || null,
            code_restaurant,
            api_key
        ]);

        const restaurant_id = restaurantResult.insertId;
        console.log(`✅ Restaurant créé: ID ${restaurant_id}, Code ${code_restaurant}`);

        // 2. Numériser le menu avec Claude Vision
        console.log(`📸 Scan de ${images.length} image(s)...`);
        
        const content = [];
        
        images.forEach((img) => {
            let mediaType = 'image/jpeg';
            let base64Data = img;
            
            if (img.startsWith('data:')) {
                const matches = img.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    mediaType = matches[1];
                    base64Data = matches[2];
                }
            }
            
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data
                }
            });
        });

        content.push({
            type: 'text',
            text: `Tu es un expert en extraction de menus de restaurant. Analyse cette/ces image(s) de menu et extrais TOUS les plats avec leurs prix.

RÈGLES IMPORTANTES:
1. Extrais CHAQUE plat visible
2. Regroupe par catégorie (Entrées, Plats, Desserts, Pizzas, Boissons, etc.)
3. Si un plat a plusieurs tailles, liste chaque prix
4. Détecte les promotions
5. Les prix sont en euros (€)

RETOURNE UNIQUEMENT un JSON valide avec cette structure:
{
    "restaurant": "Nom du restaurant si visible",
    "categories": [
        {
            "name": "Nom de la catégorie",
            "items": [
                {
                    "name": "Nom du plat",
                    "description": "Description ou null",
                    "prices": [
                        {
                            "label": "Format ou 'Prix unique'",
                            "value": "12.50"
                        }
                    ]
                }
            ]
        }
    ]
}

NE RETOURNE QUE LE JSON.`
        });

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            messages: [{ role: 'user', content: content }]
        });

        let menuData;
        const responseText = response.content[0].text;
        
        try {
            let cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            menuData = JSON.parse(cleanJson);
        } catch (parseError) {
            throw new Error('Erreur parsing menu: ' + parseError.message);
        }

        console.log(`✅ Menu extrait: ${menuData.categories.length} catégories`);

        // 3. Sauvegarder le menu dans la table menus
        let totalItems = 0;
        
        for (const category of menuData.categories) {
            for (const item of category.items) {
                for (const price of item.prices) {
                    await connection.execute(`
                        INSERT INTO menus 
                        (restaurant_id, nom_plat, categorie, description, prix, disponible, ordre_affichage, created_at)
                        VALUES (?, ?, ?, ?, ?, 1, ?, NOW())
                    `, [
                        restaurant_id,
                        `${item.name}${price.label !== 'Prix unique' ? ' - ' + price.label : ''}`,
                        category.name,
                        item.description || null,
                        parseFloat(price.value) || 0,
                        totalItems
                    ]);
                    totalItems++;
                }
            }
        }

        console.log(`✅ Menu sauvegardé: ${totalItems} items`);

        await connection.commit();

        // Construire la réponse
        res.json({
            success: true,
            message: 'Restaurant créé avec succès !',
            data: {
                restaurant: {
                    id: restaurant_id,
                    nom: nom_restaurant,
                    code: code_restaurant,
                    api_key: api_key,
                    telephone: telephone_resto,
                    email: email
                },
                menu: {
                    categories: menuData.categories.length,
                    total_items: totalItems,
                    details: menuData
                },
                next_steps: [
                    'Le restaurant a été créé en mode TEST',
                    `${totalItems} plats ont été extraits et sauvegardés`,
                    'Code restaurant: ' + code_restaurant
                ]
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Erreur workflow test:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

/**
 * DELETE /api/test-workflow/reset-all
 * Supprime tous les restaurants de test
 */
router.delete('/reset-all', async (req, res) => {
    const connection = await req.db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Supprimer les menus des restaurants test
        await connection.execute(`
            DELETE m FROM menus m 
            JOIN restaurants r ON m.restaurant_id = r.id 
            WHERE r.statut_abonnement = 'test' OR r.code_restaurant LIKE 'TEST-%'
        `);

        // Supprimer les restaurants test
        const [result] = await connection.execute(`
            DELETE FROM restaurants 
            WHERE statut_abonnement = 'test' OR code_restaurant LIKE 'TEST-%'
        `);

        await connection.commit();

        console.log(`🧹 ${result.affectedRows} restaurants de test supprimés`);

        res.json({
            success: true,
            message: `${result.affectedRows} restaurants de test supprimés`
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur RAZ:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
