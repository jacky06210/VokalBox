// ============================================
// VOCALBOX - Routes de scan de menu
// /home/vocalbox/api/routes/menu-scan.js
// ============================================

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Client Anthropic
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// Vérifier la clé API au chargement
if (process.env.CLAUDE_API_KEY) {
    console.log('✅ CLAUDE_API_KEY chargée:', process.env.CLAUDE_API_KEY.substring(0, 20) + '...');
} else {
    console.error('❌ CLAUDE_API_KEY MANQUANTE!');
}

// Middleware pour vérifier l'API key du restaurant
const verifyRestaurantKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    
    if (!apiKey) {
        return res.status(401).json({ success: false, error: 'Clé API requise' });
    }
    
    try {
        const [rows] = await req.db.execute(
            'SELECT id, nom_restaurant as nom, api_key FROM restaurants WHERE api_key = ?',
            [apiKey]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Clé API invalide' });
        }
        
        req.restaurant = rows[0];
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur de vérification' });
    }
};

// POST /api/menu-scan/analyze
// Analyse des images de menu avec Claude Vision
function nombreEnLettres(nombre) {
    if (nombre === 0) return 'zéro';
    
    const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
    const dix_dix_neuf = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    
    function convertirEntier(n) {
        if (n === 0) return '';
        if (n < 10) return unites[n];
        if (n >= 10 && n < 20) return dix_dix_neuf[n - 10];
        if (n >= 20 && n < 100) {
            const dizaine = Math.floor(n / 10);
            const unite = n % 10;
            
            if (dizaine === 7 || dizaine === 9) {
                return dizaines[dizaine] + (unite === 0 && dizaine === 8 ? 's' : '') + (unite > 0 ? '-' + (dizaine === 7 ? dix_dix_neuf[unite] : dix_dix_neuf[unite]) : '');
            }
            
            if (dizaine === 8 && unite === 0) return 'quatre-vingts';
            if (dizaine === 8) return 'quatre-vingt-' + unites[unite];
            
            if (unite === 1 && dizaine !== 8) return dizaines[dizaine] + '-et-un';
            if (unite === 0) return dizaines[dizaine];
            return dizaines[dizaine] + '-' + unites[unite];
        }
        if (n >= 100 && n < 1000) {
            const centaine = Math.floor(n / 100);
            const reste = n % 100;
            let result = '';
            
            if (centaine === 1) {
                result = 'cent';
            } else {
                result = unites[centaine] + '-cent';
            }
            
            if (reste === 0 && centaine > 1) result += 's';
            if (reste > 0) result += '-' + convertirEntier(reste);
            
            return result;
        }
        if (n >= 1000 && n < 1000000) {
            const millier = Math.floor(n / 1000);
            const reste = n % 1000;
            let result = '';
            
            if (millier === 1) {
                result = 'mille';
            } else {
                result = convertirEntier(millier) + '-mille';
            }
            
            if (reste > 0) result += '-' + convertirEntier(reste);
            return result;
        }
        return n.toString();
    }
    
    const euros = Math.floor(nombre);
    const centimes = Math.round((nombre - euros) * 100);
    
    let resultat = convertirEntier(euros) + ' euro' + (euros > 1 ? 's' : '');
    
    if (centimes > 0) {
        resultat += ' ' + convertirEntier(centimes);
    }
    
    return resultat;
}

// ============================================
// POST /api/orders/calculate
// Calcul du total d'une commande
// ============================================
router.post('/orders/calculate', async (req, res) => {
    try {
        const { items, restaurantId } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Liste d\'articles requise' 
            });
        }
        
        if (!restaurantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID du restaurant requis' 
            });
        }
        
        console.log(`🧮 Calcul commande pour restaurant ${restaurantId}: ${items.length} articles`);
        
        const connection = await req.db.getConnection();
        
        try {
            const resultItems = [];
            let total = 0;
            
            for (const item of items) {
                const { nom, quantite, taille } = item;
                
                if (!nom || !quantite) {
                    await connection.release();
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Chaque article doit avoir un nom et une quantité' 
                    });
                }
                
                // Recherche du plat dans la BDD
                // 1. Trouver le plat par son nom dans les catégories du restaurant
                const [platRows] = await connection.execute(`
                    SELECT p.id, p.nom, c.restaurant_id
                    FROM plats p
                    INNER JOIN categories c ON p.category_id = c.id
                    WHERE c.restaurant_id = ? AND LOWER(p.nom) = LOWER(?)
                    LIMIT 1
                `, [restaurantId, nom]);
                
                if (platRows.length === 0) {
                    await connection.release();
                    return res.status(404).json({ 
                        success: false, 
                        error: `Plat non trouvé: ${nom}` 
                    });
                }
                
                const platId = platRows[0].id;
                
                // 2. Récupérer le prix correspondant à la taille demandée
                let prixQuery = `
                    SELECT valeur, label, prix_original, promo
                    FROM prix
                    WHERE plat_id = ?
                `;
                
                let prixParams = [platId];
                
                // Si une taille est spécifiée, chercher ce prix spécifique
                if (taille) {
                    prixQuery += ` AND LOWER(label) LIKE LOWER(?)`;
                    prixParams.push(`%${taille}%`);
                }
                
                prixQuery += ` LIMIT 1`;
                
                const [prixRows] = await connection.execute(prixQuery, prixParams);
                
                if (prixRows.length === 0) {
                    await connection.release();
                    return res.status(404).json({ 
                        success: false, 
                        error: `Prix non trouvé pour ${nom}${taille ? ' (' + taille + ')' : ''}` 
                    });
                }
                
                const prixUnitaire = parseFloat(prixRows[0].valeur);
                const sousTotal = prixUnitaire * quantite;
                total += sousTotal;
                
                resultItems.push({
                    nom,
                    quantite,
                    taille: taille || prixRows[0].label,
                    prixUnitaire: prixUnitaire.toFixed(2),
                    sousTotal: sousTotal.toFixed(2)
                });
            }
            
            await connection.release();
            
            const totalEnLettres = nombreEnLettres(total);
            
            console.log(`✅ Commande calculée: ${total.toFixed(2)}€ - ${totalEnLettres}`);
            
            res.json({
                success: true,
                items: resultItems,
                total: parseFloat(total.toFixed(2)),
                totalEnLettres
            });
            
        } catch (error) {
            await connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Erreur calcul commande:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/analyze', verifyRestaurantKey, async (req, res) => {
    try {
        const { images } = req.body; // Array de base64 images
        
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Aucune image fournie' 
            });
        }

        console.log(`📸 Scan de ${images.length} image(s) pour ${req.restaurant.nom}`);

        // Validation des images (taille, mime, base64) avant envoi à Claude
        const MIN_IMAGE_BYTES = 10 * 1024; // 10 KB
        const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
        const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

        for (let i = 0; i < images.length; i++) {
            let img = images[i];
            let mediaType = 'image/jpeg';
            let base64Data = img;

            if (img.startsWith('data:')) {
                const matches = img.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                    return res.status(400).json({ success: false, error: `Image ${i+1} : format data URL invalide` });
                }
                mediaType = matches[1];
                base64Data = matches[2];
            }

            if (!ALLOWED_MIME.includes(mediaType)) {
                return res.status(400).json({ success: false, error: `Image ${i+1} : type MIME non supporté (${mediaType})` });
            }

            let buffer;
            try {
                buffer = Buffer.from(base64Data, 'base64');
            } catch (e) {
                return res.status(400).json({ success: false, error: `Image ${i+1} : base64 invalide` });
            }

            if (buffer.length < MIN_IMAGE_BYTES) {
                return res.status(400).json({ success: false, error: `Image ${i+1} : image trop petite (${Math.round(buffer.length/1024)} KB)` });
            }

            if (buffer.length > MAX_IMAGE_BYTES) {
                return res.status(400).json({ success: false, error: `Image ${i+1} : image trop grande (${Math.round(buffer.length/1024)} KB)` });
            }

            // Normaliser l'image en data URL complète pour la suite
            images[i] = `data:${mediaType};base64,${base64Data}`;
        }

        // Construire le contenu pour Claude Vision
        const content = [];
        
        // Ajouter chaque image
        images.forEach((img, index) => {
            // Extraire le type MIME et les données base64
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

        // Ajouter le prompt
        content.push({
            type: 'text',
            text: `Tu es un expert en extraction de menus de restaurant. Analyse cette/ces image(s) de menu et extrais TOUS les plats avec leurs prix.

RÈGLES IMPORTANTES:
1. Extrais CHAQUE plat visible, même partiellement lisible
2. Regroupe les plats par catégorie (Entrées, Plats, Desserts, Boissons, etc.)
3. Si un plat a plusieurs formats/tailles avec des prix différents, liste chaque prix séparément
4. Détecte les promotions (prix barrés, % de réduction)
5. Si un texte est illisible, mets "[illisible]" et continue
6. Les prix sont en euros (€)

RETOURNE UNIQUEMENT un JSON valide avec cette structure exacte:
{
    "restaurant": "Nom du restaurant si visible, sinon 'Restaurant'",
    "categories": [
        {
            "name": "Nom de la catégorie",
            "items": [
                {
                    "name": "Nom du plat",
                    "description": "Description si présente, sinon null",
                    "prices": [
                        {
                            "label": "Format/taille ou 'Prix unique'",
                            "value": "12.50",
                            "originalPrice": "15.00 si promotion, sinon null",
                            "promo": "pourcentage si promotion, sinon null"
                        }
                    ]
                }
            ]
        }
    ],
    "stats": {
        "totalItems": 0,
        "totalCategories": 0,
        "illisibleItems": 0
    }
}

NE RETOURNE QUE LE JSON, AUCUN TEXTE AVANT OU APRÈS.`
        });

        // Appel à Claude Vision
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ]
        });

        // Extraire le JSON de la réponse
        let menuData;
        const responseText = response.content[0].text;
        
        try {
            // Extraire le JSON de la réponse (gérer les blocs markdown)
            
            // Chercher un bloc JSON encadré par ```json ... ```
            const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonBlockMatch) {
                menuData = JSON.parse(jsonBlockMatch[1].trim());
            } else {
                // Sinon, chercher un objet JSON valide en trouvant les bonnes accolades
                const jsonStart = responseText.indexOf('{');
                if (jsonStart === -1) throw new Error('Aucun JSON trouvé dans la réponse');
                
                let braceCount = 0;
                let jsonEnd = -1;
                for (let i = jsonStart; i < responseText.length; i++) {
                    if (responseText[i] === '{') braceCount++;
                    else if (responseText[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            jsonEnd = i + 1;
                            break;
                        }
                    }
                }
                
                if (jsonEnd === -1) throw new Error('JSON incomplet (accolades non fermées)');
                menuData = JSON.parse(responseText.substring(jsonStart, jsonEnd));
            }
        } catch (parseError) {
            console.error('Erreur parsing JSON:', parseError);
            console.log('Réponse brute:', responseText);
            return res.status(500).json({ 
                success: false, 
                error: 'Erreur lors de l\'analyse du menu',
                rawResponse: responseText
            });
        }

        // Calculer les stats si non présentes
        if (!menuData.stats) {
            let totalItems = 0;
            let illisibleItems = 0;
            
            menuData.categories.forEach(cat => {
                totalItems += cat.items.length;
                cat.items.forEach(item => {
                    if (item.name.includes('[illisible]')) {
                        illisibleItems++;
                    }
                });
            });
            
            menuData.stats = {
                totalItems,
                totalCategories: menuData.categories.length,
                illisibleItems
            };
        }

        // Enregistrer le scan dans l'historique
        await req.db.execute(
            `INSERT INTO menu_scans (restaurant_id, nombre_images, nombre_plats_extraits, nombre_categories, statut) 
             VALUES (?, ?, ?, ?, 'termine')`,
            [req.restaurant.id, images.length, menuData.stats.totalItems, menuData.stats.totalCategories]
        );

        console.log(`✅ Scan terminé: ${menuData.stats.totalItems} plats dans ${menuData.stats.totalCategories} catégories`);

        res.json({
            success: true,
            data: menuData
        });

    } catch (error) {
        console.error('Erreur scan menu:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// POST /api/menu-scan/save
// Sauvegarde le menu extrait dans la base de données
router.post('/save', verifyRestaurantKey, async (req, res) => {
    const connection = await req.db.getConnection();
    
    try {
        const { menuData } = req.body;
        
        if (!menuData || !menuData.categories) {
            return res.status(400).json({ 
                success: false, 
                error: 'Données de menu invalides' 
            });
        }

        await connection.beginTransaction();

        // Supprimer l'ancien menu du restaurant
        await connection.execute(
            'DELETE FROM categories WHERE restaurant_id = ?',
            [req.restaurant.id]
        );

        let totalPlats = 0;

        // Insérer les nouvelles catégories et plats
        for (let catIndex = 0; catIndex < menuData.categories.length; catIndex++) {
            const category = menuData.categories[catIndex];
            
            // Insérer la catégorie
            const [catResult] = await connection.execute(
                'INSERT INTO categories (restaurant_id, nom, ordre) VALUES (?, ?, ?)',
                [req.restaurant.id, category.name, catIndex]
            );
            const categoryId = catResult.insertId;

            // Insérer les plats
            for (const item of category.items) {
                const [platResult] = await connection.execute(
                    'INSERT INTO plats (category_id, nom, description) VALUES (?, ?, ?)',
                    [categoryId, item.name, item.description || null]
                );
                const platId = platResult.insertId;
                totalPlats++;

                // Insérer les prix
                for (const price of item.prices) {
                    await connection.execute(
                        'INSERT INTO prix (plat_id, label, valeur, prix_original, promo) VALUES (?, ?, ?, ?, ?)',
                        [
                            platId,
                            price.label || 'Prix unique',
                            parseFloat(price.value) || 0,
                            price.originalPrice ? parseFloat(price.originalPrice) : null,
                            price.promo ? parseInt(price.promo) : null
                        ]
                    );
                }
            }
        }

        await connection.commit();

        console.log(`💾 Menu sauvegardé: ${totalPlats} plats pour ${req.restaurant.nom}`);

        res.json({
            success: true,
            message: `Menu sauvegardé avec succès: ${totalPlats} plats dans ${menuData.categories.length} catégories`,
            apiKey: req.restaurant.api_key || req.restaurant.apiKey,
            totalPlats: totalPlats,
            itemsCount: totalPlats,
            categories: menuData.categories.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur sauvegarde menu:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    } finally {
        connection.release();
    }
});

// GET /api/menu-scan/menu
// Récupère le menu actuel du restaurant
router.get('/menu', verifyRestaurantKey, async (req, res) => {
    try {
        // Récupérer les catégories
        const [categories] = await req.db.execute(
            'SELECT id, nom, ordre FROM categories WHERE restaurant_id = ? ORDER BY ordre',
            [req.restaurant.id]
        );

        const menuData = {
            restaurant: req.restaurant.nom,
            categories: []
        };

        // Pour chaque catégorie, récupérer les plats et prix
        for (const cat of categories) {
            const [plats] = await req.db.execute(
                'SELECT id, nom, description FROM plats WHERE category_id = ?',
                [cat.id]
            );

            const items = [];
            for (const plat of plats) {
                const [prix] = await req.db.execute(
                    'SELECT label, valeur, prix_original, promo FROM prix WHERE plat_id = ?',
                    [plat.id]
                );

                items.push({
                    id: plat.id,
                    name: plat.nom,
                    description: plat.description,
                    prices: prix.map(p => ({
                        label: p.label,
                        value: p.valeur.toString(),
                        originalPrice: p.prix_original ? p.prix_original.toString() : null,
                        promo: p.promo
                    }))
                });
            }

            menuData.categories.push({
                id: cat.id,
                name: cat.nom,
                items
            });
        }

        res.json({
            success: true,
            data: menuData
        });

    } catch (error) {
        console.error('Erreur récupération menu:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET /api/menu-scan/verify/:apiKey
// Vérifie si une clé API est valide (pour la page de connexion)
router.get('/verify/:apiKey', async (req, res) => {
    try {
        const [rows] = await req.db.execute(
            'SELECT id, nom_restaurant as nom, api_key FROM restaurants WHERE api_key = ?',
            [req.params.apiKey]
        );
        
        if (rows.length === 0) {
            return res.json({ success: false, error: 'Code invalide' });
        }
        
        res.json({ 
            success: true, 
            restaurant: {
                id: rows[0].id,
                nom: rows[0].nom
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ====================================================
// NOUVELLE ROUTE : POST /api/menu-scan/save-with-restaurant
// Crée le restaurant s'il n'existe pas, puis sauvegarde le menu
// ====================================================
const generateApiKey = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `KEY-${timestamp}-${randomStr}`;
};

router.post('/save-with-restaurant', async (req, res) => {
    const connection = await req.db.getConnection();
    
    try {
        const { 
            restaurantName, 
            restaurantCode,
            phoneNumber,
            menuData,
            address = {},
            contact = {}
        } = req.body;
        
        if (!restaurantName || !restaurantCode) {
            return res.status(400).json({
                success: false,
                error: 'restaurantName et restaurantCode sont requis'
            });
        }

        if (!menuData || !menuData.categories) {
            return res.status(400).json({
                success: false,
                error: 'Données de menu invalides'
            });
        }

        await connection.beginTransaction();

        // Vérifier si le restaurant existe
        const [existing] = await connection.execute(
            'SELECT id, api_key FROM restaurants WHERE code_restaurant = ?',
            [restaurantCode]
        );

        let restaurantId, apiKey;

        if (existing.length > 0) {
            // Restaurant existe, utiliser son ID et clé API
            restaurantId = existing[0].id;
            apiKey = existing[0].api_key;
            console.log(`🏪 Restaurant existant trouvé: ${restaurantCode} (id: ${restaurantId})`);
        } else {
            // Créer un nouveau restaurant
            const newApiKey = generateApiKey();
            const phone = phoneNumber || '0000000000';
            
            const [result] = await connection.execute(
                `INSERT INTO restaurants (
                    code_restaurant, 
                    nom_restaurant, 
                    phone_number, 
                    api_key,
                    adresse_rue,
                    code_postal,
                    ville,
                    email,
                    site_web,
                    actif,
                    statut_abonnement
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'actif')`,
                [
                    restaurantCode,
                    restaurantName,
                    phone,
                    newApiKey,
                    address.street || null,
                    address.postalCode || null,
                    address.city || null,
                    contact.email || null,
                    contact.website || null
                ]
            );
            
            restaurantId = result.insertId;
            apiKey = newApiKey;
            console.log(`✅ Nouveau restaurant créé: ${restaurantName} (id: ${restaurantId}, clé: ${apiKey})`);
        }

        // Supprimer l'ancien menu du restaurant
        await connection.execute(
            'DELETE FROM categories WHERE restaurant_id = ?',
            [restaurantId]
        );

        let totalPlats = 0;

        // Insérer les nouvelles catégories et plats
        for (let catIndex = 0; catIndex < menuData.categories.length; catIndex++) {
            const category = menuData.categories[catIndex];
            
            // Insérer la catégorie
            const [catResult] = await connection.execute(
                'INSERT INTO categories (restaurant_id, nom, ordre) VALUES (?, ?, ?)',
                [restaurantId, category.name, catIndex]
            );
            const categoryId = catResult.insertId;
            
            // Insérer les plats
            if (category.items && Array.isArray(category.items)) {
                for (const item of category.items) {
                    const [platResult] = await connection.execute(
                        'INSERT INTO plats (category_id, nom, description) VALUES (?, ?, ?)',
                        [categoryId, item.name, item.description || null]
                    );
                    const platId = platResult.insertId;
                    totalPlats++;

                    // Insérer les prix
                    if (item.prices && Array.isArray(item.prices)) {
                        for (const price of item.prices) {
                            await connection.execute(
                                'INSERT INTO prix (plat_id, label, valeur, prix_original, promo) VALUES (?, ?, ?, ?, ?)',
                                [
                                    platId,
                                    price.label || 'Prix unique',
                                    parseFloat(price.value) || 0,
                                    price.originalPrice ? parseFloat(price.originalPrice) : null,
                                    price.promo ? parseInt(price.promo) : null
                                ]
                            );
                        }
                    }
                }
            }
        }

        await connection.commit();

        console.log(`💾 Menu sauvegardé: ${totalPlats} plats pour ${restaurantName}`);
        
        res.json({
            success: true,
            message: `Menu sauvegardé avec succès: ${totalPlats} plats dans ${menuData.categories.length} catégories`,
            restaurantId: restaurantId,
            restaurantName: restaurantName,
            apiKey: apiKey,
            totalPlats: totalPlats,
            itemsCount: totalPlats,
            categories: menuData.categories.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Erreur sauvegarde menu avec restaurant:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});


module.exports = router;
