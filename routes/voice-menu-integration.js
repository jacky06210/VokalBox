/**
 * INTEGRATION TELNYX ↔ VOKALBOXMAÎTRE
 * Endpoint pour récupérer les menus numérisés via VokalBoxMaître
 * pour l'assistant vocal Telnyx
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/voice/menu-vokalbox
 * Récupère le menu d'un restaurant depuis VokalBoxMaître
 * Pour l'utilisation par l'AI Assistant Telnyx
 * 
 * Paramètres query:
 * - restaurant_code (requis): Code du restaurant (ex: REST-001)
 * - category (optionnel): Filtrer par catégorie
 * - promo (optionnel): Uniquement les promos (true/false)
 */
router.get('/menu-vokalbox', async (req, res) => {
    try {
        const { restaurant_code, category, promo } = req.query;

        if (!restaurant_code) {
            return res.status(400).json({
                success: false,
                error: 'Paramètre restaurant_code requis'
            });
        }

        console.log(`[Menu VokalBox] Requête menu pour restaurant: ${restaurant_code}`);

        // Récupérer le restaurant par son api_key (code restaurant)
        const [restaurants] = await req.db.execute(
            'SELECT id, nom_restaurant, telephone_resto FROM restaurants WHERE api_key = ?',
            [restaurant_code]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant non trouvé'
            });
        }

        const restaurant = restaurants[0];
        console.log(`[Menu VokalBox] Restaurant trouvé: ${restaurant.nom_restaurant} (ID: ${restaurant.id})`);

        // Récupérer les catégories
        let categoriesQuery = 'SELECT id, nom, ordre FROM categories WHERE restaurant_id = ?';
        let categoriesParams = [restaurant.id];

        if (category) {
            categoriesQuery += ' AND LOWER(nom) LIKE ?';
            categoriesParams.push(`%${category.toLowerCase()}%`);
        }

        categoriesQuery += ' ORDER BY ordre';

        const [categories] = await req.db.execute(categoriesQuery, categoriesParams);

        if (categories.length === 0) {
            return res.json({
                success: true,
                restaurant: {
                    code: restaurant_code,
                    nom: restaurant.nom_restaurant,
                    telephone: restaurant.telephone_resto
                },
                menu: {
                    categories: []
                },
                formatted_text: `${restaurant.nom_restaurant} n'a pas encore de menu numérisé.`
            });
        }

        // Construire le menu
        const menuData = {
            categories: []
        };

        let formattedText = `MENU ${restaurant.nom_restaurant.toUpperCase()}\n\n`;
        let totalPlats = 0;

        for (const cat of categories) {
            // Récupérer les plats de la catégorie
            const [plats] = await req.db.execute(
                'SELECT id, nom, description FROM plats WHERE category_id = ?',
                [cat.id]
            );

            const items = [];

            for (const plat of plats) {
                // Récupérer les prix du plat
                const [prix] = await req.db.execute(
                    'SELECT label, valeur, prix_original, promo FROM prix WHERE plat_id = ?',
                    [plat.id]
                );

                // Filtrer par promo si demandé
                if (promo === 'true') {
                    const hasPromo = prix.some(p => p.promo !== null && p.promo > 0);
                    if (!hasPromo) {
                        continue; // Passer ce plat si pas de promo
                    }
                }

                if (prix.length > 0) {
                    items.push({
                        nom: plat.nom,
                        description: plat.description,
                        prix: prix.map(p => ({
                            label: p.label,
                            valeur: parseFloat(p.valeur).toFixed(2),
                            prix_original: p.prix_original ? parseFloat(p.prix_original).toFixed(2) : null,
                            promo: p.promo
                        }))
                    });
                    totalPlats++;
                }
            }

            // Ajouter la catégorie si elle a des plats
            if (items.length > 0) {
                menuData.categories.push({
                    nom: cat.nom,
                    plats: items
                });

                // Construire le texte formaté
                formattedText += `${cat.nom.toUpperCase()}:\n`;
                items.forEach(item => {
                    // Si plusieurs prix (formats différents)
                    if (item.prix.length > 1) {
                        formattedText += `- ${item.nom}`;
                        if (item.description) {
                            formattedText += ` (${item.description})`;
                        }
                        formattedText += `:\n`;
                        item.prix.forEach(p => {
                            formattedText += `  • ${p.label}: ${p.valeur}€`;
                            if (p.promo) {
                                formattedText += ` [PROMO -${p.promo}%]`;
                            }
                            formattedText += `\n`;
                        });
                    } else {
                        // Un seul prix
                        const p = item.prix[0];
                        formattedText += `- ${item.nom} (${p.valeur}€)`;
                        if (item.description) {
                            formattedText += `: ${item.description}`;
                        }
                        if (p.promo) {
                            formattedText += ` [PROMO -${p.promo}%, prix normal ${p.prix_original}€]`;
                        }
                        formattedText += `\n`;
                    }
                });
                formattedText += `\n`;
            }
        }

        console.log(`[Menu VokalBox] Menu récupéré: ${totalPlats} plats dans ${menuData.categories.length} catégories`);

        res.json({
            success: true,
            restaurant: {
                code: restaurant_code,
                nom: restaurant.nom_restaurant,
                telephone: restaurant.telephone_resto
            },
            menu: menuData,
            stats: {
                totalCategories: menuData.categories.length,
                totalPlats: totalPlats
            },
            formatted_text: formattedText
        });

    } catch (error) {
        console.error('[Menu VokalBox] Erreur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération du menu',
            details: error.message
        });
    }
});

module.exports = router;
