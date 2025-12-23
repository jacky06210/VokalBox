# Résumé Session 16 Décembre 2025 - VokalBox Pizza Assistant

## ✅ Ce qui a été fait aujourd'hui

### 1. Menu Dynamique dans Dynamic Variables
**Objectif :** Le webhook retourne automatiquement le menu du restaurant

**Modifications :**
- Fichier : `/home/vocalbox/api/routes/voice.js`
- Ajout de la variable `menu_disponible` qui récupère tous les plats depuis la table `menus`
- Format : "Catégorie: Plat1 (prix€), Plat2 (prix€) | Catégorie2: ..."

**Test réussi :**
```bash
curl -X POST https://api.vokalbox.fr/api/v1/voice/dynamic-vars \
  -H "Content-Type: application/json" \
  -d '{"data":{"payload":{"telnyx_agent_target":"+33423330767"}}}'
```

Retourne le menu complet avec 14 pizzas + autres plats.

### 2. Assistant Telnyx Créé
**Nom :** VokalBox-Pizza-Universal
**ID :** assistant-8c5d74b7-3d47-4c3e-8018-5250613309f0

**Configuration :**
- Model : openai/gpt-4o-mini
- Clé OpenAI ajoutée dans Integration Secrets : `openai-key`
- Dynamic Variables : https://api.vokalbox.fr/api/v1/voice/dynamic-vars
- Instructions : Universelles en français pour commandes de pizza
- Greeting : "Bonjour, {{restaurant_name}} à l'appareil. Je prends votre commande."

**⚠️ À FINALISER demain dans le portail :**
- Voice : AWS.Polly.Léa-Neural
- Transcription Model : deepgram/nova-3
- Transcription Language : French

### 3. Endpoints API Commandes Pizza
**Fichier :** `/home/vocalbox/api/routes/commandes.js`

**Endpoints créés :**
- `GET /api/commandes/menu-pizzas?restaurant_id=X` - Récupère le menu
- `POST /api/commandes/create` - Crée une commande

**Testé et fonctionnel ✅**

### 4. Interface Test Workflow Complète
**URL :** https://app.vokalbox.fr/test-workflow.html

**Fonctionnalités :**
- Formulaire restaurant (nom, adresse, tél, email)
- Upload photos de menu
- Bouton "Valider et Créer" :
  - Crée le restaurant en BDD (statut_abonnement = 'test')
  - Numérise le menu avec Claude Vision
  - Sauvegarde tous les plats dans la table `menus`
  - Affiche le résultat complet
- Bouton "RAZ" : Supprime tous les restaurants test

**Endpoint backend :**
- `POST /api/test-workflow/create-complete`
- `DELETE /api/test-workflow/reset-all`

**Restaurant test créé :**
- ID : 8
- Nom : Cap Pizza
- Code : TEST-1765906285528
- Numéro Telnyx : +33423330767

### 5. Base de Données - Pizzas Ajoutées
**Restaurant :** Chez Jack (ID: 1) - maintenant remplacé par Cap Pizza

**14 pizzas ajoutées :**
- Margherita (Petite 10.50€, Moyenne 14.50€, Grande 18.50€)
- Regina (Petite 12€, Moyenne 16€, Grande 20€)
- 4 Fromages (Petite 13€, Moyenne 17€, Grande 21€)
- Napolitaine (Petite 12.50€, Moyenne 16.50€, Grande 20.50€)
- Calzone (Moyenne 15.50€, Grande 19.50€)

### 6. Configuration Nginx
**Corrigé :** Port 3001 → 3000
- Fichier : `/etc/nginx/sites-enabled/api.vokalbox.fr`
- Dynamic Variables fonctionne maintenant correctement

## 🎯 État Actuel du Système

### Numéro Telnyx
**+33 4 23 33 07 67** → Restaurant "Cap Pizza" (ID: 8)

### Dynamic Variables
✅ Fonctionne - Retourne le menu automatiquement

### Assistant Telnyx
⚠️ Créé mais voix pas configurée (à faire demain dans le portail)

### Test Réalisé
✅ Appel au +33 4 23 33 07 67 fonctionne
⚠️ Problèmes de compréhension de l'IA (à améliorer demain)

## 📝 À FAIRE DEMAIN

### 1. Configurer la voix de l'assistant (2 minutes)
1. Aller sur https://portal.telnyx.com/#/ai/assistants
2. Cliquer sur "VokalBox-Pizza-Universal"
3. Panneau Voice :
   - Voice : AWS → Polly.Léa-Neural
   - Transcription Model : deepgram/nova-3
   - Transcription Language : French
4. Save
5. Enable

### 2. Améliorer la compréhension de l'IA
- Modifier les instructions de l'assistant
- Tester différentes formulations
- Ajouter plus d'exemples de conversations

### 3. Ajouter les Webhook Tools (optionnel)
Si on veut que l'assistant crée automatiquement les commandes :
- Outil 1 : obtenir_menu_pizzas (GET /api/commandes/menu-pizzas)
- Outil 2 : creer_commande (POST /api/commandes/create)
- À configurer via Telnyx Flow (interface complexe)

## 🔑 Informations Importantes

### Clés API
- **Telnyx :** [REDACTED_TELNYX_KEY]
- **OpenAI :** [REDACTED_OPENAI_KEY] (dans Integration Secrets Telnyx : `openai-key`)
- **Claude :** [REDACTED_ANTHROPIC_KEY] (dans .env)

### URLs Principales
- Interface test : https://app.vokalbox.fr/test-workflow.html
- API Dynamic Variables : https://api.vokalbox.fr/api/v1/voice/dynamic-vars
- Menu pizzas : https://api.vokalbox.fr/api/commandes/menu-pizzas?restaurant_id=8
- Portail Telnyx : https://portal.telnyx.com/#/ai/assistants

### Base de Données
- Restaurant actif : Cap Pizza (ID: 8)
- Numéro : +33423330767
- Menu : 14+ items

### Serveur VPS
- IP : 31.97.53.227
- Port SSH : 65002
- User : root
- Connexion : `ssh -p 65002 root@31.97.53.227`

## 🐛 Problèmes Connus

1. **Compréhension IA :** Problèmes de compréhension lors des appels (à améliorer)
2. **Voix non configurée :** L'assistant parle probablement anglais (à configurer demain)
3. **Pas de webhook tools :** L'assistant ne peut pas créer les commandes automatiquement

## 📊 Architecture Finale

```
┌─────────────────────┐
│  Client appelle     │
│  +33 4 23 33 07 67  │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────┐
│ Telnyx AI Assistant          │
│ VokalBox-Pizza-Universal     │
│ (openai/gpt-4o-mini)         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Dynamic Variables Webhook    │
│ api.vokalbox.fr/voice/...    │
│                              │
│ Retourne :                   │
│ - restaurant_name            │
│ - menu_disponible ✅         │
│ - adresse, téléphone, etc.   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Base de Données MySQL        │
│                              │
│ Restaurant: Cap Pizza (ID 8) │
│ Menu: 14+ pizzas             │
└──────────────────────────────┘
```

## ✅ Commandes Utiles

### Tester Dynamic Variables
```bash
curl -X POST https://api.vokalbox.fr/api/v1/voice/dynamic-vars \
  -H "Content-Type: application/json" \
  -d '{"data":{"payload":{"telnyx_agent_target":"+33423330767"}}}'
```

### Voir les restaurants test
```bash
mysql -u vocalbox_user -p'VocalBox2024Secure' vocalbox \
  -e "SELECT id, nom_restaurant, code_restaurant, telnyx_phone_number FROM restaurants WHERE statut_abonnement = 'test';"
```

### Redémarrer l'API
```bash
pm2 restart vocalbox-api
pm2 logs vocalbox-api --lines 20
```

### Supprimer tous les tests
```bash
curl -X DELETE https://app.vokalbox.fr/api/test-workflow/reset-all
```

## 📂 Fichiers Modifiés/Créés

### Fichiers Backend
- `/home/vocalbox/api/routes/voice.js` - Webhook Dynamic Variables avec menu
- `/home/vocalbox/api/routes/commandes.js` - Routes API commandes pizza
- `/home/vocalbox/api/routes/test-workflow.js` - Routes workflow de test
- `/home/vocalbox/api/server.js` - Ajout des routes

### Fichiers Frontend
- `/home/vocalbox/api/public/test-workflow.html` - Interface de test complète

### Configuration
- `/etc/nginx/sites-enabled/api.vokalbox.fr` - Correction port 3000

### Base de Données
- Table `menus` : 14+ pizzas ajoutées
- Table `restaurants` : Restaurant test "Cap Pizza" créé

---

**Session terminée le 16/12/2025 à ~18h30**
**Prochain objectif :** Configurer la voix et améliorer la compréhension IA

**Bonne nuit ! 😴🌙**
