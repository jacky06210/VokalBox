# 🚀 GUIDE DE DÉPLOIEMENT RAPIDE - SYSTÈME MULTI-RESTAURANTS

**Objectif** : Mettre en place le système VokalBox pour gérer plusieurs restaurants avec un seul script Telnyx.

---

## ✅ ÉTAPE 1 : CRÉER LES TABLES MYSQL (5 min)

### Sur votre VPS

```bash
# 1. Connexion SSH
ssh -p 65002 root@31.97.53.227

# 2. Télécharger ou copier le fichier SQL
# (Copiez le contenu de create_tables_multi_restaurants.sql dans un fichier)

# 3. Exécuter le script
mysql -u vocalbox_user -p vocalbox < create_tables_multi_restaurants.sql
# Password: VocalBox2024Secure

# 4. Vérifier
mysql -u vocalbox_user -p vocalbox -e "SELECT * FROM restaurants;"
```

**Résultat attendu** : Vous devriez voir le restaurant de test "Chez Jack" avec le numéro +33423330767

---

## ✅ ÉTAPE 2 : METTRE À JOUR L'API VOCALBOX-VOIX (10 min)

### Créer le fichier de routes

```bash
# 1. Connexion SSH
ssh -p 65002 root@31.97.53.227

# 2. Backup de l'ancien fichier
cd /root/vocalbox-voix/src/routes
cp voice.js voice.js.backup.$(date +%Y%m%d)

# 3. Créer le nouveau fichier voice.js
nano voice.js
```

### Copier le code

Copiez le code du fichier `voice.js` depuis [ARCHITECTURE_MULTI_RESTAURANTS.md](ARCHITECTURE_MULTI_RESTAURANTS.md) section 2.

**Ou utilisez ce code simplifié** :

```javascript
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'vocalbox_user',
  password: process.env.DB_PASSWORD || 'VocalBox2024Secure',
  database: process.env.DB_NAME || 'vocalbox',
  waitForConnections: true,
  connectionLimit: 10
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VocalBoxVoix',
    timestamp: new Date().toISOString()
  });
});

// WEBHOOK Variables dynamiques
router.post('/variables', async (req, res) => {
  try {
    const telnyxPhoneNumber = req.body?.data?.payload?.telnyx_agent_target;

    if (!telnyxPhoneNumber) {
      return res.status(400).json({ error: 'Missing phone number' });
    }

    const [restaurants] = await pool.execute(
      `SELECT * FROM restaurants WHERE telnyx_phone_number = ? AND actif = TRUE`,
      [telnyxPhoneNumber]
    );

    if (restaurants.length === 0) {
      logger.error('Restaurant non trouvé:', telnyxPhoneNumber);
      return res.json({
        dynamic_variables: {
          nom_restaurant: "VokalBox",
          horaires_texte: "Midi 12h-14h / Soir 19h-22h",
          jours_fermeture: "Dimanche",
          adresse_complete: "non renseignée",
          capacite_couverts: "40",
          telephone_resto: telnyxPhoneNumber,
          restaurant_id: "0"
        }
      });
    }

    const r = restaurants[0];
    logger.info('Restaurant trouvé:', r.nom_restaurant);

    const formatTime = (t) => t ? t.substring(0, 5) : '';

    res.json({
      dynamic_variables: {
        restaurant_id: r.id.toString(),
        nom_restaurant: r.nom_restaurant || 'Restaurant',
        adresse_complete: r.adresse_complete || '',
        telephone_resto: r.telephone_resto || telnyxPhoneNumber,
        horaires_texte: r.horaires_texte || '',
        jours_fermeture: r.jours_fermeture || '',
        capacite_couverts: (r.capacite_couverts || 40).toString(),
        horaires_midi_debut: formatTime(r.horaires_midi_debut),
        horaires_midi_fin: formatTime(r.horaires_midi_fin),
        horaires_soir_debut: formatTime(r.horaires_soir_debut),
        horaires_soir_fin: formatTime(r.horaires_soir_fin)
      }
    });

  } catch (error) {
    logger.error('Erreur webhook:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// WEBHOOK Réservation
router.post('/reservation', async (req, res) => {
  try {
    const vars = req.body?.data?.payload?.variables || {};

    const [result] = await pool.execute(
      `INSERT INTO reservations
        (restaurant_id, date_reservation, heure_reservation, nb_personnes, nom_client, telephone_client, call_id, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmée')`,
      [
        parseInt(vars.restaurant_id),
        vars.date_reservation,
        vars.heure_reservation,
        parseInt(vars.nb_personnes),
        vars.nom_client,
        vars.telephone_client || null,
        req.body?.data?.payload?.call_control_id,
      ]
    );

    logger.info('Réservation enregistrée:', result.insertId);

    res.json({ success: true, reservation_id: result.insertId });

  } catch (error) {
    logger.error('Erreur réservation:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
```

### Redémarrer le service

```bash
# 4. Sauvegarder et quitter nano (Ctrl+X, Y, Enter)

# 5. Redémarrer PM2
pm2 restart vocalbox-voix

# 6. Vérifier les logs
pm2 logs vocalbox-voix --lines 20

# 7. Tester le endpoint
curl https://voix.vokalbox.fr/health
```

**Résultat attendu** : `{"status":"ok","service":"VocalBoxVoix",...}`

---

## ✅ ÉTAPE 3 : CONFIGURER TELNYX (10 min)

### 3.1 Configurer le webhook

1. Allez sur https://portal.telnyx.com/#/ai/assistants
2. Ouvrez votre assistant **VokalBox-Restaurant-FR**
3. Cherchez **"Dynamic Variables Webhook"** ou **"Advanced Settings"**
4. Configurez :
   - **Webhook URL** : `https://voix.vokalbox.fr/api/voice/variables`
   - **Timeout** : `1500` ms
   - **Method** : `POST`
5. **Save**

### 3.2 Mettre à jour le script Instructions

1. Dans le même assistant, onglet **"Instructions"**
2. **EFFACEZ TOUT** le contenu actuel
3. **COPIEZ-COLLEZ** le contenu de [SCRIPT_TELNYX_GENERIQUE.md](SCRIPT_TELNYX_GENERIQUE.md)
4. **Save**

---

## ✅ ÉTAPE 4 : TESTER LE SYSTÈME (5 min)

### Test 1 : Webhook

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

**Résultat attendu** :
```json
{
  "dynamic_variables": {
    "restaurant_id": "1",
    "nom_restaurant": "Chez Jack",
    "horaires_texte": "Midi 12h-14h30 / Soir 19h-22h30",
    ...
  }
}
```

### Test 2 : Appel réel

1. **Appelez le +33 4 23 33 07 67**
2. Vous devriez entendre : **"Bonjour, Chez Jack à l'appareil..."**
3. Testez une réservation complète

### Test 3 : Vérifier la réservation

```bash
mysql -u vocalbox_user -p vocalbox -e "SELECT * FROM reservations ORDER BY created_at DESC LIMIT 1;"
```

---

## ✅ ÉTAPE 5 : AJOUTER UN NOUVEAU RESTAURANT (5 min)

### Méthode manuelle (pour l'instant)

```sql
-- Connexion MySQL
mysql -u vocalbox_user -p vocalbox

-- Ajouter un restaurant
INSERT INTO restaurants (
    code_restaurant,
    telnyx_phone_number,
    nom_restaurant,
    adresse_complete,
    telephone_resto,
    horaires_midi_debut,
    horaires_midi_fin,
    horaires_soir_debut,
    horaires_soir_fin,
    horaires_texte,
    jours_fermeture,
    ferme_dimanche,
    capacite_couverts,
    actif,
    statut_abonnement
) VALUES (
    'REST-002',
    '+33XXXXXXXXX',  -- Nouveau numéro Telnyx
    'La Pizza Bella',
    '23 avenue de la Liberté, 06000 Nice',
    '+33493111111',
    '11:30:00',
    '14:00:00',
    '18:30:00',
    '23:00:00',
    'Midi 11h30-14h / Soir 18h30-23h',
    'Lundi',
    FALSE,
    50,
    TRUE,
    'essai'
);
```

### Dans Telnyx

1. Achetez un nouveau numéro français
2. Assignez-le à la **MÊME** TeXML app / Assistant (VokalBox-Restaurant-FR)
3. C'est tout ! Le webhook s'occupe du reste

---

## 📊 VÉRIFICATION FINALE

### Checklist

- [ ] Tables MySQL créées
- [ ] Restaurant de test "Chez Jack" présent
- [ ] API vocalbox-voix mise à jour
- [ ] PM2 redémarré sans erreur
- [ ] Webhook configuré dans Telnyx
- [ ] Script générique dans Telnyx Instructions
- [ ] Test webhook : OK
- [ ] Test appel : parle français avec le bon nom
- [ ] Réservation enregistrée en BDD

---

## 🎯 PROCHAINES ÉTAPES

### Immédiat
1. ✅ Corriger le problème de langue (voix américaine → française)
2. ✅ Tester plusieurs restaurants

### Court terme (semaine prochaine)
1. Créer l'interface web pour les restaurants
2. Système d'inscription automatique
3. Achat automatique de numéros Telnyx via API
4. Dashboard réservations

### Moyen terme
1. SMS de confirmation automatiques
2. Rappels 90 minutes avant
3. Système de paiement (Stripe)
4. Application mobile restaurant

---

## 🐛 DÉPANNAGE

### Webhook ne répond pas

```bash
# Vérifier les logs
pm2 logs vocalbox-voix

# Tester manuellement
curl https://voix.vokalbox.fr/api/voice/variables -X POST -d '{}'
```

### L'IA parle toujours anglais

- Vérifiez que le webhook est bien configuré dans Telnyx
- Vérifiez que l'API retourne les bonnes variables
- Attendez 2-3 minutes (cache Telnyx)

### Restaurant non trouvé

```bash
# Vérifier la BDD
mysql -u vocalbox_user -p vocalbox -e "SELECT telnyx_phone_number, nom_restaurant FROM restaurants WHERE actif=TRUE;"

# Vérifier le format du numéro (avec +33, pas 0033)
```

---

## 📞 BESOIN D'AIDE ?

Reprenez la conversation Claude Code et dites :
**"J'ai un problème avec [décrivez le problème]"**

Tous les fichiers et l'historique seront là ! ��

---

**Bon déploiement ! 🎉**
