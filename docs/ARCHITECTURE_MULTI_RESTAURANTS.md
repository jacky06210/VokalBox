# 🏗️ ARCHITECTURE VOKALBOX - MULTI-RESTAURANTS

**Système plug-and-play pour gérer plusieurs restaurants avec un seul script Telnyx**

---

## 📊 1. STRUCTURE BASE DE DONNÉES

### Table `restaurants`

```sql
CREATE TABLE restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,

    -- Identification unique
    code_restaurant VARCHAR(50) UNIQUE NOT NULL,     -- Ex: "REST-001", "PIZZ-042"
    telnyx_phone_number VARCHAR(20) UNIQUE NOT NULL, -- Ex: "+33423330767"

    -- Informations du restaurant
    nom_restaurant VARCHAR(255) NOT NULL,
    adresse_rue VARCHAR(255),
    adresse_complement VARCHAR(255),
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    adresse_complete TEXT,                           -- Adresse formatée pour l'IA

    -- Contact
    telephone_resto VARCHAR(20),
    email VARCHAR(255),
    site_web VARCHAR(255),

    -- Horaires (format TIME)
    horaires_midi_debut TIME,                        -- Ex: "12:00:00"
    horaires_midi_fin TIME,                          -- Ex: "14:30:00"
    horaires_soir_debut TIME,                        -- Ex: "19:00:00"
    horaires_soir_fin TIME,                          -- Ex: "22:30:00"
    horaires_texte VARCHAR(255),                     -- Ex: "Midi 12h-14h30 / Soir 19h-22h30"

    -- Jours de fermeture
    jours_fermeture VARCHAR(255),                    -- Ex: "Dimanche,Lundi"
    ferme_dimanche BOOLEAN DEFAULT FALSE,
    ferme_lundi BOOLEAN DEFAULT FALSE,
    ferme_mardi BOOLEAN DEFAULT FALSE,
    ferme_mercredi BOOLEAN DEFAULT FALSE,
    ferme_jeudi BOOLEAN DEFAULT FALSE,
    ferme_vendredi BOOLEAN DEFAULT FALSE,
    ferme_samedi BOOLEAN DEFAULT FALSE,

    -- Capacité
    capacite_couverts INT DEFAULT 40,
    duree_moyenne_repas INT DEFAULT 120,             -- En minutes

    -- Paramètres IA Telnyx
    telnyx_assistant_id VARCHAR(255),                -- ID de l'assistant Telnyx
    telnyx_connection_id VARCHAR(255),               -- ID de la connection TeXML

    -- Statut
    actif BOOLEAN DEFAULT TRUE,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Abonnement
    statut_abonnement VARCHAR(50) DEFAULT 'essai',   -- essai, actif, suspendu, annulé
    date_fin_essai DATE,

    INDEX idx_telnyx_phone (telnyx_phone_number),
    INDEX idx_code_restaurant (code_restaurant),
    INDEX idx_actif (actif)
);
```

### Table `menus`

```sql
CREATE TABLE menus (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,

    nom_plat VARCHAR(255) NOT NULL,
    categorie VARCHAR(100),                          -- Entrée, Plat, Dessert, Boisson
    description TEXT,
    prix DECIMAL(10,2),

    -- Informations complémentaires
    allergenes TEXT,                                 -- JSON ou texte séparé par virgules
    vegetarien BOOLEAN DEFAULT FALSE,
    vegan BOOLEAN DEFAULT FALSE,
    sans_gluten BOOLEAN DEFAULT FALSE,

    -- Disponibilité
    disponible BOOLEAN DEFAULT TRUE,
    jours_disponible VARCHAR(255),                   -- Ex: "Lundi,Mardi,Mercredi"

    -- Ordre d'affichage
    ordre_affichage INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant_categorie (restaurant_id, categorie),
    INDEX idx_disponible (disponible)
);
```

### Table `reservations`

```sql
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,

    -- Informations réservation
    date_reservation DATE NOT NULL,
    heure_reservation TIME NOT NULL,
    nb_personnes INT NOT NULL,

    -- Informations client
    nom_client VARCHAR(255) NOT NULL,
    telephone_client VARCHAR(20),
    email_client VARCHAR(255),

    -- Informations appel Telnyx
    call_id VARCHAR(255),                            -- ID de l'appel Telnyx
    call_duration INT,                               -- Durée en secondes
    conversation_id VARCHAR(255),                    -- ID conversation Telnyx

    -- Statut
    statut VARCHAR(50) DEFAULT 'confirmée',          -- confirmée, annulée, no_show, terminée
    commentaire TEXT,

    -- SMS
    sms_confirmation_envoye BOOLEAN DEFAULT FALSE,
    sms_rappel_envoye BOOLEAN DEFAULT FALSE,
    sms_confirmation_recu BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant_date (restaurant_id, date_reservation),
    INDEX idx_statut (statut),
    INDEX idx_call_id (call_id)
);
```

### Table `utilisateurs_restaurant` (pour l'interface de gestion)

```sql
CREATE TABLE utilisateurs_restaurant (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',                -- admin, staff

    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,

    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_email (email)
);
```

---

## 🔌 2. API WEBHOOK POUR VARIABLES DYNAMIQUES

### Endpoint : `/api/voice/variables`

**Ce endpoint est appelé par Telnyx au début de chaque appel**

Fichier : `/root/vocalbox-voix/src/routes/voice.js`

```javascript
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Pool de connexion MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'vocalbox_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'vocalbox',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * WEBHOOK TELNYX - Variables dynamiques
 * Appelé automatiquement au début de chaque conversation
 */
router.post('/variables', async (req, res) => {
  try {
    const { data } = req.body;

    logger.info('Webhook variables reçu', {
      event_type: data?.event_type,
      to: data?.payload?.telnyx_agent_target,
      from: data?.payload?.telnyx_end_user_target
    });

    // Récupérer le numéro Telnyx appelé
    const telnyxPhoneNumber = data?.payload?.telnyx_agent_target;

    if (!telnyxPhoneNumber) {
      logger.error('Numéro Telnyx manquant dans le webhook');
      return res.status(400).json({ error: 'Missing phone number' });
    }

    // Chercher le restaurant par son numéro Telnyx
    const [restaurants] = await pool.execute(
      `SELECT
        id,
        code_restaurant,
        nom_restaurant,
        adresse_complete,
        telephone_resto,
        horaires_texte,
        horaires_midi_debut,
        horaires_midi_fin,
        horaires_soir_debut,
        horaires_soir_fin,
        jours_fermeture,
        capacite_couverts
      FROM restaurants
      WHERE telnyx_phone_number = ? AND actif = TRUE`,
      [telnyxPhoneNumber]
    );

    if (restaurants.length === 0) {
      logger.error('Restaurant non trouvé', { phone: telnyxPhoneNumber });

      // Retourner des variables par défaut
      return res.json({
        dynamic_variables: {
          nom_restaurant: "VokalBox",
          horaires_texte: "Midi 12h-14h30 / Soir 19h-22h30",
          jours_fermeture: "Dimanche et Lundi",
          adresse_complete: "non renseignée",
          capacite_couverts: "40",
          telephone_resto: telnyxPhoneNumber,
          restaurant_id: "0"
        }
      });
    }

    const restaurant = restaurants[0];

    logger.info('Restaurant trouvé', {
      id: restaurant.id,
      nom: restaurant.nom_restaurant
    });

    // Formater les horaires
    const formatTime = (time) => {
      if (!time) return '';
      return time.substring(0, 5); // HH:MM
    };

    // Retourner les variables dynamiques
    res.json({
      dynamic_variables: {
        restaurant_id: restaurant.id.toString(),
        nom_restaurant: restaurant.nom_restaurant || 'Restaurant',
        adresse_complete: restaurant.adresse_complete || 'non renseignée',
        telephone_resto: restaurant.telephone_resto || telnyxPhoneNumber,
        horaires_texte: restaurant.horaires_texte || 'Midi 12h-14h / Soir 19h-22h',
        jours_fermeture: restaurant.jours_fermeture || 'Dimanche',
        capacite_couverts: (restaurant.capacite_couverts || 40).toString(),
        horaires_midi_debut: formatTime(restaurant.horaires_midi_debut),
        horaires_midi_fin: formatTime(restaurant.horaires_midi_fin),
        horaires_soir_debut: formatTime(restaurant.horaires_soir_debut),
        horaires_soir_fin: formatTime(restaurant.horaires_soir_fin)
      }
    });

  } catch (error) {
    logger.error('Erreur webhook variables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * WEBHOOK TELNYX - Enregistrer réservation
 * Appelé à la fin de la conversation ou via un outil
 */
router.post('/reservation', async (req, res) => {
  try {
    const { data } = req.body;
    const variables = data?.payload?.variables || {};

    logger.info('Réservation reçue', variables);

    // Extraire les données
    const restaurantId = parseInt(variables.restaurant_id);
    const dateReservation = variables.date_reservation;
    const heureReservation = variables.heure_reservation;
    const nbPersonnes = parseInt(variables.nb_personnes);
    const nomClient = variables.nom_client;
    const telephoneClient = variables.telephone_client || null;
    const callId = data?.payload?.call_control_id;

    // Validation basique
    if (!restaurantId || !dateReservation || !heureReservation || !nbPersonnes || !nomClient) {
      logger.error('Données de réservation incomplètes', variables);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enregistrer la réservation
    const [result] = await pool.execute(
      `INSERT INTO reservations
        (restaurant_id, date_reservation, heure_reservation, nb_personnes, nom_client, telephone_client, call_id, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmée')`,
      [restaurantId, dateReservation, heureReservation, nbPersonnes, nomClient, telephoneClient, callId]
    );

    const reservationId = result.insertId;

    logger.info('Réservation enregistrée', {
      id: reservationId,
      restaurant: restaurantId,
      date: dateReservation,
      heure: heureReservation
    });

    // TODO: Envoyer SMS de confirmation

    res.json({
      success: true,
      reservation_id: reservationId
    });

  } catch (error) {
    logger.error('Erreur enregistrement réservation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

---

## ⚙️ 3. CONFIGURATION TELNYX

### Étape 1 : Configurer le webhook dans l'assistant

Dans le portail Telnyx, pour votre assistant **VokalBox-Restaurant-FR** :

1. Onglet **"Settings"** ou **"Advanced"**
2. **Dynamic Variables Webhook URL** :
   ```
   https://voix.vokalbox.fr/api/voice/variables
   ```
3. **Timeout** : 1500 ms (1.5 secondes)
4. **Method** : POST

### Étape 2 : Le script générique

Copier le contenu de [SCRIPT_TELNYX_GENERIQUE.md](SCRIPT_TELNYX_GENERIQUE.md) dans le champ **"Instructions"** de l'assistant Telnyx.

**Important** : Ce script contient des variables `{{nom_restaurant}}`, `{{horaires_texte}}`, etc. qui seront automatiquement remplacées par les valeurs retournées par le webhook.

### Étape 3 : Assigner un numéro à un restaurant

Quand vous achetez un nouveau numéro Telnyx pour un restaurant :

1. **Dans la BDD** : Créer l'entrée du restaurant avec le numéro Telnyx
2. **Dans Telnyx** : Assigner le numéro à la même TeXML app (qui pointe vers le même assistant)

**Tous les numéros utilisent le MÊME assistant, mais avec des variables différentes !**

---

## 🔄 4. WORKFLOW COMPLET

```
┌─────────────────────────────────────────────────────────────┐
│  1. Client appelle le +33 X XX XX XX XX                     │
│     (numéro spécifique du restaurant)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Telnyx reçoit l'appel                                   │
│     - Identifie le numéro appelé (to_number)                │
│     - Charge l'assistant VokalBox-Restaurant-FR             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Telnyx appelle le webhook AVANT la conversation         │
│     POST https://voix.vokalbox.fr/api/voice/variables       │
│     Body: {                                                 │
│       "data": {                                             │
│         "event_type": "assistant.initialization",          │
│         "payload": {                                        │
│           "telnyx_agent_target": "+33423330767",          │
│           "telnyx_end_user_target": "+33612345678"        │
│         }                                                   │
│       }                                                     │
│     }                                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  4. API VokalBox cherche le restaurant dans MySQL           │
│     SELECT * FROM restaurants                               │
│     WHERE telnyx_phone_number = '+33423330767'             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  5. API retourne les variables dynamiques                   │
│     Response: {                                             │
│       "dynamic_variables": {                                │
│         "nom_restaurant": "Chez Jack",                      │
│         "horaires_texte": "Midi 12h-14h30 / Soir 19h-22h", │
│         "jours_fermeture": "Dimanche et Lundi",            │
│         "adresse_complete": "15 rue Victor Hugo, Cannes",  │
│         "capacite_couverts": "40",                         │
│         "telephone_resto": "+33493999999",                 │
│         "restaurant_id": "1"                               │
│       }                                                     │
│     }                                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Telnyx injecte les variables dans le script             │
│     "Bonjour, Chez Jack à l'appareil..."                    │
│     "Nous sommes ouverts Midi 12h-14h30 / Soir 19h-22h"    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Conversation avec le client                             │
│     L'IA collecte : date, heure, nb_personnes, nom, tel     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  8. À la fin : Webhook réservation (optionnel)              │
│     POST https://voix.vokalbox.fr/api/voice/reservation     │
│     Body: {variables collectées}                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  9. API enregistre la réservation dans MySQL                │
│     INSERT INTO reservations (...)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  10. SMS de confirmation envoyé (optionnel)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 5. INTERFACE RESTAURANT (à créer)

Une application web simple où les restaurateurs peuvent :

1. **S'inscrire** avec leur email
2. **Renseigner** :
   - Nom du restaurant
   - Adresse complète
   - Horaires d'ouverture
   - Jours de fermeture
   - Numéro de téléphone
   - Menu (optionnel)
3. **Recevoir** leur numéro Telnyx VokalBox
4. **Voir** les réservations en temps réel
5. **Gérer** : annuler, modifier, exporter

**URL suggérée** : https://app.vokalbox.fr/restaurants/

---

## 💰 6. PROCESSUS D'INSCRIPTION RESTAURANT

### Étape 1 : Restaurant s'inscrit
1. Va sur https://app.vokalbox.fr/inscription
2. Remplit le formulaire
3. Choisit son forfait (essai gratuit 14 jours)

### Étape 2 : Système VokalBox
1. Crée l'entrée dans la table `restaurants`
2. Achète automatiquement un numéro Telnyx français (via API)
3. Assigne le numéro à l'assistant VokalBox-Restaurant-FR
4. Envoie un email au restaurant avec son numéro

### Étape 3 : Restaurant actif
1. Le restaurant communique son numéro VokalBox à ses clients
2. Les appels arrivent automatiquement
3. L'IA répond avec les bonnes informations
4. Les réservations sont enregistrées

---

## 🔧 7. COMMANDES D'INSTALLATION

### Créer les tables

```bash
ssh -p 65002 root@31.97.53.227
mysql -u vocalbox_user -p vocalbox < /path/to/create_tables.sql
```

### Mettre à jour le code API

```bash
cd /root/vocalbox-voix
# Copier le nouveau code dans src/routes/voice.js
pm2 restart vocalbox-voix
pm2 logs vocalbox-voix
```

### Tester le webhook

```bash
curl -X POST https://voix.vokalbox.fr/api/voice/variables \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event_type": "assistant.initialization",
      "payload": {
        "telnyx_agent_target": "+33423330767",
        "telnyx_end_user_target": "+33612345678"
      }
    }
  }'
```

---

## ✅ AVANTAGES DE CETTE ARCHITECTURE

1. **Un seul script Telnyx** pour tous les restaurants
2. **Zéro configuration manuelle** par restaurant
3. **Scalable** : peut gérer des centaines de restaurants
4. **Flexible** : chaque restaurant a ses propres paramètres
5. **Centralisé** : toutes les réservations dans une seule BDD
6. **Facile à maintenir** : une seule version du script IA

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Créer les tables MySQL
2. ✅ Mettre à jour le code API (`/api/voice/variables`)
3. ✅ Configurer le webhook dans Telnyx
4. ✅ Mettre à jour le script dans Telnyx (version générique)
5. ⏳ Créer l'interface web pour les restaurants
6. ⏳ Système d'achat automatique de numéros Telnyx
7. ⏳ Système de SMS de confirmation
8. ⏳ Dashboard statistiques

---

**Questions ou besoin d'aide ? Demandez-moi ! 🚀**
