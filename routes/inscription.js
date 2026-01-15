const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mysql = require('mysql2/promise');
const Anthropic = require('@anthropic-ai/sdk');
const emailService = require('../config/email');
require('dotenv').config();

// Configuration de multer pour l'upload des menus
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/inscriptions');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'menu-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Seules les images JPG et PNG sont autorisées'));
    }
});

// Configuration base de données
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'vocalbox_user',
    password: process.env.DB_PASSWORD || 'VocalBox2024Secure',
    database: process.env.DB_NAME || 'vocalbox'
};

// Configuration Stripe (à compléter avec vos clés)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

// Configuration PayPal (à compléter)
// const paypal = require('@paypal/checkout-server-sdk');

/**
 * POST /api/inscription/submit
 * Soumettre le formulaire d'inscription
 */
router.post('/submit', upload.array('menuFiles', 10), async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const {
            nomRestaurant,
            adresse,
            email,
            telephone,
            paymentMethod,
            commercialNom,
            commercialTel,
            commercialEmail
        } = req.body;

        // Validation
        if (!nomRestaurant || !adresse || !email || !telephone || !paymentMethod) {
            return res.status(400).json({ error: 'Données incomplètes' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier menu téléchargé' });
        }

        // Sauvegarder les chemins des fichiers
        const menuFilePaths = req.files.map(f => f.path);

        // Insérer l'inscription dans la base de données
        const [result] = await connection.execute(
            `INSERT INTO inscriptions 
            (nom_restaurant, adresse, email, telephone, commercial_nom, commercial_tel, commercial_email, payment_method, amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nomRestaurant, adresse, email, telephone, commercialNom || null, commercialTel || null, commercialEmail || null, paymentMethod, 49.00]
        );

        const inscriptionId = result.insertId;

        // Sauvegarder les chemins de fichiers dans un fichier JSON temporaire
        const metadataPath = path.join(__dirname, `../uploads/inscriptions/metadata-${inscriptionId}.json`);
        await fs.writeFile(metadataPath, JSON.stringify({
            inscriptionId,
            menuFiles: menuFilePaths,
            nomRestaurant,
            email
        }));

        // Créer une session de paiement selon la méthode choisie
        if (paymentMethod === 'stripe') {
            // Créer une session Stripe Checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'VokalBox - Abonnement Restaurant',
                            description: 'Réponse téléphonique IA 24/7 pour votre restaurant'
                        },
                        unit_amount: 4900, // 49.00 EUR en centimes
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${req.protocol}://${req.get('host')}/api/inscription/stripe/success?session_id={CHECKOUT_SESSION_ID}&inscription_id=${inscriptionId}`,
                cancel_url: `${req.protocol}://${req.get('host')}/inscription?error=payment_cancelled`,
                metadata: {
                    inscription_id: inscriptionId.toString()
                }
            });

            // Mettre à jour l'inscription avec l'ID de session Stripe
            await connection.execute(
                'UPDATE inscriptions SET payment_id = ? WHERE id = ?',
                [session.id, inscriptionId]
            );

            res.json({ checkoutUrl: session.url });

        } else if (paymentMethod === 'paypal') {
            // TODO: Implémenter PayPal
            // Pour l'instant, simulation
            res.json({ 
                approvalUrl: `${req.protocol}://${req.get('host')}/api/inscription/paypal/approve?inscription_id=${inscriptionId}`,
                message: 'PayPal en cours d\'implémentation'
            });
        } else {
            return res.status(400).json({ error: 'Méthode de paiement invalide' });
        }

    } catch (error) {
        console.error('Erreur soumission inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription', details: error.message });
    } finally {
        await connection.end();
    }
});

/**
 * GET /api/inscription/stripe/success
 * Callback de succès Stripe
 */
router.get('/stripe/success', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);

    try {
        const { session_id, inscription_id } = req.query;

        // Vérifier la session Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            // Mettre à jour le statut de paiement
            await connection.execute(
                `UPDATE inscriptions 
                SET payment_status = 'completed', payment_completed_at = NOW() 
                WHERE id = ?`,
                [inscription_id]
            );

            // Récupérer les infos de l'inscription
            const [rows] = await connection.execute(
                'SELECT * FROM inscriptions WHERE id = ?',
                [inscription_id]
            );

            if (rows.length > 0) {
                const inscription = rows[0];

                // Envoyer l'email post-paiement
                await sendPostPaymentEmail(inscription);

                // Lancer la numérisation en arrière-plan
                setTimeout(() => {
                    processDigitization(inscription_id);
                }, 1000);

                // Rediriger vers la page de confirmation
                res.redirect(`/inscription/confirmation?id=${inscription_id}`);
            } else {
                res.status(404).send('Inscription non trouvée');
            }
        } else {
            res.status(400).send('Paiement non complété');
        }

    } catch (error) {
        console.error('Erreur callback Stripe:', error);
        res.status(500).send('Erreur lors de la vérification du paiement');
    } finally {
        await connection.end();
    }
});

/**
 * GET /api/inscription/paypal/approve
 * Callback PayPal (simulation pour le moment)
 */
router.get('/paypal/approve', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);

    try {
        const { inscription_id } = req.query;

        // TODO: Vérifier le paiement PayPal
        // Pour l'instant, simulation
        await connection.execute(
            `UPDATE inscriptions 
            SET payment_status = 'completed', payment_completed_at = NOW() 
            WHERE id = ?`,
            [inscription_id]
        );

        const [rows] = await connection.execute(
            'SELECT * FROM inscriptions WHERE id = ?',
            [inscription_id]
        );

        if (rows.length > 0) {
            const inscription = rows[0];
            await sendPostPaymentEmail(inscription);
            setTimeout(() => processDigitization(inscription_id), 1000);
            res.redirect(`/inscription/confirmation?id=${inscription_id}`);
        } else {
            res.status(404).send('Inscription non trouvée');
        }

    } catch (error) {
        console.error('Erreur callback PayPal:', error);
        res.status(500).send('Erreur lors de la vérification du paiement');
    } finally {
        await connection.end();
    }
});

/**
 * GET /api/inscription/status/:id
 * Vérifier le statut de l'inscription
 */
router.get('/status/:id', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);

    try {
        const [rows] = await connection.execute(
            'SELECT id, nom_restaurant, payment_status, digitization_status, validation_status FROM inscriptions WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Inscription non trouvée' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Erreur récupération statut:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        await connection.end();
    }
});

/**
 * POST /api/inscription/validate/:id
 * Valider le menu numérisé ou signaler des erreurs
 */
router.post('/validate/:id', express.json(), async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);

    try {
        const { hasErrors, errorReport } = req.body;
        const inscriptionId = req.params.id;

        const [rows] = await connection.execute(
            'SELECT * FROM inscriptions WHERE id = ?',
            [inscriptionId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Inscription non trouvée' });
        }

        const inscription = rows[0];

        if (hasErrors && errorReport) {
            // Le restaurateur a signalé des erreurs
            await connection.execute(
                `UPDATE inscriptions 
                SET validation_status = 'has_errors', error_report = ?, validation_completed_at = NOW() 
                WHERE id = ?`,
                [errorReport, inscriptionId]
            );

            // Envoyer l'email à technique@vokalbox.fr
            await sendErrorReportEmail(inscription, errorReport);

            res.json({ 
                success: true, 
                message: 'Votre rapport d\'erreur a été envoyé. Notre équipe technique va le traiter dans les plus brefs délais.' 
            });

        } else {
            // Tout est OK
            await connection.execute(
                `UPDATE inscriptions 
                SET validation_status = 'validated', validation_completed_at = NOW() 
                WHERE id = ?`,
                [inscriptionId]
            );

            // Envoyer l'email "sous 48h"
            await sendAwaitingSetupEmail(inscription);

            // Envoyer un SMS à l'admin (06 13 95 51 99)
            await sendAdminSMS(inscription);

            res.json({ 
                success: true, 
                message: 'Parfait ! Vous recevrez un email et un SMS sous 48h avec vos identifiants et votre numéro VokalBox.' 
            });
        }

    } catch (error) {
        console.error('Erreur validation:', error);
        res.status(500).json({ error: 'Erreur lors de la validation' });
    } finally {
        await connection.end();
    }
});

/**
 * Fonction pour numériser les menus avec Claude Vision
 */
async function processDigitization(inscriptionId) {
    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log(`Début numérisation pour inscription ${inscriptionId}`);

        // Mettre à jour le statut
        await connection.execute(
            'UPDATE inscriptions SET digitization_status = ? WHERE id = ?',
            ['in_progress', inscriptionId]
        );

        // Récupérer les métadonnées
        const metadataPath = path.join(__dirname, `../uploads/inscriptions/metadata-${inscriptionId}.json`);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

        const anthropic = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });

        const menuResults = [];

        // Numériser chaque image
        for (const menuFilePath of metadata.menuFiles) {
            const imageData = await fs.readFile(menuFilePath);
            const base64Image = imageData.toString('base64');
            const mimeType = menuFilePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

            const message = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mimeType,
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: `Analyse cette page de menu de restaurant et extrais toutes les informations en JSON :
{
  "categories": [
    {
      "nom": "Nom de la catégorie",
      "plats": [
        {
          "nom": "Nom du plat",
          "description": "Description",
          "prix": 12.50,
          "allergenes": ["gluten", "lactose"],
          "disponibilite": "midi et soir"
        }
      ]
    }
  ]
}`
                        }
                    ]
                }]
            });

            try {
                const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const menuData = JSON.parse(jsonMatch[0]);
                    menuResults.push(menuData);
                }
            } catch (parseError) {
                console.error('Erreur parsing JSON:', parseError);
                menuResults.push({ error: 'Erreur de parsing', raw: message.content[0].text });
            }
        }

        // Sauvegarder les résultats
        await connection.execute(
            `UPDATE inscriptions 
            SET digitization_status = 'completed', 
                menu_data = ?, 
                digitization_completed_at = NOW() 
            WHERE id = ?`,
            [JSON.stringify(menuResults), inscriptionId]
        );

        // Envoyer email avec le menu numérisé
        const [rows] = await connection.execute('SELECT * FROM inscriptions WHERE id = ?', [inscriptionId]);
        if (rows.length > 0) {
            await sendDigitizedMenuEmail(rows[0], menuResults);
        }

        // Envoyer SMS à l'admin
        await sendAdminSMS(rows[0]);

        console.log(`Numérisation terminée pour inscription ${inscriptionId}`);

    } catch (error) {
        console.error('Erreur numérisation:', error);
        await connection.execute(
            'UPDATE inscriptions SET digitization_status = ? WHERE id = ?',
            ['error', inscriptionId]
        );
    } finally {
        await connection.end();
    }
}

/**
 * Envoyer l'email post-paiement
 */
async function sendPostPaymentEmail(inscription) {
    const subject = 'VokalBox - Paiement confirmé, numérisation en cours';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">Paiement confirmé !</h2>
            <p>Bonjour,</p>
            <p>Nous avons bien reçu votre paiement de <strong>49€ HT</strong> pour l'abonnement VokalBox de <strong>${inscription.nom_restaurant}</strong>.</p>
            <p>Votre menu est actuellement en cours de numérisation par notre IA. Vous recevrez un nouvel email dans quelques minutes avec le résultat.</p>
            <p>Cordialement,<br>L'équipe VokalBox</p>
        </div>
    `;

    try {
        await emailService.sendEmail(inscription.email, subject, html);
    } catch (error) {
        console.error('Erreur envoi email post-paiement:', error);
    }
}

/**
 * Envoyer l'email avec le menu numérisé
 */
async function sendDigitizedMenuEmail(inscription, menuData) {
    const subject = 'VokalBox - Votre menu numérisé est prêt';
    const validationUrl = `https://inscription.vokalbox.fr/validation?id=${inscription.id}`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">Votre menu a été numérisé !</h2>
            <p>Bonjour,</p>
            <p>Votre menu pour <strong>${inscription.nom_restaurant}</strong> a été numérisé avec succès.</p>
            <p><a href="${validationUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Visualiser et valider mon menu</a></p>
            <p>Si vous constatez des erreurs, vous pourrez les signaler directement sur la page de validation.</p>
            <p>Cordialement,<br>L'équipe VokalBox</p>
        </div>
    `;

    try {
        await emailService.sendEmail(inscription.email, subject, html);
    } catch (error) {
        console.error('Erreur envoi email menu numérisé:', error);
    }
}

/**
 * Envoyer l'email de rapport d'erreur à technique@vokalbox.fr
 */
async function sendErrorReportEmail(inscription, errorReport) {
    const subject = `VokalBox - Erreurs signalées pour ${inscription.nom_restaurant}`;
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #dc3545;">Rapport d'erreur de numérisation</h2>
            <p><strong>Restaurant :</strong> ${inscription.nom_restaurant}</p>
            <p><strong>Email :</strong> ${inscription.email}</p>
            <p><strong>Téléphone :</strong> ${inscription.telephone}</p>
            <h3>Erreurs signalées :</h3>
            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545;">
                ${errorReport.replace(/\n/g, '<br>')}
            </div>
            <p><a href="https://app.vokalbox.fr/admin">Accéder à l'admin</a></p>
        </div>
    `;

    try {
        await emailService.sendEmail('technique@vokalbox.fr', subject, html);
    } catch (error) {
        console.error('Erreur envoi email technique:', error);
    }
}

/**
 * Envoyer l'email "sous 48h"
 */
async function sendAwaitingSetupEmail(inscription) {
    const subject = 'VokalBox - Configuration en cours';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Menu validé avec succès !</h2>
            <p>Bonjour,</p>
            <p>Merci d'avoir validé votre menu pour <strong>${inscription.nom_restaurant}</strong>.</p>
            <p>Notre équipe technique finalise la configuration de votre répondeur IA.</p>
            <p><strong>Vous recevrez sous 48h maximum :</strong></p>
            <ul>
                <li>Votre login et mot de passe</li>
                <li>Votre numéro de téléphone VokalBox dédié</li>
                <li>Les instructions de redirection de vos appels</li>
            </ul>
            <p>Cordialement,<br>L'équipe VokalBox</p>
        </div>
    `;

    try {
        await emailService.sendEmail(inscription.email, subject, html);
    } catch (error) {
        console.error('Erreur envoi email attente 48h:', error);
    }
}

/**
 * Envoyer un SMS à l'admin
 */
async function sendAdminSMS(inscription) {
    // TODO: Implémenter l'envoi de SMS via Telnyx
    // Pour l'instant, juste un log
    console.log(`SMS à envoyer à 06 13 95 51 99: Nouvelle inscription validée pour ${inscription.nom_restaurant}`);
}

module.exports = router;
