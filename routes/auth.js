// ============================================
// VOCALBOX - Routes Authentification
// /home/vocalbox/api/routes/auth.js
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// ============================================
// POST /api/auth/login
// Connexion avec login/password
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                success: false,
                error: 'Login et mot de passe requis'
            });
        }

        // Cas spécial : login ADMIN
        if (login === 'ADMIN') {
            if (password === process.env.ADMIN_PASSWORD || password === 'VocalBoxAdmin2025!') {
                return res.json({
                    success: true,
                    user: {
                        id: 0,
                        login: 'ADMIN',
                        role: 'admin',
                        restaurant: {
                            id: null,
                            nom: 'Administrateur'
                        }
                    },
                    isAdmin: true
                });
            } else {
                return res.status(401).json({
                    success: false,
                    error: 'Mot de passe admin incorrect'
                });
            }
        }

        // Recherche de l'utilisateur
        const [users] = await req.db.execute(`
            SELECT 
                u.id,
                u.login,
                u.email,
                u.password_hash,
                u.password_change_required,
                u.password_change_deadline,
                u.restaurant_id,
                r.nom_restaurant,
                r.code_restaurant
            FROM utilisateurs_restaurant u
            INNER JOIN restaurants r ON u.restaurant_id = r.id
            WHERE u.login = ? AND u.actif = 1
        `, [login]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Identifiants incorrects'
            });
        }

        const user = users[0];

        // Vérifier le mot de passe
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Identifiants incorrects'
            });
        }

        // Vérifier si le changement de mot de passe est expiré
        if (user.password_change_required) {
            const deadline = new Date(user.password_change_deadline);
            const now = new Date();

            if (now > deadline) {
                return res.status(403).json({
                    success: false,
                    error: 'Votre accès est suspendu. Vous devez changer vos identifiants.',
                    expired: true,
                    deadline: user.password_change_deadline
                });
            }
        }

        // Mettre à jour last_login
        await req.db.execute(
            'UPDATE utilisateurs_restaurant SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        console.log(`✅ Connexion réussie: ${user.login} (${user.nom_restaurant})`);

        res.json({
            success: true,
            user: {
                id: user.id,
                login: user.login,
                email: user.email,
                restaurant: {
                    id: user.restaurant_id,
                    nom: user.nom_restaurant,
                    code: user.code_restaurant
                },
                passwordChangeRequired: user.password_change_required,
                passwordChangeDeadline: user.password_change_deadline
            }
        });

    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/auth/change-credentials
// Changer login et/ou mot de passe
// ============================================
router.post('/change-credentials', async (req, res) => {
    try {
        const { userId, currentPassword, newLogin, newPassword } = req.body;

        if (!userId || !currentPassword) {
            return res.status(400).json({
                success: false,
                error: 'Paramètres manquants'
            });
        }

        // Récupérer l'utilisateur
        const [users] = await req.db.execute(
            'SELECT id, login, password_hash FROM utilisateurs_restaurant WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        const user = users[0];

        // Vérifier le mot de passe actuel
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Mot de passe actuel incorrect'
            });
        }

        // Préparer les mises à jour
        const updates = [];
        const values = [];

        if (newLogin && newLogin !== user.login) {
            // Vérifier que le nouveau login n'existe pas déjà
            const [existing] = await req.db.execute(
                'SELECT id FROM utilisateurs_restaurant WHERE login = ? AND id != ?',
                [newLogin, userId]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Ce login est déjà utilisé'
                });
            }

            updates.push('login = ?');
            values.push(newLogin);
        }

        if (newPassword) {
            // Hasher le nouveau mot de passe
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updates.push('password_hash = ?');
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucune modification demandée'
            });
        }

        // Marquer le changement comme effectué
        updates.push('password_change_required = 0');
        updates.push('password_change_deadline = NULL');

        values.push(userId);

        // Mettre à jour
        await req.db.execute(
            `UPDATE utilisateurs_restaurant SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        console.log(`✅ Identifiants changés pour user ID ${userId}`);

        res.json({
            success: true,
            message: 'Identifiants modifiés avec succès',
            newLogin: newLogin || user.login
        });

    } catch (error) {
        console.error('Erreur changement identifiants:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/auth/check-deadline/:userId
// Vérifier le statut de changement de mot de passe
// ============================================
router.get('/check-deadline/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [users] = await req.db.execute(
            'SELECT password_change_required, password_change_deadline FROM utilisateurs_restaurant WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        const user = users[0];

        if (!user.password_change_required) {
            return res.json({
                success: true,
                required: false
            });
        }

        const deadline = new Date(user.password_change_deadline);
        const now = new Date();
        const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            required: true,
            deadline: user.password_change_deadline,
            daysRemaining,
            expired: now > deadline
        });

    } catch (error) {
        console.error('Erreur check deadline:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
