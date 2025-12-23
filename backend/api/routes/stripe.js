// routes/stripe.js
// Routes pour les webhooks Stripe

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../config/database');

/**
 * POST /webhooks/stripe
 * Webhook pour recevoir les événements Stripe
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Vérifier la signature du webhook
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('❌ Erreur signature webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Webhook Stripe reçu:', event.type);

    // Traiter l'événement
    try {
        switch (event.type) {
            
            // Paiement réussi
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;

            // Paiement échoué
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            // Abonnement créé
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            // Abonnement mis à jour
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            // Abonnement supprimé
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            // Facture payée
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;

            // Facture échouée
            case 'invoice.payment_failed':
                await handleInvoiceFailed(event.data.object);
                break;

            default:
                console.log(`Type d'événement non géré: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('❌ Erreur traitement webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Gérer le succès d'un paiement
 */
async function handlePaymentSuccess(paymentIntent) {
    console.log('💰 Paiement réussi:', paymentIntent.id);

    const restaurantId = paymentIntent.metadata.restaurant_id;

    if (!restaurantId) {
        console.error('❌ Pas de restaurant_id dans les metadata');
        return;
    }

    // Enregistrer le paiement
    await query(
        `INSERT INTO paiements 
        (restaurant_id, stripe_payment_intent_id, montant, devise, statut, type, metadata) 
        VALUES (?, ?, ?, ?, 'reussi', 'abonnement', ?)`,
        [
            restaurantId,
            paymentIntent.id,
            paymentIntent.amount / 100, // Stripe utilise les centimes
            paymentIntent.currency,
            JSON.stringify(paymentIntent.metadata)
        ]
    );

    // Mettre à jour le restaurant
    await query(
        `UPDATE restaurants 
        SET statut = 'attente_numerisation',
            stripe_customer_id = ?,
            date_debut_abonnement = NOW(),
            date_fin_abonnement = DATE_ADD(NOW(), INTERVAL 1 MONTH)
        WHERE id = ?`,
        [paymentIntent.customer, restaurantId]
    );

    console.log(`✅ Restaurant ${restaurantId} activé`);
}

/**
 * Gérer l'échec d'un paiement
 */
async function handlePaymentFailed(paymentIntent) {
    console.log('❌ Paiement échoué:', paymentIntent.id);

    const restaurantId = paymentIntent.metadata.restaurant_id;

    if (!restaurantId) {
        return;
    }

    // Enregistrer l'échec
    await query(
        `INSERT INTO paiements 
        (restaurant_id, stripe_payment_intent_id, montant, devise, statut, type, metadata) 
        VALUES (?, ?, ?, ?, 'echoue', 'abonnement', ?)`,
        [
            restaurantId,
            paymentIntent.id,
            paymentIntent.amount / 100,
            paymentIntent.currency,
            JSON.stringify(paymentIntent.metadata)
        ]
    );

    // Log l'erreur
    await query(
        `INSERT INTO logs (restaurant_id, type, action, details) 
        VALUES (?, 'error', 'paiement_echoue', ?)`,
        [restaurantId, JSON.stringify({ payment_intent: paymentIntent.id })]
    );
}

/**
 * Gérer la création d'un abonnement
 */
async function handleSubscriptionCreated(subscription) {
    console.log('📅 Abonnement créé:', subscription.id);

    const restaurantId = subscription.metadata.restaurant_id;

    if (!restaurantId) {
        return;
    }

    await query(
        `UPDATE restaurants 
        SET stripe_subscription_id = ?,
            date_debut_abonnement = FROM_UNIXTIME(?),
            date_fin_abonnement = FROM_UNIXTIME(?)
        WHERE id = ?`,
        [
            subscription.id,
            subscription.current_period_start,
            subscription.current_period_end,
            restaurantId
        ]
    );
}

/**
 * Gérer la mise à jour d'un abonnement
 */
async function handleSubscriptionUpdated(subscription) {
    console.log('🔄 Abonnement mis à jour:', subscription.id);

    const restaurants = await query(
        'SELECT id FROM restaurants WHERE stripe_subscription_id = ?',
        [subscription.id]
    );

    if (restaurants.length === 0) {
        return;
    }

    const restaurantId = restaurants[0].id;

    // Vérifier le statut de l'abonnement
    let statut = 'actif';
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        statut = 'suspendu';
    }

    await query(
        `UPDATE restaurants 
        SET date_fin_abonnement = FROM_UNIXTIME(?),
            statut = ?
        WHERE id = ?`,
        [subscription.current_period_end, statut, restaurantId]
    );
}

/**
 * Gérer la suppression d'un abonnement
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('🗑️ Abonnement supprimé:', subscription.id);

    const restaurants = await query(
        'SELECT id FROM restaurants WHERE stripe_subscription_id = ?',
        [subscription.id]
    );

    if (restaurants.length === 0) {
        return;
    }

    const restaurantId = restaurants[0].id;

    await query(
        `UPDATE restaurants 
        SET statut = 'resilie',
            date_fin_abonnement = NOW()
        WHERE id = ?`,
        [restaurantId]
    );
}

/**
 * Gérer une facture payée
 */
async function handleInvoicePaid(invoice) {
    console.log('💳 Facture payée:', invoice.id);

    const restaurants = await query(
        'SELECT id FROM restaurants WHERE stripe_customer_id = ?',
        [invoice.customer]
    );

    if (restaurants.length === 0) {
        return;
    }

    const restaurantId = restaurants[0].id;

    await query(
        `INSERT INTO paiements 
        (restaurant_id, stripe_invoice_id, montant, devise, statut, type) 
        VALUES (?, ?, ?, ?, 'reussi', 'abonnement')`,
        [
            restaurantId,
            invoice.id,
            invoice.amount_paid / 100,
            invoice.currency
        ]
    );
}

/**
 * Gérer une facture échouée
 */
async function handleInvoiceFailed(invoice) {
    console.log('❌ Facture échouée:', invoice.id);

    const restaurants = await query(
        'SELECT id FROM restaurants WHERE stripe_customer_id = ?',
        [invoice.customer]
    );

    if (restaurants.length === 0) {
        return;
    }

    const restaurantId = restaurants[0].id;

    await query(
        `UPDATE restaurants SET statut = 'suspendu' WHERE id = ?`,
        [restaurantId]
    );

    await query(
        `INSERT INTO logs (restaurant_id, type, action, details) 
        VALUES (?, 'error', 'facture_echouee', ?)`,
        [restaurantId, JSON.stringify({ invoice_id: invoice.id })]
    );
}

/**
 * POST /webhooks/stripe/create-payment-intent
 * Créer un Payment Intent (appelé depuis le frontend)
 */
router.post('/create-payment-intent', express.json(), async (req, res, next) => {
    try {
        const { restaurant_id, email } = req.body;

        if (!restaurant_id || !email) {
            return res.status(400).json({
                success: false,
                message: 'restaurant_id et email requis'
            });
        }

        // Créer un Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 4900, // 49€ en centimes
            currency: 'eur',
            metadata: {
                restaurant_id,
                email
            },
            receipt_email: email,
            description: 'Abonnement VokalBox - 49€/mois'
        });

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
