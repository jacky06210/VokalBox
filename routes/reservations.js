/**
 * Routes Réservations - Telnyx AI Assistant Integration
 * Endpoints pour la gestion des réservations via l'assistant vocal
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/reservations/check
 * Vérifie la disponibilité pour une réservation
 */
router.post('/check', async (req, res) => {
    try {
        const { restaurant_id, date, time, party_size } = req.body;

        // Validation des paramètres
        if (!restaurant_id || !date || !time || !party_size) {
            return res.status(400).json({
                success: false,
                message: 'Paramètres manquants',
                required: ['restaurant_id', 'date', 'time', 'party_size']
            });
        }

        // Validation du nombre de personnes
        const partySize = parseInt(party_size);
        if (isNaN(partySize) || partySize < 1 || partySize > 20) {
            return res.status(400).json({
                success: false,
                disponible: false,
                message: 'Le nombre de personnes doit être entre 1 et 20'
            });
        }

        // Récupérer les infos du restaurant
        const [restaurants] = await req.db.execute(
            'SELECT * FROM restaurants WHERE id = ? OR api_key = ? OR code_restaurant = ?',
            [restaurant_id, restaurant_id, restaurant_id]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                disponible: false,
                message: 'Restaurant non trouvé'
            });
        }

        const restaurant = restaurants[0];

        // Vérifier la capacité maximale du restaurant
        const capaciteMax = restaurant.capacite_couverts || 50;
        if (partySize > capaciteMax) {
            return res.json({
                success: true,
                disponible: false,
                message: `Désolé, nous ne pouvons accueillir que ${capaciteMax} personnes maximum`,
                raison: 'capacite_depassee'
            });
        }

        // Compter les réservations existantes pour ce créneau (±1h)
        const [existingReservations] = await req.db.execute(`
            SELECT SUM(nb_personnes) as total_personnes
            FROM reservations
            WHERE restaurant_id = ?
            AND date_reservation = ?
            AND TIME(heure_reservation) BETWEEN SUBTIME(?, '01:00:00') AND ADDTIME(?, '01:00:00')
            AND statut IN ('confirmée', 'confirmee', 'en_attente')
        `, [restaurant.id, date, time, time]);

        const totalPersonnesReservees = existingReservations[0]?.total_personnes || 0;
        const placesRestantes = capaciteMax - totalPersonnesReservees;

        // Vérifier la disponibilité
        if (placesRestantes >= partySize) {
            return res.json({
                success: true,
                disponible: true,
                message: `Oui, nous avons de la place pour ${partySize} personne${partySize > 1 ? 's' : ''}`,
                places_restantes: placesRestantes,
                capacite_max: capaciteMax
            });
        } else {
            return res.json({
                success: true,
                disponible: false,
                message: `Désolé, nous n'avons plus assez de place à cette heure. Il reste ${placesRestantes} place${placesRestantes > 1 ? 's' : ''}`,
                places_restantes: placesRestantes,
                raison: 'complet'
            });
        }

    } catch (error) {
        console.error('Erreur /reservations/check:', error);
        res.status(500).json({
            success: false,
            disponible: false,
            message: 'Erreur lors de la vérification de disponibilité',
            error: error.message
        });
    }
});

/**
 * POST /api/reservations/create
 * Crée une nouvelle réservation
 */
router.post('/create', async (req, res) => {
    try {
        const { 
            restaurant_id, 
            date, 
            time, 
            party_size, 
            customer_name, 
            customer_phone,
            customer_email,
            call_id,
            conversation_id,
            commentaire
        } = req.body;

        // Validation des paramètres
        if (!restaurant_id || !date || !time || !party_size || !customer_name || !customer_phone) {
            return res.status(400).json({
                success: false,
                message: 'Paramètres manquants',
                required: ['restaurant_id', 'date', 'time', 'party_size', 'customer_name', 'customer_phone']
            });
        }

        // Récupérer les infos du restaurant
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

        // Vérifier la disponibilité avant de créer
        const partySize = parseInt(party_size);
        const capaciteMax = restaurant.capacite_couverts || 50;

        const [existingReservations] = await req.db.execute(`
            SELECT SUM(nb_personnes) as total_personnes
            FROM reservations
            WHERE restaurant_id = ?
            AND date_reservation = ?
            AND TIME(heure_reservation) BETWEEN SUBTIME(?, '01:00:00') AND ADDTIME(?, '01:00:00')
            AND statut IN ('confirmée', 'confirmee', 'en_attente')
        `, [restaurant.id, date, time, time]);

        const totalPersonnesReservees = existingReservations[0]?.total_personnes || 0;
        const placesRestantes = capaciteMax - totalPersonnesReservees;

        if (placesRestantes < partySize) {
            return res.status(409).json({
                success: false,
                message: `Désolé, il ne reste que ${placesRestantes} place${placesRestantes > 1 ? 's' : ''} disponible${placesRestantes > 1 ? 's' : ''}`,
                raison: 'complet',
                places_restantes: placesRestantes
            });
        }

        // Créer la réservation
        const [result] = await req.db.execute(`
            INSERT INTO reservations 
            (restaurant_id, date_reservation, heure_reservation, nb_personnes, nom_client, telephone_client, email_client, statut, call_id, conversation_id, commentaire, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmée', ?, ?, ?, NOW())
        `, [
            restaurant.id,
            date,
            time,
            partySize,
            customer_name,
            customer_phone,
            customer_email || null,
            call_id || null,
            conversation_id || null,
            commentaire || null
        ]);

        const reservationId = result.insertId;

        // Récupérer la réservation créée
        const [reservations] = await req.db.execute(
            'SELECT * FROM reservations WHERE id = ?',
            [reservationId]
        );

        const reservation = reservations[0];

        return res.status(201).json({
            success: true,
            message: `Réservation confirmée pour ${customer_name}, le ${date} à ${time}, pour ${partySize} personne${partySize > 1 ? 's' : ''}`,
            data: {
                reservation_id: reservationId,
                restaurant_name: restaurant.nom_restaurant,
                date: reservation.date_reservation,
                heure: reservation.heure_reservation,
                nb_personnes: reservation.nb_personnes,
                nom_client: reservation.nom_client,
                telephone: reservation.telephone_client,
                statut: reservation.statut
            }
        });

    } catch (error) {
        console.error('Erreur /reservations/create:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la réservation',
            error: error.message
        });
    }
});

/**
 * GET /api/reservations/list/:restaurant_id
 * Liste toutes les réservations d'un restaurant
 */
router.get('/list/:restaurant_id', async (req, res) => {
    try {
        const { restaurant_id } = req.params;
        const { date, status } = req.query;

        // Récupérer le restaurant
        const [restaurants] = await req.db.execute(
            'SELECT id FROM restaurants WHERE id = ? OR api_key = ? OR code_restaurant = ?',
            [restaurant_id, restaurant_id, restaurant_id]
        );

        if (restaurants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant non trouvé'
            });
        }

        const restId = restaurants[0].id;

        let query = 'SELECT * FROM reservations WHERE restaurant_id = ?';
        const params = [restId];

        if (date) {
            query += ' AND date_reservation = ?';
            params.push(date);
        }

        if (status) {
            query += ' AND statut = ?';
            params.push(status);
        }

        query += ' ORDER BY date_reservation DESC, heure_reservation DESC';

        const [reservations] = await req.db.execute(query, params);

        res.json({
            success: true,
            count: reservations.length,
            data: reservations
        });

    } catch (error) {
        console.error('Erreur /reservations/list:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des réservations',
            error: error.message
        });
    }
});

/**
 * PATCH /api/reservations/:id/status
 * Modifier le statut d'une réservation
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validation du statut
        const validStatuses = ['en_attente', 'confirmée', 'confirmee', 'annulée', 'annulee', 'terminée', 'terminee', 'no_show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
            });
        }

        const [result] = await req.db.execute(
            'UPDATE reservations SET statut = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Réservation non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Statut de la réservation mis à jour',
            data: { id, status }
        });

    } catch (error) {
        console.error('Erreur /reservations/:id/status:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du statut',
            error: error.message
        });
    }
});

/**
 * DELETE /api/reservations/:id
 * Annuler une réservation
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await req.db.execute(
            'UPDATE reservations SET statut = "annulée", updated_at = NOW() WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Réservation non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Réservation annulée',
            data: { id, status: 'annulée' }
        });

    } catch (error) {
        console.error('Erreur /reservations/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'annulation de la réservation',
            error: error.message
        });
    }
});

module.exports = router;
