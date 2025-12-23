# VokalBox - Système de réponse vocale IA pour restaurants

## Vue d'ensemble
VokalBox est une solution SaaS de réponse téléphonique IA pour restaurants français.
- **Prix** : 49€ HT/mois
- **Marge cible** : 35-40€/client
- **Entreprise** : E Formateck (Cannes)

---

## Accès VPS Hostinger

```
IP : 31.97.53.227
OS : Ubuntu 22.04
User : root
SSH : Port 65002
```

**Connexion SSH :**
```bash
ssh -p 65002 root@31.97.53.227
```

---

## Domaines et URLs

| URL | Status | Description |
|-----|--------|-------------|
| https://api.vokalbox.fr/health | ✅ | API principale |
| https://voix.vokalbox.fr/health | ✅ | Service vocal |
| https://app.vokalbox.fr/maitre/ | ✅ | Interface numérisation menus |
| https://commandes.vokalbox.fr | ⚠️ À tester | Interface tablette restaurant |

---

## Architecture des dossiers

```
/home/vocalbox/api/          ← API Node.js (PM2: vocalbox-api, port 3000)
    ├── server.js
    ├── routes/
    │   └── menu-scan.js     ← Scan de menus Claude Vision
    ├── public/
    │   └── maitre/
    │       └── index.html   ← Interface VocalBoxMaître
    ├── .env                 ← Config (NE PAS TOUCHER)
    └── node_modules/

/root/vocalbox-voix/         ← Service vocal Telnyx (port 3002)
                               ⚠️ Code placeholder, pas encore fonctionnel

/var/www/vocalbox/           ← Fichiers statiques
    └── commandes/           ← Interface tablette (à vérifier)
```

---

## Services PM2

| Service | Port | Commande restart |
|---------|------|------------------|
| vocalbox-api | 3000 | `pm2 restart vocalbox-api` |
| vocalbox-voix | 3002 | `pm2 restart vocalbox-voix` |

---

## Base de données MySQL

```
Host : localhost
Port : 3306
Database : vocalbox
User : vocalbox_user
Password : VocalBox2024Secure
```

**Connexion :**
```bash
mysql -u vocalbox_user -p vocalbox
# Password: VocalBox2024Secure
```

---

## Configuration .env (API)

Fichier : `/home/vocalbox/api/.env`

```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vocalbox
DB_USER=vocalbox_user
DB_PASSWORD=VocalBox2024Secure
CORS_ORIGINS=https://app.vokalbox.fr,https://commandes.vokalbox.fr
CLAUDE_API_KEY=sk-ant-api03-... (clé Anthropic pour Vision)
```

---

## Telnyx - Configuration Complète

### 1. Accès Portail
- URL : https://portal.telnyx.com/
- Onglet **AI Assistants** : https://portal.telnyx.com/#/ai/assistants

### 2. Numéro français VokalBox
```
+33 4 23 33 07 67
```

### 3. AI Assistants existants
| Nom | Status | Problème |
|-----|--------|----------|
| Repondeur-n8n | ⚠️ | Décroche mais parle ANGLAIS |
| Repondeur-Restaurant | ❌ | Ne décroche pas |
| Assistant Restaurant | ❌ | Ne décroche pas |

### 4. PROBLÈME IDENTIFIÉ : Voix Anglaise
**Cause** : Configuration vocale incorrecte
**Solution** : Configurer correctement le TTS et STT pour le français

---

## Configuration Voix Française (TTS/STT)

### Fournisseurs TTS (Text-to-Speech)
| Fournisseur | Voix française | Notes |
|-------------|---------------|-------|
| **AWS Polly** | ✅ Voix neuronales FR | Recommandé - Lea, Celine |
| **Azure AI Speech** | ✅ Voix neuronales HD FR | Excellente qualité |
| **ElevenLabs** | ✅ Voix naturelles | Latence plus élevée, compte payant requis |
| **Telnyx** | ✅ Voix intégrées FR | Faible latence |

### Fournisseurs STT (Speech-to-Text)
| Fournisseur | Multilingue | Notes |
|-------------|------------|-------|
| **Telnyx (Whisper)** | ✅ | Modèle `openai/whisper-large-v3-turbo` |
| **Deepgram** | ✅ | Modèles nova-2 et nova-3 |
| **Azure** | ✅ | Bonne qualité |

### ⚠️ CONFIGURATION OBLIGATOIRE POUR LE FRANÇAIS

Dans l'onglet **Voice** de l'AI Assistant :

1. **Transcription model** → `openai/whisper-large-v3-turbo`
   - C'est LA CLÉ pour le multilingue !
   
2. **Voice provider** → Choisir parmi :
   - AWS (pour Polly.Lea)
   - Azure
   - ElevenLabs (si compte payant)

3. Si la voix parle anglais au lieu de français :
   - Vérifier que le **Transcription model** = `openai/whisper-large-v3-turbo`
   - Vérifier le **Voice provider** choisi

---

## Variables Système Telnyx

Utilisables dans **Instructions** et **Greeting** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{telnyx_current_time}}` | Date/heure UTC | Monday, February 24 2025 04:04:15 PM UTC |
| `{{telnyx_conversation_channel}}` | Type d'appel | `phone_call`, `web_call`, `sms_chat` |
| `{{telnyx_agent_target}}` | Numéro de l'agent | +33423330767 |
| `{{telnyx_end_user_target}}` | Numéro de l'appelant | +33612345678 |
| `{{call_control_id}}` | ID de contrôle d'appel | v3:u5OAKGEPT3... |

### Variables Personnalisées
On peut ajouter ses propres variables (ex: `{{first_name}}`, `{{restaurant_name}}`) via :
- Webhook de variables dynamiques
- En-têtes SIP personnalisés
- API sortante (AIAssistantDynamicVariables)

---

## Créer un AI Assistant (Étapes)

### 1. Créer l'assistant
- Portail → **Assistants IA** → **Create** (modèle vierge)
- Renseigner **Instructions** (système prompt)
- Renseigner **Greeting** (message d'accueil)

### 2. Configurer la voix
- Panneau **Voice** :
  - **TTS** : Choisir Telnyx/AWS/Azure/ElevenLabs
  - **STT** : Régler sur `openai/whisper-large-v3-turbo` (IMPORTANT pour FR)
  - Optionnel: **Bed sound** (son d'ambiance)

### 3. Assigner un numéro (optionnel)
- Sélectionner un numéro Telnyx avec fonctionnalités vocales
- Ou utiliser "Call me" pour tester sans numéro

### 4. Enable et tester
- Cliquer **Enable** pour activer l'agent
- Tester avec un appel entrant ou "Call me"
- Dire "Raccroche" pour tester l'outil Hangup

### 5. Consulter l'historique
- Onglet **Conversation History** pour voir les logs

---

## Outils Intégrés de l'Assistant

| Outil | Description | Usage |
|-------|-------------|-------|
| **Hangup** | Raccroche l'appel | Par défaut, se déclenche quand approprié |
| **Webhook** | Appelle vos APIs | Réservations, vérifications, etc. |
| **Handoff** | Transfert multi-agents | Vers un autre AI Assistant |
| **SIP Transfer** | Transfert vers numéro | Vers un humain si besoin |
| **Send DTMF** | Envoie des tonalités | Interaction avec IVR existants |
| **MCP** | Serveur MCP externe | Intégrations avancées |

---

## Exemple de Prompt Restaurant (FR)

### Instructions
```
Tu es la réceptionniste vocale d'un restaurant français. Tu comprends les demandes de réservation, poses des questions ciblées pour compléter les infos manquantes, vérifies la disponibilité et confirmes la réservation de façon concise et efficace.

Règles :
- Parle UNIQUEMENT en français (France). Pas d'anglais.
- Réponses très courtes : 1 phrase, 2 maximum si indispensable.
- Ton calme, clair, stable, professionnel.
- N'interromps jamais le client. Attends qu'il ait fini.
- Marque un court silence (2-3 secondes) avant de répondre.

Variables à collecter :
- Date de réservation → {{Date}}
- Heure de réservation → {{Heure}}
- Nombre de personnes → {{nb_personnes}}
- Nom du client → {{nom}}
```

### Greeting
```
Bonjour, restaurant Le Délice à l'appareil. Je peux vous aider à réserver une table.
```

---

## Webhook de Variables Dynamiques

Si configuré, Telnyx envoie un POST au début de chaque conversation :

```json
{
  "data": {
    "event_type": "assistant.initialization",
    "payload": {
      "telnyx_conversation_channel": "phone_call",
      "telnyx_agent_target": "+33423330767",
      "telnyx_end_user_target": "+33612345678",
      "call_control_id": "v3:...",
      "assistant_id": "assistant_12345..."
    }
  }
}
```

Réponse attendue (délai max 1 seconde) :
```json
{
  "dynamic_variables": {
    "restaurant_name": "Le Délice",
    "horaires": "12h-14h et 19h-22h"
  }
}
```

### URL Webhook cible VokalBox
```
https://voix.vokalbox.fr/api/voice/incoming
```

---

## API Telnyx Voice v2

### Base URL
```
https://api.telnyx.com/v2/
```

### Authentification
```bash
-H "Authorization: Bearer $TELNYX_API_KEY"
```

### Démarrer un Assistant sur un appel
```bash
curl -X POST \
  "https://api.telnyx.com/v2/calls/{call_control_id}/actions/start_ai_assistant" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "assistant_xyz"
  }'
```

### Appel sortant via TeXML
```bash
curl -X POST \
  "https://api.telnyx.com/v2/texml/calls/<texml_app_id>" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "+33423330767",
    "To": "+33612345678",
    "AIAssistantDynamicVariables": {
      "first_name": "Jean",
      "restaurant_name": "Le Délice"
    }
  }'
```

---

## Secrets et Clés API

### Stockage des secrets
- Portail → **Integration Secrets** : https://portal.telnyx.com/#/integration-secrets
- Une fois enregistré, impossible de relire la valeur
- Utiliser un identifiant mémorisable (alias)

### Clé API v2
- Créer dans **Auth v2** (Mission Control)
- Format : `KEY...`
- Exporter : `export TELNYX_API_KEY="KEY..."`

---

## Pare-feu Hostinger

Ports ouverts (TCP) :
- 65002 → SSH
- 80 → HTTP
- 443 → HTTPS

⚠️ **Si problème SSL ou accès bloqué** : vérifier le pare-feu Hostinger dans le panel, les ports 80/443 peuvent se désactiver.

---

## Commandes utiles

### PM2
```bash
pm2 list                      # Voir tous les processus
pm2 restart vocalbox-api      # Redémarrer l'API
pm2 restart vocalbox-voix     # Redémarrer le service vocal
pm2 logs vocalbox-api         # Logs API en temps réel
pm2 logs vocalbox-voix        # Logs vocal en temps réel
pm2 save                      # Sauvegarder la config
pm2 startup                   # Auto-démarrage au boot
```

### Nginx
```bash
sudo nginx -t                 # Tester la config
sudo systemctl reload nginx   # Recharger nginx
sudo certbot renew            # Renouveler SSL
```

### Dépannage
```bash
# Erreur "Cannot find module"
cd /home/vocalbox/api && npm install && pm2 restart vocalbox-api

# Test health API
curl https://app.vokalbox.fr/health
```

---

## Workflow de déploiement

1. `ssh -p 65002 root@31.97.53.227`
2. `cd /home/vocalbox/api`
3. `git pull` (si versionné) ou copier les fichiers
4. `npm install` (si nouvelles dépendances)
5. `pm2 restart vocalbox-api`
6. `pm2 logs vocalbox-api --lines 20` (vérifier)

---

## Codes de test

```
Restaurant test : TEST-DEMO-2024
```

---

## Checklist Telnyx - Démarrage Express

- [ ] Créer **Assistant IA** avec Instructions/Greeting en français
- [ ] **Voice** : Régler **Transcription model** sur `openai/whisper-large-v3-turbo`
- [ ] **Voice** : Choisir un **TTS provider** avec voix française (AWS/Azure/Telnyx)
- [ ] Assigner le numéro **+33 4 23 33 07 67** à l'assistant
- [ ] **Enable** l'agent
- [ ] Tester avec un appel entrant
- [ ] Vérifier dans **Conversation History** que ça parle français
- [ ] Configurer le **Webhook** pour les réservations
- [ ] Activer **Knowledge Base** si besoin (menus, horaires)

---

## Status actuel du projet

### ✅ Fonctionnel
- VocalBoxMaître (scan de menus avec Claude Vision)
- API principale
- SSL sur tous les domaines
- Pare-feu Hostinger configuré

### ⚠️ En cours
- Configuration voix française Telnyx (voir section ci-dessus)
- Assignation numéro → AI Assistant

### ❌ À faire
- Tester interface commandes tablette
- Implémenter vocalbox-voix avec Telnyx Call Control API
- Configurer webhooks Telnyx pour réservations
- Stratégie de backup VPS

---

## Notes de session
<!-- Ajouter ici les notes de chaque session -->
