// ============================================
// VOCALBOX - Routes Admin
// /home/vocalbox/api/routes/admin.js
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../config/email');

// ============================================
// GET /api/admin/restaurants
// Liste tous les restaurants avec stats
// ============================================
router.get('/restaurants', async (req, res) => {
    try {
        const [restaurants] = await req.db.execute(`
            SELECT 
                r.*,
                COUNT(DISTINCT c.id) as nombre_categories,
                COUNT(DISTINCT p.id) as nombre_plats
            FROM restaurants r
            LEFT JOIN categories c ON c.restaurant_id = r.id
            LEFT JOIN plats p ON p.category_id = c.id
            GROUP BY r.id
            ORDER BY r.id DESC
        `);

        res.json({
            success: true,
            restaurants
        });
    } catch (error) {
        console.error('Erreur liste restaurants:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/admin/next-code
// Génère le prochain code restaurant disponible
// ============================================
router.get('/next-code', async (req, res) => {
    try {
        const [rows] = await req.db.execute(`
            SELECT code_restaurant 
            FROM restaurants 
            WHERE code_restaurant LIKE 'REST-%'
            ORDER BY code_restaurant DESC 
            LIMIT 1
        `);

        let nextNumber = 1;
        if (rows.length > 0) {
            const lastCode = rows[0].code_restaurant;
            const match = lastCode.match(/REST-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const nextCode = `REST-${String(nextNumber).padStart(3, '0')}`;

        res.json({
            success: true,
            code: nextCode
        });
    } catch (error) {
        console.error('Erreur génération code:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/admin/restaurants
// Créer un nouveau restaurant + utilisateur + email
// ============================================
router.post('/restaurants', async (req, res) => {
    const connection = await req.db.getConnection();
    
    try {
        const {
            code_restaurant,
            nom_restaurant,
            email,
            telephone_resto,
            telnyx_phone_number,
            site_web,
            adresse_rue,
            code_postal,
            ville,
            horaires_midi_debut,
            horaires_midi_fin,
            horaires_soir_debut,
            horaires_soir_fin,
            capacite_couverts,
            statut_abonnement,
            actif
        } = req.body;

        // Validation
        if (!nom_restaurant || !email || !telnyx_phone_number || !code_restaurant) {
            return res.status(400).json({
                success: false,
                error: 'Champs obligatoires manquants'
            });
        }

        await connection.beginTransaction();

        // Vérifier que le code n'existe pas déjà
        const [existing] = await connection.execute(
            'SELECT id FROM restaurants WHERE code_restaurant = ?',
            [code_restaurant]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Ce code restaurant existe déjà'
            });
        }

        // Construire l'adresse complète
        const adresse_complete = [adresse_rue, code_postal, ville]
            .filter(Boolean)
            .join(', ');

        // Construire le texte des horaires
        const horaires_texte = `Midi ${horaires_midi_debut || '12:00'}-${horaires_midi_fin || '14:30'} / Soir ${horaires_soir_debut || '19:00'}-${horaires_soir_fin || '22:30'}`;

        // 1. Insérer le restaurant
        const [result] = await connection.execute(`
            INSERT INTO restaurants (
                code_restaurant,
                api_key,
                telnyx_phone_number,
                nom_restaurant,
                adresse_rue,
                code_postal,
                ville,
                adresse_complete,
                telephone_resto,
                email,
                site_web,
                horaires_midi_debut,
                horaires_midi_fin,
                horaires_soir_debut,
                horaires_soir_fin,
                horaires_texte,
                capacite_couverts,
                statut_abonnement,
                actif
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            code_restaurant,
            code_restaurant,
            telnyx_phone_number,
            nom_restaurant,
            adresse_rue || null,
            code_postal || null,
            ville || null,
            adresse_complete || null,
            telephone_resto || null,
            email,
            site_web || null,
            horaires_midi_debut || '12:00:00',
            horaires_midi_fin || '14:30:00',
            horaires_soir_debut || '19:00:00',
            horaires_soir_fin || '22:30:00',
            horaires_texte,
            capacite_couverts || 40,
            statut_abonnement || 'essai',
            actif !== undefined ? actif : 1
        ]);

        const restaurantId = result.insertId;

        // 2. Créer l'utilisateur
        const login = code_restaurant; // REST-001
        const passwordTemp = email; // Email comme mot de passe temporaire
        const passwordHash = await bcrypt.hash(passwordTemp, 10);
        
        // Calculer la deadline (J+8)
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 8);
        const deadlineStr = deadline.toISOString().split('T')[0];

        await connection.execute(`
            INSERT INTO utilisateurs_restaurant (
                login,
                restaurant_id,
                email,
                password_hash,
                password_change_required,
                password_change_deadline,
                nom,
                role,
                actif
            ) VALUES (?, ?, ?, ?, 1, ?, ?, 'admin', 1)
        `, [login, restaurantId, email, passwordHash, deadlineStr, nom_restaurant]);

        await connection.commit();

        console.log(`✅ Restaurant créé: ${nom_restaurant} (${code_restaurant})`);
        console.log(`✅ Utilisateur créé: ${login}`);

        // 3. Envoyer l'email de bienvenue (asynchrone, ne pas bloquer)
        sendWelcomeEmail(
            { nom_restaurant, email },
            { login, password_temp: passwordTemp }
        ).then(result => {
            if (result.success) {
                console.log(`📧 Email envoyé à ${email}`);
            } else {
                console.error(`❌ Échec envoi email: ${result.error}`);
            }
        }).catch(err => {
            console.error(`❌ Erreur envoi email:`, err);
        });

        res.json({
            success: true,
            message: 'Restaurant et utilisateur créés avec succès',
            id: restaurantId,
            code: code_restaurant,
            login: login,
            emailSent: true
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur création restaurant:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// ============================================
// PUT /api/admin/restaurants/:id
// Modifier un restaurant existant
// ============================================
router.put('/restaurants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nom_restaurant,
            email,
            telephone_resto,
            telnyx_phone_number,
            site_web,
            adresse_rue,
            code_postal,
            ville,
            horaires_midi_debut,
            horaires_midi_fin,
            horaires_soir_debut,
            horaires_soir_fin,
            capacite_couverts,
            statut_abonnement,
            actif
        } = req.body;

        // Vérifier que le restaurant existe
        const [existing] = await req.db.execute(
            'SELECT id FROM restaurants WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant non trouvé'
            });
        }

        // Construire l'adresse complète
        const adresse_complete = [adresse_rue, code_postal, ville]
            .filter(Boolean)
            .join(', ');

        // Construire le texte des horaires
        const horaires_texte = `Midi ${horaires_midi_debut || '12:00'}-${horaires_midi_fin || '14:30'} / Soir ${horaires_soir_debut || '19:00'}-${horaires_soir_fin || '22:30'}`;

        // Mettre à jour
        await req.db.execute(`
            UPDATE restaurants SET
                nom_restaurant = ?,
                email = ?,
                telephone_resto = ?,
                telnyx_phone_number = ?,
                site_web = ?,
                adresse_rue = ?,
                code_postal = ?,
                ville = ?,
                adresse_complete = ?,
                horaires_midi_debut = ?,
                horaires_midi_fin = ?,
                horaires_soir_debut = ?,
                horaires_soir_fin = ?,
                horaires_texte = ?,
                capacite_couverts = ?,
                statut_abonnement = ?,
                actif = ?,
                derniere_modification = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nom_restaurant,
            email,
            telephone_resto || null,
            telnyx_phone_number,
            site_web || null,
            adresse_rue || null,
            code_postal || null,
            ville || null,
            adresse_complete || null,
            horaires_midi_debut || '12:00:00',
            horaires_midi_fin || '14:30:00',
            horaires_soir_debut || '19:00:00',
            horaires_soir_fin || '22:30:00',
            horaires_texte,
            capacite_couverts || 40,
            statut_abonnement || 'essai',
            actif !== undefined ? actif : 1,
            id
        ]);

        console.log(`✅ Restaurant modifié: ${nom_restaurant} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Restaurant modifié avec succès'
        });

    } catch (error) {
        console.error('Erreur modification restaurant:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /api/admin/restaurants/:id
// Supprimer un restaurant et ses données
// ============================================
router.delete('/restaurants/:id', async (req, res) => {
    const connection = await req.db.getConnection();

    try {
        const { id } = req.params;

        await connection.beginTransaction();

        // Récupérer le nom pour le log
        const [resto] = await connection.execute(
            'SELECT nom_restaurant FROM restaurants WHERE id = ?',
            [id]
        );

        if (resto.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Restaurant non trouvé'
            });
        }

        const nom = resto[0].nom_restaurant;

        // Supprimer en cascade
        // 0. Supprimer l'utilisateur
        await connection.execute(
            'DELETE FROM utilisateurs_restaurant WHERE restaurant_id = ?',
            [id]
        );

        // 1. Supprimer les prix
        await connection.execute(`
            DELETE prix FROM prix
            INNER JOIN plats ON prix.plat_id = plats.id
            INNER JOIN categories ON plats.category_id = categories.id
            WHERE categories.restaurant_id = ?
        `, [id]);

        // 2. Supprimer les plats
        await connection.execute(`
            DELETE plats FROM plats
            INNER JOIN categories ON plats.category_id = categories.id
            WHERE categories.restaurant_id = ?
        `, [id]);

        // 3. Supprimer les catégories
        await connection.execute(
            'DELETE FROM categories WHERE restaurant_id = ?',
            [id]
        );

        // 4. Supprimer les scans de menu
        await connection.execute(
            'DELETE FROM menu_scans WHERE restaurant_id = ?',
            [id]
        );

        // 5. Supprimer le restaurant
        await connection.execute(
            'DELETE FROM restaurants WHERE id = ?',
            [id]
        );

        await connection.commit();

        console.log(`🗑️ Restaurant supprimé: ${nom} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Restaurant et toutes ses données supprimés avec succès'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erreur suppression restaurant:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
