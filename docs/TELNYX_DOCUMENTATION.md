# Documentation Complète Telnyx - AI Assistants Vocaux

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Démarrage rapide sans code](#2-démarrage-rapide-sans-code)
3. [Variables dynamiques](#3-variables-dynamiques)
4. [Configuration voix (TTS/STT)](#4-configuration-voix-ttsstt)
5. [Outils intégrés de l'assistant](#5-outils-intégrés-de-lassistant)
6. [Webhooks et intégrations](#6-webhooks-et-intégrations)
7. [API Voice v2](#7-api-voice-v2)
8. [Exemples de prompts restaurant](#8-exemples-de-prompts-restaurant)
9. [Dépannage et bonnes pratiques](#9-dépannage-et-bonnes-pratiques)

---

## 1. Vue d'ensemble

### Qu'est-ce qu'un AI Assistant Telnyx ?

Un assistant vocal Telnyx combine :
- **LLM** (raisonnement) - Le cerveau de l'assistant
- **STT** (Speech-to-Text) - Reconnaissance vocale (comprend ce que dit l'appelant)
- **TTS** (Text-to-Speech) - Synthèse vocale (la voix de l'assistant)
- **Outils** - Actions que l'assistant peut faire (raccrocher, webhook, transfert...)

### Capacités
- Répondre aux appels entrants
- Émettre des appels sortants
- Échanger des MMS pendant l'appel (vision)
- Agir via des intégrations (webhook, SIP, DTMF, MCP)

### Portail Telnyx
- URL : https://portal.telnyx.com/
- Onglet AI Assistants : https://portal.telnyx.com/#/ai/assistants

---

## 2. Démarrage rapide sans code

### Étape 1 : Créer l'assistant
1. Portail → **Assistants IA** → **Create** (modèle vierge)
2. Renseigner **Instructions** (le comportement de l'assistant)
3. Renseigner **Greeting** (message d'accueil)
4. Inclure des variables dynamiques si besoin (`{{telnyx_current_time}}`, etc.)

### Étape 2 : Configurer la voix
Dans le panneau **Voice** :
- Choisir le **TTS provider** (Telnyx, AWS, Azure, ElevenLabs)
- Configurer le **STT** (Telnyx/Whisper/Deepgram/Azure)
- **IMPORTANT pour le français** : Régler **Transcription model** sur `openai/whisper-large-v3-turbo`
- Optionnel : **Bed sound** (son d'ambiance pour rendre les silences naturels)

### Étape 3 : Assigner un numéro (optionnel)
- Sélectionner un numéro Telnyx avec fonctionnalités vocales
- Ou cliquer **Next** puis **Enable** pour tester sans numéro

### Étape 4 : Tester
- Passer un appel vers le numéro assigné
- Ou demander à l'assistant de vous appeler (bouton "Call me")
- Dire "Raccroche" pour tester l'outil Hangup

### Étape 5 : Consulter l'historique
- Onglet **Conversation History** dans le portail

---

## 3. Variables dynamiques

### Variables système Telnyx

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{telnyx_current_time}}` | Date et heure actuelles en UTC | Monday, February 24 2025 04:04:15 PM UTC |
| `{{telnyx_conversation_channel}}` | Type de conversation | `phone_call`, `web_call`, `sms_chat` |
| `{{telnyx_agent_target}}` | Numéro/URI de l'agent | +33423330767 |
| `{{telnyx_end_user_target}}` | Numéro/URI de l'appelant | +33612345678 |
| `{{telnyx_sip_header_user_to_user}}` | En-tête SIP user-to-user | cmlkPTM0Nzg1O3A9dQ==;encoding=base64 |
| `{{telnyx_sip_header_diversion}}` | En-tête SIP de diversion | <sip:bob@example.com>;reason=user-busy |
| `{{call_control_id}}` | ID de contrôle d'appel | v3:u5OAKGEPT3Dx8SZSSDRWEMdNH2OripQhO |

### Variables personnalisées

Vous pouvez créer vos propres variables (ex: `{{first_name}}`, `{{restaurant_name}}`).

**3 méthodes pour les injecter :**

#### Méthode 1 : Via l'API sortante (priorité la plus haute)
```bash
curl --request POST \
  --url https://api.telnyx.com/v2/texml/calls/<texml_app_id> \
  --header "Authorization: Bearer $TELNYX_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "From": "+33423330767",
    "To": "+33612345678",
    "AIAssistantDynamicVariables": {
      "first_name": "Jean",
      "restaurant_name": "Le Délice"
    }
  }'
```

#### Méthode 2 : Via en-têtes SIP personnalisés
Les en-têtes avec préfixe `X-` sont mappés aux variables.
Exemple : `X-Full-Name` devient `{{full_name}}`

#### Méthode 3 : Via webhook de variables dynamiques
Configurer `dynamic_variables_webhook_url` dans l'assistant.
Telnyx envoie un POST au début de la conversation.

### Webhook de variables dynamiques

**Requête envoyée par Telnyx :**
```json
{
  "data": {
    "record_type": "event",
    "id": "event_12345678-90ab-cdef-1234-567890abcdef",
    "event_type": "assistant.initialization",
    "occurred_at": "2025-04-07T10:00:00Z",
    "payload": {
      "telnyx_conversation_channel": "phone_call",
      "telnyx_agent_target": "+33423330767",
      "telnyx_end_user_target": "+33612345678",
      "telnyx_end_user_target_verified": false,
      "call_control_id": "v3:u5OAKGEPT3Dx8SZSSDRWEMdNH2OripQhO",
      "assistant_id": "assistant_12345678-90ab-cdef-1234-567890abcdef"
    }
  }
}
```

**Réponse attendue (max 1 seconde) :**
```json
{
  "dynamic_variables": {
    "restaurant_name": "Le Délice",
    "horaires": "12h-14h et 19h-22h",
    "first_name": "Jean"
  },
  "memory": {
    "conversation_query": "metadata->telnyx_end_user_target=eq.+33612345678&limit=5"
  },
  "conversation": {
    "metadata": {
      "customer_tier": "premium",
      "preferred_language": "fr"
    }
  }
}
```

### Bonnes pratiques pour les variables

- **Noms descriptifs** : `customer_name` plutôt que `name`
- **Convention snake_case** : `facility_name`, `account_number`
- **Éviter le préfixe telnyx_** : Réservé aux variables système
- **Valeurs par défaut** : Définir dans l'assistant comme fallback
- **Délai webhook < 1 seconde** : Sinon, les valeurs par défaut sont utilisées

---

## 4. Configuration voix (TTS/STT)

### Fournisseurs TTS (Text-to-Speech)

| Fournisseur | Voix françaises | Notes |
|-------------|-----------------|-------|
| **Telnyx** | ✅ Oui | Faible latence, inclus |
| **AWS Polly** | ✅ Oui (Lea, Celine) | Voix neuronales, recommandé |
| **Azure AI Speech** | ✅ Oui | Voix neuronales HD, excellente qualité |
| **ElevenLabs** | ✅ Oui | Voix très naturelles, compte payant requis, latence plus élevée |

### Fournisseurs STT (Speech-to-Text)

| Fournisseur | Multilingue | Notes |
|-------------|-------------|-------|
| **Telnyx (Whisper)** | ✅ Oui | Utiliser `openai/whisper-large-v3-turbo` |
| **Deepgram** | ✅ Oui | Modèles nova-2 et nova-3 |
| **Azure** | ✅ Oui | Bonne qualité |

### Configuration multilingue (FRANÇAIS)

**OBLIGATOIRE pour le français :**

Dans l'onglet **Voice** de l'assistant :
1. **Transcription model** → `openai/whisper-large-v3-turbo`
2. Choisir un **Voice provider** avec voix française

**Si la voix parle anglais au lieu de français :**
- Vérifier que **Transcription model** = `openai/whisper-large-v3-turbo`
- Vérifier le **Voice provider** choisi

### Intégration ElevenLabs

1. Créer une clé API ElevenLabs (compte payant requis)
2. Dans l'onglet Voice → Sélectionner ElevenLabs comme fournisseur
3. Référencer la clé API via Integration Secrets
4. Activer le multilingue : Transcription model → `openai/whisper-large-v3-turbo`

### Intégration Vapi

1. Créer une clé API Vapi
2. Dans l'onglet Voice → Sélectionner Vapi comme fournisseur
3. Référencer la clé API via Integration Secrets
4. Activer le multilingue : Transcription model → `openai/whisper-large-v3-turbo`

### Bed Sound (son d'ambiance)

Configure un fond sonore pour rendre les silences plus naturels.
Options prédéfinies ou URL personnalisée.

---

## 5. Outils intégrés de l'assistant

### Hangup (Raccrocher)
- **Description** : Met fin à l'appel
- **Activation** : Par défaut, se déclenche automatiquement quand approprié
- **Test** : Dire "Raccroche" à l'assistant

### Webhook
- **Description** : L'assistant peut appeler vos APIs
- **Configuration** :
  - URL du webhook
  - Headers (avec secrets d'intégration)
  - Paramètres Path, Query, Body
  - Variables dynamiques dans le chemin ou les descriptions
- **Test** : Bouton "Run" dans l'interface de l'outil

### Handoff (Transfert multi-agents)
- **Description** : Transférer la conversation vers un autre AI Assistant
- **Modes** :
  - **Transparent** (par défaut) : Même contexte et voix
  - **Distinct voice mode** : Chaque assistant garde sa voix (conférence)

### SIP Transfer / Refer
- **Description** : Transférer l'appel vers un numéro externe ou URI SIP
- **Usage** : Transfert vers un humain

### Send DTMF
- **Description** : Envoyer des tonalités DTMF
- **Usage** : Interaction avec des systèmes IVR existants

### MCP (Model Context Protocol)
- **Description** : Connecter un serveur MCP externe
- **Configuration** : URL du serveur (peut être stockée en secret)
- **Note** : `telnyx_conversation_id` est automatiquement inclus dans chaque appel

---

## 6. Webhooks et intégrations

### Configuration webhook pour l'assistant

Dans les paramètres de l'assistant :
- **Webhook URL** : URL de votre endpoint
- **Headers** : Authentification via Integration Secrets

### Structure des événements webhook (API v2)

Les événements utilisent le format `dot.case` (ex: `call.speak.started`).

**Structure de la payload :**
```json
{
  "data": {
    "record_type": "event",
    "event_type": "call.transcription",
    "id": "event-uuid",
    "occurred_at": "2025-01-01T12:00:00Z",
    "payload": {
      "call_control_id": "v3:...",
      "call_leg_id": "...",
      "call_session_id": "...",
      "connection_id": "...",
      "transcription_data": {
        "confidence": 0.977,
        "is_final": true,
        "transcript": "Bonjour, je voudrais réserver une table"
      }
    }
  }
}
```

### Signature des webhooks (API v2)

- **Algorithme** : EdDSA (Ed25519)
- **Headers** :
  - `telnyx-signature-ed25519` : Signature Base64
  - `telnyx-timestamp` : Timestamp
- **Chaîne signée** : `"{timestamp}|{payload}"`

### Integration Secrets

- **URL** : https://portal.telnyx.com/#/integration-secrets
- **Usage** : Stocker les clés API tierces (OpenAI, ElevenLabs, Vapi...)
- **Important** : Impossible de relire la valeur après enregistrement
- **Conseil** : Utiliser des identifiants mémorisables (alias)

---

## 7. API Voice v2

### Base URL
```
https://api.telnyx.com/v2/
```

### Authentification
```bash
-H "Authorization: Bearer $TELNYX_API_KEY"
```

### Clé API v2
Créer dans **Auth v2** (Mission Control Portal).

### Endpoints principaux

#### Répondre à un appel
```bash
POST /v2/calls/{call_control_id}/actions/answer
```

#### Démarrer un AI Assistant
```bash
POST /v2/calls/{call_control_id}/actions/start_ai_assistant
Content-Type: application/json

{
  "assistant_id": "assistant_xyz"
}
```

#### Appel sortant via TeXML
```bash
POST /v2/texml/calls/<texml_app_id>
Content-Type: application/json

{
  "From": "+33423330767",
  "To": "+33612345678",
  "AIAssistantDynamicVariables": {
    "first_name": "Jean"
  }
}
```

#### Démarrer la transcription
```bash
POST /v2/calls/{call_control_id}/actions/transcription_start
Content-Type: application/json

{
  "language": "fr",
  "transcription_engine": "Telnyx"
}
```

### Migration v1 → v2

| Aspect | v1 | v2 |
|--------|----|----|
| Event types | `snake_case` | `dot.case` |
| Exemple | `speak_started` | `call.speak.started` |
| Payload | Direct | Enveloppé sous `data` |
| Timestamp | `created_at` | `occurred_at` |
| Signature | Ancienne | EdDSA (Ed25519) |

---

## 8. Exemples de prompts restaurant

### Exemple 1 : Réceptionniste simple

**Instructions :**
```
Tu es la réceptionniste vocale d'un restaurant français. Tu comprends les demandes de réservation, poses des questions ciblées pour compléter les infos manquantes, vérifies la disponibilité et confirmes la réservation de façon concise et efficace.

Règles :
- Parle UNIQUEMENT en français (France). Pas d'anglais.
- Réponses très courtes : 1 phrase, 2 maximum si indispensable.
- Ton calme, clair, stable, professionnel.
- N'interromps jamais le client. Attends qu'il ait fini.
- Marque un court silence (2-3 secondes) avant de répondre.

Variables à collecter :
- Date de réservation
- Heure de réservation
- Nombre de personnes
- Nom du client
```

**Greeting :**
```
Bonjour, restaurant Le Délice à l'appareil. Je peux vous aider à réserver une table.
```

### Exemple 2 : Réceptionniste avancé avec workflow

**Instructions :**
```
# Objectif
Permettre à l'agent vocal de prendre automatiquement une réservation de table de restaurant par téléphone (nom, date, heure, nombre de personnes), en respectant strictement les horaires d'ouverture et en proposant des alternatives si le créneau est indisponible.

# Rôle
Tu es la réceptionniste vocale d'un restaurant. Tu comprends les demandes de réservation, poses des questions ciblées pour compléter les infos manquantes, vérifies la disponibilité, confirmes la réservation de façon concise et efficace, ou transfères vers le patron si tu n'as pas de réponse.

# Variables à capter
- Date de réservation → {{Date}} au format `dd-mm-yyyy`
- Heure de réservation → {{Heure}} au format `HH:MM`
- Nombre de personnes → {{nb_personnes}}
- Nom du client → {{nom}}
- Date/heure actuelle → {{telnyx_current_time}}

# Horaires d'ouverture
- Mercredi : 11h30-14h30 (midi) et 19h30-21h30 (soir)
- Jeudi : 11h30-14h30 (midi) et 19h30-21h30 (soir)
- Vendredi : 11h30-14h30 (midi) et 19h30-22h00 (soir)
- Samedi : 11h30-14h30 (midi) et 19h30-22h00 (soir)
- Fermé : Dimanche et Lundi

# Workflow
1) Accueil très bref
2) Rassembler les 4 infos clés (date, heure, nb personnes, nom)
3) Vérifier la compatibilité avec les horaires
4) Vérifier la disponibilité du créneau (outil verif_event)
5) Confirmer et enregistrer (outil add_event)
6) Informations générales si demandé
7) Transfert vers humain si besoin
8) Clôture

# Garde-fous
- Réponses très courtes : 1-2 phrases max
- Ton calme, clair, stable, professionnel
- Ne jamais donner d'informations incertaines
- Ne jamais interrompre le client
- Toujours reformuler la synthèse finale

# Outils
- hang_up : mettre fin à l'appel après avoir dit au revoir
- transfer_call : transfert vers humain si échecs répétés ou demande explicite
- verif_event : vérifier disponibilité avant d'enregistrer
- add_event : enregistrer la réservation
```

**Greeting :**
```
Bonjour, restaurant {{restaurant_name}} à l'appareil. Je peux vous aider à réserver une table.
```

### Messages types courts
- "Pour combien de personnes ?"
- "À quelle heure souhaitez-vous réserver ?"
- "C'est noté : 4 personnes, le 15 janvier à 20h, au nom de Dupont. À bientôt !"
- "Ce créneau n'est pas disponible. Puis-je vous proposer 20h30 ?"
- "Je vous transfère vers un collègue. Un instant."

---

## 9. Dépannage et bonnes pratiques

### Problèmes courants

#### La voix parle anglais au lieu de français
**Solution :**
1. Vérifier **Transcription model** = `openai/whisper-large-v3-turbo`
2. Vérifier le **Voice provider** choisi a des voix françaises
3. Indiquer clairement dans les Instructions de parler français

#### Variables non résolues (affichent `{{variable_name}}`)
**Causes possibles :**
- Délai webhook > 1 seconde
- Faute de frappe dans le nom de variable
- Variable non définie dans aucune source

**Solution :**
- Vérifier l'orthographe exacte
- Définir des valeurs par défaut dans l'assistant
- Optimiser le temps de réponse du webhook

#### L'assistant ne décroche pas
**Vérifier :**
1. Numéro bien assigné à l'assistant
2. L'assistant est "Enabled"
3. Configuration vocale correcte

#### Webhook échoue
**Vérifier :**
- URL accessible publiquement
- HTTPS valide
- Réponse < 1 seconde
- Format JSON correct

### Bonnes pratiques

#### Instructions de l'assistant
- Être précis et concis
- Utiliser des listes à puces
- Définir clairement le rôle et le ton
- Spécifier la langue explicitement
- Inclure des exemples de réponses

#### Webhooks
- Temps de réponse < 1 seconde
- Implémenter une gestion d'erreurs
- Valider les données reçues
- Utiliser le cache si possible

#### Sécurité
- Stocker les clés API dans Integration Secrets
- Vérifier la signature des webhooks
- Ne pas exposer de données sensibles dans les logs

#### Tests
- Tester avec "Call me" avant d'assigner un numéro
- Vérifier l'historique des conversations
- Consulter les logs webhook dans le portail
- Tester tous les outils (Hangup, Transfer, Webhook)

### Checklist de mise en production

- [ ] Assistant créé avec Instructions et Greeting
- [ ] Transcription model = `openai/whisper-large-v3-turbo`
- [ ] Voice provider configuré avec voix française
- [ ] Numéro assigné à l'assistant
- [ ] Assistant "Enabled"
- [ ] Webhook configuré et testé
- [ ] Outils ajoutés (Hangup, Transfer si besoin)
- [ ] Knowledge Base ajoutée si nécessaire
- [ ] Tests effectués via "Call me"
- [ ] Vérification dans Conversation History

---

## Ressources utiles

### Documentation officielle
- Assistants IA : https://developers.telnyx.com/docs/inference/ai-assistants
- Variables dynamiques : https://developers.telnyx.com/docs/inference/ai-assistants/dynamic-variables
- API Voice : https://developers.telnyx.com/docs/voice
- Text-to-Speech : https://developers.telnyx.com/docs/voice/programmable-voice/tts

### Portail
- AI Assistants : https://portal.telnyx.com/#/ai/assistants
- Integration Secrets : https://portal.telnyx.com/#/integration-secrets
- Conversation History : Dans chaque assistant

### Support
- Chat : Disponible dans le portail Mission Control
