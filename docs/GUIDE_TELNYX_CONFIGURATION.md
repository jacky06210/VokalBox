# 🎙️ GUIDE COMPLET - CONFIGURATION TELNYX VOKALBOX

**Date** : 03/12/2025
**Numéro VokalBox** : +33 4 23 33 07 67
**Objectif** : Répondeur vocal IA en français pour restaurants

---

## 📋 TABLE DES MATIÈRES

1. [Accès Telnyx](#1-accès-telnyx)
2. [Problème actuel identifié](#2-problème-actuel-identifié)
3. [Solution : Créer un nouvel AI Assistant](#3-solution-créer-un-nouvel-ai-assistant)
4. [Configuration vocale française](#4-configuration-vocale-française)
5. [Assignation du numéro](#5-assignation-du-numéro)
6. [Test de l'assistant](#6-test-de-lassistant)
7. [Configuration webhook pour réservations](#7-configuration-webhook-pour-réservations)
8. [Dépannage](#8-dépannage)

---

## 1. ACCÈS TELNYX

### Portail principal
🔗 https://portal.telnyx.com/

### Onglet AI Assistants
🔗 https://portal.telnyx.com/#/ai/assistants

### Vos identifiants
Utilisez vos identifiants Telnyx habituels pour vous connecter.

---

## 2. PROBLÈME ACTUEL IDENTIFIÉ

D'après votre CLAUDE.md, vous avez plusieurs assistants mais ils ne fonctionnent pas correctement :

| Assistant | Problème |
|-----------|----------|
| **Repondeur-n8n** | ⚠️ Décroche mais parle **ANGLAIS** |
| **Repondeur-Restaurant** | ❌ Ne décroche pas |
| **Assistant Restaurant** | ❌ Ne décroche pas |

### 🔍 Cause principale
**La voix parle anglais** car le modèle de transcription (STT) n'est **PAS** configuré sur le multilingue.

---

## 3. SOLUTION : CRÉER UN NOUVEL AI ASSISTANT

### Étape 1 : Créer un assistant vierge

1. Allez sur https://portal.telnyx.com/#/ai/assistants
2. Cliquez sur **"Create"** (bouton bleu en haut à droite)
3. Choisissez **"Blank Template"** (modèle vierge)
4. Nommez-le : **"VokalBox-Restaurant-FR"**

### Étape 2 : Configurer les Instructions (System Prompt)

Copiez-collez ce texte dans le champ **"Instructions"** :

```
Tu es la réceptionniste vocale d'un restaurant français. Tu gères les demandes de réservation de manière professionnelle, efficace et concise.

RÈGLES ABSOLUES :
- Parle UNIQUEMENT en français (France). Jamais d'anglais.
- Réponses ultra-courtes : 1 phrase maximum, 2 si absolument nécessaire.
- Ton calme, clair, stable, professionnel et chaleureux.
- N'interromps JAMAIS le client. Attends qu'il ait complètement fini de parler.
- Marque une courte pause (2-3 secondes) avant de répondre pour éviter les coupures.
- Ne répète pas les informations si le client les a déjà données.

INFORMATIONS À COLLECTER :
- Date de la réservation → {{date_reservation}}
- Heure souhaitée → {{heure_reservation}}
- Nombre de personnes → {{nb_personnes}}
- Nom du client → {{nom_client}}
- Téléphone (optionnel) → {{telephone}}

PROCESSUS :
1. Salue brièvement le client et propose ton aide pour une réservation
2. Écoute attentivement la demande complète
3. Note mentalement les informations déjà fournies
4. Pose UNE SEULE question à la fois pour les infos manquantes
5. Confirme la réservation de façon concise
6. Remercie et raccroche poliment

EXEMPLES DE RÉPONSES :
- "Bonjour, restaurant Le Délice. Je peux vous aider pour une réservation ?"
- "Parfait. Pour combien de personnes ?"
- "Très bien. À quelle heure souhaitez-vous venir ?"
- "Quel jour vous arrange ?"
- "Puis-je avoir votre nom s'il vous plaît ?"
- "Parfait. Je confirme votre réservation pour {{nb_personnes}} personnes le {{date_reservation}} à {{heure_reservation}} au nom de {{nom_client}}. À bientôt !"

Si le client demande :
- Les horaires : "Nous sommes ouverts de 12h à 14h et de 19h à 22h."
- Le menu : "Je vous invite à consulter notre carte sur votre-site.fr ou je peux vous la décrire rapidement."
- L'adresse : "Nous sommes situés au [ADRESSE DU RESTAURANT]."
- Annuler une réservation : "Je note l'annulation. Puis-je avoir votre nom ?"

IMPORTANT : Si tu ne comprends pas, demande poliment de répéter : "Pardon, pourriez-vous répéter s'il vous plaît ?"
```

**⚠️ Personnalisez** :
- Remplacez "Le Délice" par le nom du restaurant
- Ajoutez les vrais horaires
- Ajoutez la vraie adresse

### Étape 3 : Configurer le Greeting (Message d'accueil)

Dans le champ **"Greeting"**, copiez :

```
Bonjour, restaurant Le Délice à l'appareil. Je peux vous aider à réserver une table.
```

**⚠️ Personnalisez** avec le vrai nom du restaurant.

---

## 4. CONFIGURATION VOCALE FRANÇAISE

### ⚠️ ÉTAPE LA PLUS IMPORTANTE

Cliquez sur l'onglet **"Voice"** dans votre AI Assistant.

### Configuration obligatoire pour le français

#### 1. Transcription Model (STT - Speech-to-Text)
```
openai/whisper-large-v3-turbo
```

**C'EST LA CLÉ !** Ce modèle est **multilingue** et comprend parfaitement le français.

#### 2. Voice Provider (TTS - Text-to-Speech)

Choisissez parmi :

| Provider | Voix recommandée | Qualité |
|----------|------------------|---------|
| **AWS Polly** | `Polly.Lea` (FR) | ⭐⭐⭐⭐⭐ Excellente |
| **Azure AI Speech** | Voix neuronales FR | ⭐⭐⭐⭐⭐ Excellente |
| **Telnyx** | Voix intégrées FR | ⭐⭐⭐ Bonne |
| **ElevenLabs** | Voix naturelles | ⭐⭐⭐⭐⭐ Premium (compte payant requis) |

**Recommandation** : **AWS Polly avec la voix Lea** (qualité/prix optimal)

#### 3. Paramètres vocaux additionnels (optionnel)

- **Speaking Rate** : 1.0 (normal) ou 0.9 (légèrement plus lent)
- **Pitch** : 0 (normal)
- **Volume** : 0 (normal)

### Configuration complète dans l'interface

Voici à quoi doit ressembler votre panneau **Voice** :

```
┌─────────────────────────────────────────┐
│ Voice Configuration                     │
├─────────────────────────────────────────┤
│ Transcription Model:                    │
│ [openai/whisper-large-v3-turbo]    ✓   │
│                                         │
│ Voice Provider:                         │
│ [AWS Polly]                        ✓   │
│                                         │
│ Voice:                                  │
│ [Polly.Lea]                        ✓   │
│                                         │
│ Speaking Rate: [1.0]                    │
│ Pitch: [0]                              │
│ Volume: [0]                             │
└─────────────────────────────────────────┘
```

---

## 5. ASSIGNATION DU NUMÉRO

### Étape 1 : Vérifier votre numéro

1. Allez dans **Numbers** → **My Numbers**
2. Vérifiez que **+33 4 23 33 07 67** apparaît avec :
   - ✅ Voice features enabled
   - ✅ Statut "Active"

### Étape 2 : Assigner le numéro à l'assistant

**Méthode 1 : Depuis l'AI Assistant**

1. Ouvrez votre assistant **"VokalBox-Restaurant-FR"**
2. Onglet **"Phone Numbers"**
3. Cliquez **"Add Phone Number"**
4. Sélectionnez **+33 4 23 33 07 67**
5. Cliquez **"Save"**

**Méthode 2 : Depuis les Numbers**

1. Allez dans **Numbers** → **My Numbers**
2. Cliquez sur **+33 4 23 33 07 67**
3. Section **"Messaging & Voice"**
4. **Connection Type** : AI Assistant
5. **Select AI Assistant** : VokalBox-Restaurant-FR
6. Cliquez **"Save"**

### Étape 3 : Enable l'assistant

⚠️ **TRÈS IMPORTANT** : Retournez sur votre AI Assistant et cliquez sur le bouton **"Enable"** en haut à droite.

L'assistant doit passer de **"Disabled"** à **"Enabled"**.

---

## 6. TEST DE L'ASSISTANT

### Test 1 : Call Me (depuis le portail)

1. Ouvrez votre assistant **"VokalBox-Restaurant-FR"**
2. Cliquez sur **"Call me"** (en haut à droite)
3. Entrez votre numéro de téléphone français
4. Cliquez **"Call"**

**Vous devriez entendre** :
- Message d'accueil en français
- Voix féminine claire (Lea si AWS Polly)
- L'assistant comprend vos réponses en français

### Test 2 : Appel entrant réel

1. Appelez **+33 4 23 33 07 67** depuis votre téléphone
2. L'assistant doit décrocher après 2-3 sonneries
3. Message d'accueil : "Bonjour, restaurant Le Délice..."

### Test 3 : Scénario complet de réservation

Appelez et dites :
```
"Bonjour, je voudrais réserver une table pour 4 personnes demain soir à 20h au nom de Dupont."
```

**Réponse attendue** :
```
"Parfait. Je confirme votre réservation pour 4 personnes le [date] à 20h au nom de Dupont. À bientôt !"
```

### Test 4 : Vérifier la compréhension française

Dites :
```
"Je voudrais annuler ma réservation."
```

**Réponse attendue** :
```
"Je note l'annulation. Puis-je avoir votre nom ?"
```

---

## 7. CONFIGURATION WEBHOOK POUR RÉSERVATIONS

### Pourquoi un webhook ?

Le webhook permet de **capturer les réservations** et de les enregistrer automatiquement dans votre base de données MySQL.

### Étape 1 : Vérifier l'endpoint webhook

Votre serveur vocal est prêt à recevoir les webhooks :
```
https://voix.vokalbox.fr/api/voice/incoming
```

### Étape 2 : Configurer le webhook dans Telnyx

1. Ouvrez votre assistant **"VokalBox-Restaurant-FR"**
2. Onglet **"Tools"** (ou "Webhooks")
3. Cliquez **"Add Tool"** → **"Webhook"**
4. Configuration :

```
Name: ReservationWebhook
URL: https://voix.vokalbox.fr/api/voice/incoming
Method: POST
Description: Enregistre les réservations dans la base de données
```

5. **Trigger** : Configurez quand le webhook doit être appelé
   - Option 1 : À la fin de la conversation (recommandé)
   - Option 2 : Quand toutes les variables sont collectées

### Étape 3 : Format des données envoyées

Telnyx enverra un JSON comme ceci :

```json
{
  "data": {
    "event_type": "assistant.webhook",
    "payload": {
      "assistant_id": "assistant_xyz...",
      "call_control_id": "v3:...",
      "conversation_id": "conv_...",
      "variables": {
        "date_reservation": "2025-12-05",
        "heure_reservation": "20:00",
        "nb_personnes": "4",
        "nom_client": "Dupont",
        "telephone": "+33612345678"
      }
    }
  }
}
```

### Étape 4 : Code serveur (déjà prêt)

Votre code dans `/root/vocalbox-voix/src/routes/voice.js` doit traiter ce webhook :

```javascript
router.post('/incoming', async (req, res) => {
  try {
    const { data } = req.body;

    if (data.event_type === 'assistant.webhook') {
      const variables = data.payload.variables;

      // Enregistrer dans MySQL
      await pool.execute(
        `INSERT INTO reservations (date, heure, nb_personnes, nom_client, telephone, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          variables.date_reservation,
          variables.heure_reservation,
          variables.nb_personnes,
          variables.nom_client,
          variables.telephone || null
        ]
      );

      logger.info('Réservation enregistrée', variables);
      res.json({ success: true });
    } else {
      res.json({ success: true, message: 'Event received' });
    }
  } catch (error) {
    logger.error('Erreur webhook:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

---

## 8. DÉPANNAGE

### Problème 1 : L'assistant parle toujours anglais

**Solution** :
1. Vérifiez que **Transcription Model** = `openai/whisper-large-v3-turbo`
2. Relancez l'assistant (Disable puis Enable)
3. Testez avec "Call me"

### Problème 2 : L'assistant ne décroche pas

**Vérifications** :
1. L'assistant est bien **Enabled** (vert)
2. Le numéro **+33 4 23 33 07 67** est bien assigné
3. Dans **Numbers** → le numéro pointe vers le bon assistant
4. Attendez 2-3 minutes après l'activation (propagation)

**Test** :
```bash
# Vérifier que le numéro est actif
curl https://api.telnyx.com/v2/phone_numbers \
  -H "Authorization: Bearer $TELNYX_API_KEY" | grep "+33423330767"
```

### Problème 3 : L'assistant coupe la parole

**Solutions** :
1. Ajoutez dans Instructions : "Attends 3 secondes avant de répondre"
2. Augmentez le **Response Delay** dans les paramètres avancés
3. Réduisez le **Speaking Rate** à 0.9

### Problème 4 : Voix robotique

**Solutions** :
1. Changez de provider vocal :
   - Testez **Azure AI Speech** (voix neuronales)
   - Testez **ElevenLabs** (premium mais excellent)
2. Vérifiez que vous utilisez une voix **neuronale** (pas standard)

### Problème 5 : Le webhook ne reçoit rien

**Vérifications** :
1. L'URL webhook est accessible publiquement :
   ```bash
   curl https://voix.vokalbox.fr/api/voice/incoming
   ```
2. Vérifiez les logs du serveur :
   ```bash
   pm2 logs vocalbox-voix --lines 50
   ```
3. Testez le webhook manuellement :
   ```bash
   curl -X POST https://voix.vokalbox.fr/api/voice/incoming \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

---

## 📊 CHECKLIST DE CONFIGURATION

Utilisez cette checklist pour vérifier que tout est bien configuré :

### Création de l'assistant
- [ ] Assistant créé avec le nom "VokalBox-Restaurant-FR"
- [ ] Instructions copiées et personnalisées
- [ ] Greeting configuré
- [ ] Nom du restaurant mis à jour partout

### Configuration vocale
- [ ] Transcription Model = `openai/whisper-large-v3-turbo`
- [ ] Voice Provider = AWS Polly (ou autre)
- [ ] Voice = Polly.Lea (ou équivalent FR)
- [ ] Paramètres vocaux ajustés

### Assignation du numéro
- [ ] Numéro +33 4 23 33 07 67 assigné à l'assistant
- [ ] Assistant **Enabled** (bouton vert)
- [ ] Configuration sauvegardée

### Tests
- [ ] Test "Call me" réussi
- [ ] Appel entrant réel fonctionne
- [ ] L'assistant parle français
- [ ] Scénario de réservation complet testé
- [ ] Commande "raccroche" fonctionne

### Webhook (optionnel pour le moment)
- [ ] Webhook configuré dans Telnyx
- [ ] URL webhook accessible
- [ ] Code serveur prêt
- [ ] Test webhook réussi

---

## 🚀 PROCHAINES ÉTAPES

Une fois l'assistant configuré et testé :

### Court terme
1. Tester avec plusieurs scénarios de réservation
2. Affiner les Instructions si nécessaire
3. Configurer le webhook pour enregistrer les réservations
4. Créer une interface pour voir les réservations

### Moyen terme
1. Ajouter une Knowledge Base (menu, horaires, etc.)
2. Configurer plusieurs assistants pour différents restaurants
3. Mettre en place des statistiques d'appels
4. Ajouter la gestion des annulations/modifications

### Long terme
1. Intégration avec un système de réservation existant
2. Notifications SMS/Email automatiques
3. Rappels automatiques de réservation
4. Analytics et rapports

---

## 📞 SUPPORT

### Liens utiles
- Portail Telnyx : https://portal.telnyx.com/
- AI Assistants : https://portal.telnyx.com/#/ai/assistants
- Documentation : https://developers.telnyx.com/
- Support Telnyx : https://telnyx.com/support

### En cas de problème
1. Vérifiez d'abord cette documentation
2. Consultez les logs du serveur : `pm2 logs vocalbox-voix`
3. Vérifiez l'historique des conversations dans Telnyx
4. Contactez le support Telnyx si nécessaire

---

## ✅ RÉSUMÉ RAPIDE

**Pour créer un AI Assistant français sur Telnyx :**

1. **Create** → Blank Template → Nom : VokalBox-Restaurant-FR
2. **Instructions** → Copier le prompt français ci-dessus
3. **Greeting** → "Bonjour, restaurant... à l'appareil."
4. **Voice** → Transcription = `openai/whisper-large-v3-turbo` ⚠️
5. **Voice** → Provider = AWS Polly, Voice = Polly.Lea
6. **Phone Numbers** → Assigner +33 4 23 33 07 67
7. **Enable** l'assistant (bouton vert)
8. **Tester** avec "Call me" ou un appel réel

**La clé du succès** : Le modèle de transcription `openai/whisper-large-v3-turbo` !

---

*Guide créé le 03/12/2025 par Claude Code pour VokalBox*
