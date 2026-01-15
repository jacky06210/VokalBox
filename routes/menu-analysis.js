// ========================================
// ROUTES D'ANALYSE DE MENU - VOCALBOXMAITRE
// Fichier: routes/menu-analysis.js
// ========================================

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');

// Configuration
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// ========================================
// ROUTE 1: Analyser un menu avec Claude Vision (images)
// POST /api/analyze-menu
// ========================================

router.post('/analyze-menu', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ 
                error: 'Aucune image fournie' 
            });
        }

        console.log(`📷 Analyse de ${images.length} image(s)...`);

        // Préparer les images pour Claude
        const imageContents = images.map(imageData => {
            // Extraire le base64 (enlever le préfixe data:image/...)
            const base64Data = imageData.split(',')[1];
            const mimeType = imageData.split(';')[0].split(':')[1];

            return {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data
                }
            };
        });

        // Appeler Claude Vision API
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
                role: 'user',
                content: [
                    ...imageContents,
                    {
                        type: 'text',
                        text: `Tu es un expert en analyse de menus de restaurants français. Analyse ces images de menu et extrais TOUTES les informations en JSON.

IMPORTANT : Détecte automatiquement TOUTES les catégories présentes sur ce menu. Ne te limite pas à une liste prédéfinie.

Réponds UNIQUEMENT avec un JSON dans ce format exact :

{
  "restaurantName": "Nom du restaurant détecté",
  "items": [
    {
      "name": "Nom du plat",
      "price": 12.50,
      "category": "Catégorie détectée (ex: Pizzas, Pâtes, Burgers, Salades, Entrées, Plats, Desserts, Boissons, etc.)",
      "description": "Description courte si disponible"
    }
  ]
}

RÈGLES IMPORTANTES:
1. Détecte le nom du restaurant si visible
2. Crée une catégorie pour chaque type de plat que tu vois
3. Si un plat a plusieurs tailles (Junior/Senior/Mega), crée un article séparé pour chaque taille
4. Prix au format numérique (12.50 et non "12,50€")
5. Extrait TOUS les plats visibles sur les photos
6. Si la catégorie n'est pas claire, essaie de la deviner intelligemment
7. Réponds UNIQUEMENT avec le JSON, rien d'autre

Exemples de catégories possibles (mais pas limitatif) :
Formules, Menus, Pizzas, Pâtes, Panini, Croque-monsieur, Sandwichs, Burgers, Salades, Desserts, Boissons, Entrées, Plats, Plats du jour, Spécialités, Grillades, Poissons, Viandes, Accompagnements, Sauces, Suppléments`
                    }
                ]
            }]
        });

        // Extraire le JSON de la réponse
        let responseText = message.content[0].text;
        
        // Nettoyer la réponse (enlever les balises markdown si présentes)
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const menuData = JSON.parse(responseText);

        // Valider la structure
        if (!menuData.items || !Array.isArray(menuData.items)) {
            throw new Error('Format de réponse invalide');
        }

        console.log(`✅ Menu analysé: ${menuData.items.length} plats détectés`);

        res.json(menuData);

    } catch (error) {
        console.error('❌ Erreur analyse menu:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'analyse du menu',
            details: error.message 
        });
    }
});

// ========================================
// ROUTE 2: Sauvegarder le menu dans la BDD
// POST /api/save-menu
// ========================================

router.post('/save-menu', async (req, res) => {
    try {
        const { restaurantName, categories } = req.body;

        if (!restaurantName || !categories) {
            return res.status(400).json({ 
                error: 'Données manquantes (restaurantName et categories requis)' 
            });
        }

        console.log(`💾 Sauvegarde du menu: ${restaurantName}`);

        // Générer une clé API unique pour le restaurant
        const restaurantId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const randomPart = crypto.randomBytes(16).toString('hex').toUpperCase();
        const apiKey = `RESTO_${restaurantId}_${randomPart}`;

        // Connexion à la base de données
        const connection = req.app.get('db');

        // Vérifier si le restaurant existe déjà
        const [existingRestaurant] = await connection.query(
            'SELECT id FROM restaurants WHERE name = ?',
            [restaurantName]
        );

        let restaurantDbId;

        if (existingRestaurant.length > 0) {
            // Restaurant existe déjà, on met à jour
            restaurantDbId = existingRestaurant[0].id;
            console.log(`📝 Restaurant existant trouvé (ID: ${restaurantDbId})`);
        } else {
            // Nouveau restaurant, on insère
            const [restaurantResult] = await connection.query(
                'INSERT INTO restaurants (name, api_key, created_at) VALUES (?, ?, NOW())',
                [restaurantName, apiKey]
            );
            restaurantDbId = restaurantResult.insertId;
            console.log(`✨ Nouveau restaurant créé (ID: ${restaurantDbId})`);
        }

        // Compter le nombre total de plats
        let totalItems = 0;
        Object.values(categories).forEach(items => {
            totalItems += items.length;
        });

        // Préparer le menu_data en JSON
        const menuDataJson = {
            restaurantName,
            categories,
            totalItems,
            lastUpdate: new Date().toISOString()
        };

        // Désactiver l'ancien menu s'il existe
        await connection.query(
            'UPDATE menus SET is_active = 0 WHERE restaurant_id = ?',
            [restaurantDbId]
        );

        // Insérer le nouveau menu dans la table menus
        const [menuResult] = await connection.query(
            'INSERT INTO menus (restaurant_id, menu_data, version, is_active, created_at) VALUES (?, ?, 1, 1, NOW())',
            [restaurantDbId, JSON.stringify(menuDataJson)]
        );

        console.log(`✅ Menu sauvegardé: ${restaurantName} (${totalItems} plats)`);

        res.json({
            success: true,
            restaurantId: restaurantDbId,
            menuId: menuResult.insertId,
            apiKey: apiKey,
            itemsCount: totalItems,
            message: `Menu sauvegardé avec succès pour ${restaurantName}`
        });

    } catch (error) {
        console.error('❌ Erreur sauvegarde menu:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la sauvegarde',
            details: error.message 
        });
    }
});

// ========================================
// ROUTE 3: Récupérer le menu d'un restaurant (par API key)
// GET /api/menu/:apiKey
// ========================================

router.get('/menu/:apiKey', async (req, res) => {
    try {
        const { apiKey } = req.params;

        if (!apiKey) {
            return res.status(400).json({ 
                error: 'Clé API manquante' 
            });
        }

        const connection = req.app.get('db');

        // Récupérer le restaurant
        const [restaurants] = await connection.query(
            'SELECT id, name FROM restaurants WHERE api_key = ?',
            [apiKey]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({ 
                error: 'Restaurant non trouvé' 
            });
        }

        const restaurant = restaurants[0];

        // Récupérer le menu actif
        const [menus] = await connection.query(
            'SELECT menu_data, version, created_at FROM menus WHERE restaurant_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
            [restaurant.id]
        );

        if (menus.length === 0) {
            return res.status(404).json({ 
                error: 'Aucun menu actif trouvé pour ce restaurant' 
            });
        }

        const menu = menus[0];

        res.json({
            success: true,
            restaurant: {
                id: restaurant.id,
                name: restaurant.name
            },
            menu: JSON.parse(menu.menu_data),
            version: menu.version,
            lastUpdate: menu.created_at
        });

    } catch (error) {
        console.error('❌ Erreur récupération menu:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du menu',
            details: error.message 
        });
    }
});

module.exports = router;


// ========================================
// NOTES D'INSTALLATION
// ========================================

/*

✅ CE FICHIER EST ADAPTÉ POUR :
- Table `restaurants` (id, name, api_key, created_at)
- Table `menus` (id, restaurant_id, menu_data JSON, version, is_active, created_at)

🔧 CONFIGURATION REQUISE :
- SDK Anthropic installé: npm install @anthropic-ai/sdk
- Variable d'environnement: CLAUDE_API_KEY dans .env
- Connexion MySQL disponible via req.app.get('db')

📋 ROUTES DISPONIBLES :
1. POST /api/analyze-menu
   Body: { images: ["data:image/jpeg;base64,..."] }
   
2. POST /api/save-menu
   Body: { restaurantName: "...", categories: {...} }
   
3. GET /api/menu/:apiKey
   Params: apiKey du restaurant

🎯 WORKFLOW :
VocalBoxMaitre → analyze-menu (photos) → édition manuelle → save-menu → clé API générée
*/
module.exports = router;
