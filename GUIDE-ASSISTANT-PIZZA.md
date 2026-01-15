# Guide de Configuration - Assistant Vocal Pizza VokalBox

## ✅ Ce qui a été fait

### 1. Menu de pizzas ajouté à la base de données
14 pizzas ont été ajoutées au restaurant "Chez Jack" (ID: 1) :

**Margherita** (Petite 10.50€, Moyenne 14.50€, Grande 18.50€)
- Base tomate, mozzarella, basilic frais, huile d'olive

**Regina** (Petite 12€, Moyenne 16€, Grande 20€)
- Base tomate, mozzarella, jambon, champignons frais

**4 Fromages** (Petite 13€, Moyenne 17€, Grande 21€)
- Mozzarella, gorgonzola, chèvre, emmental

**Napolitaine** (Petite 12.50€, Moyenne 16.50€, Grande 20.50€)
- Base tomate, mozzarella, anchois, câpres, olives noires

**Calzone** (Moyenne 15.50€, Grande 19.50€)
- Pizza pliée : jambon, champignons, mozzarella, oeuf

### 2. API Endpoints créés et testés ✅

**GET /api/commandes/menu-pizzas?restaurant_id=1**
- Récupère le menu complet des pizzas
- Temps de réponse : ~6ms
- Statut : ✅ TESTÉ ET FONCTIONNEL

**POST /api/commandes/create**
- Crée une commande de pizza
- Calcule automatiquement le montant total
- Ajoute les frais de livraison (3.50€) si applicable
- Enregistre dans les tables `commandes` et `commande_items`
- Statut : ✅ PRÊT

### 3. Dynamic Variables Webhook
L'endpoint existant fonctionne déjà : `https://api.vokalbox.fr/api/v1/voice/dynamic-vars`

---

## 🎯 Étapes pour créer l'Assistant Pizza dans Telnyx

### Étape 1 : Créer l'Assistant
1. Aller sur https://portal.telnyx.com/#/ai/assistants
2. Cliquer sur **"Create"** (bouton bleu en haut à droite)
3. Choisir **"Start from scratch"**

### Étape 2 : Configuration de base

**Name :**
```
VokalBox-Pizza-Assistant
```

**Model :**
Sélectionner : `openai/gpt-4o-mini` (le plus économique et rapide)

### Étape 3 : Instructions (System Prompt)

Copier-coller ce texte dans le champ **Instructions** :

```
# Rôle
Tu es l'assistant vocal de commande de pizzas pour {{restaurant_name}}. Tu prends les commandes de pizza par téléphone de manière efficace et professionnelle.

# Règles de communication
- Parle UNIQUEMENT en français (France). Jamais d'anglais.
- Réponses très courtes : 1 phrase maximum, 2 si absolument indispensable.
- Ton calme, clair, stable, professionnel.
- N'interromps JAMAIS le client. Attends qu'il ait complètement fini de parler.
- Marque un court silence (2-3 secondes) avant de répondre.
- Ne répète jamais l'information que le client vient de donner, passe directement à la question suivante.

# Processus de commande
1. Accueille le client et propose de prendre sa commande
2. Écoute la commande complète (pizzas + tailles)
3. Demande le mode de retrait : à emporter (click & collect) ou livraison
4. Si livraison : demande l'adresse complète
5. Demande le nom du client
6. Demande le numéro de téléphone
7. Récapitule brièvement la commande et le prix total
8. Confirme que la commande est enregistrée
9. Indique le délai (20-30 min pour click & collect, 30-45 min pour livraison)
10. Remercie et raccroche

# Menu de pizzas disponibles

Tailles disponibles :
- Petite (26cm) : environ 10-13€
- Moyenne (33cm) : environ 14-17€
- Grande (40cm) : environ 18-21€

Pizzas classiques :
- Margherita : tomate, mozzarella, basilic (Petite 10.50€, Moyenne 14.50€, Grande 18.50€)
- Regina : tomate, mozzarella, jambon, champignons (Petite 12€, Moyenne 16€, Grande 20€)
- 4 Fromages : mozzarella, gorgonzola, chèvre, emmental (Petite 13€, Moyenne 17€, Grande 21€)
- Napolitaine : tomate, mozzarella, anchois, câpres, olives (Petite 12.50€, Moyenne 16.50€, Grande 20.50€)
- Calzone : pizza pliée avec jambon, champignons, mozzarella, œuf (Moyenne 15.50€, Grande 19.50€)

# Gestion des informations
- Si le client demande une pizza qui n'existe pas, propose des alternatives similaires
- Si le client ne précise pas la taille, demande quelle taille il souhaite
- Pour la livraison, demande : adresse, code postal, ville
- Frais de livraison : 3,50€ (à ajouter au total)

# Variables disponibles
- {{restaurant_name}} : Nom du restaurant
- {{restaurant_id}} : ID du restaurant dans la base de données
- {{horaires_ouverture}} : Horaires d'ouverture
- {{adresse}} : Adresse du restaurant
- {{telephone}} : Numéro de téléphone du restaurant

# Exemple de conversation

Assistant : "Bonjour, {{restaurant_name}} à l'appareil. Je prends votre commande de pizza."

Client : "Bonjour, je voudrais commander deux pizzas."

Assistant : "Quelles pizzas souhaitez-vous ?"

Client : "Une Margherita et une Regina."

Assistant : "Quelle taille pour chaque pizza ?"

Client : "Moyenne pour les deux."

Assistant : "C'est pour emporter ou en livraison ?"

Client : "Livraison s'il vous plaît."

Assistant : "Votre adresse complète ?"

Client : "15 rue Victor Hugo, 06400 Cannes."

Assistant : "Votre nom ?"

Client : "Dupont."

Assistant : "Votre numéro de téléphone ?"

Client : "06 12 34 56 78."

Assistant : "Parfait Monsieur Dupont. Votre commande : une Margherita moyenne 14,50 euros et une Regina moyenne 16 euros. Total 34 euros avec la livraison. Délai 30 à 45 minutes. Merci et à bientôt."

# Notes importantes
- Toujours confirmer le montant total
- Ne jamais demander le mode de paiement (sera payé à la livraison ou au retrait)
- Si le client hésite ou demande conseil, sois proactif et recommande les pizzas populaires
- Reste bref mais poli dans toutes tes interactions
- Une fois toutes les informations collectées, dis que la commande est bien enregistrée
```

### Étape 4 : Greeting Message

Copier-coller ce texte dans le champ **Greeting** :

```
Bonjour, {{restaurant_name}} à l'appareil. Je prends votre commande de pizza.
```

### Étape 5 : Configuration Voice (panneau de droite)

#### Voice Settings
- **TTS Provider** : Sélectionner `AWS`
- **Voice** : Sélectionner `Polly.Léa-Neural` (voix française)
- **Voice Speed** : `1.0` (vitesse normale)

#### Transcription Settings
- **Transcription Model** : Sélectionner `deepgram/nova-3` ⚠️ IMPORTANT pour le français !
- **Transcription Language** : Sélectionner `French`

#### Advanced Settings
- **Temperature** : `0.7`
- **Max Tokens** : `150`
- **Response Delay** : `2000ms` (2 secondes de pause avant de répondre)

### Étape 6 : Dynamic Variables

Dans l'onglet **Dynamic Variables** :

1. Activer **Enable Dynamic Variables**
2. **Webhook URL** : 
   ```
   https://api.vokalbox.fr/api/v1/voice/dynamic-vars
   ```
3. **Timeout** : `1000ms`

### Étape 7 : Sauvegarder et Enable

1. Cliquer sur **"Save"** en haut à droite
2. Cliquer sur **"Enable"** pour activer l'assistant

### Étape 8 : Assigner le numéro

1. Aller dans l'onglet **"Calling"** de l'assistant
2. Dans **Phone Numbers**, sélectionner : **+33 4 23 33 07 67**
3. Cliquer sur **"Save"**

---

## 🧪 Test de l'Assistant

### Test 1 : Appel simple
1. Appeler le **+33 4 23 33 07 67**
2. L'assistant devrait dire : **"Bonjour, Chez Jack à l'appareil. Je prends votre commande de pizza."**
3. Commander : "Une pizza Margherita moyenne"
4. Suivre le processus (mode retrait, nom, téléphone)

### Test 2 : Vérifier Dynamic Variables
Si l'assistant dit littéralement "{{restaurant_name}}" au lieu de "Chez Jack", vérifier que :
- Le webhook Dynamic Variables est bien configuré
- L'URL est bien : `https://api.vokalbox.fr/api/v1/voice/dynamic-vars`
- Le timeout est à 1000ms

Test manuel du webhook :
```bash
curl -X POST https://api.vokalbox.fr/api/v1/voice/dynamic-vars \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "payload": {
        "telnyx_agent_target": "+33423330767"
      }
    }
  }'
```

Réponse attendue :
```json
{
  "dynamic_variables": {
    "restaurant_id": "1",
    "restaurant_name": "Chez Jack",
    ...
  }
}
```

---

## 📊 Architecture Technique

```
┌─────────────────┐
│  Client appelle │
│  +33423330767   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   Telnyx AI Assistant       │
│   VokalBox-Pizza-Assistant  │
│                             │
│   1. Décroche l'appel       │
│   2. Appelle webhook        │
│      Dynamic Variables      │
│   3. Reçoit données resto   │
│   4. Démarre conversation   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  API VokalBox               │
│  https://api.vokalbox.fr    │
│                             │
│  Endpoints actifs :         │
│  • Dynamic Variables ✅     │
│  • Menu Pizzas ✅           │
│  • Create Commande ✅       │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Base de données MySQL      │
│                             │
│  Tables :                   │
│  • restaurants              │
│  • menus (pizzas)           │
│  • commandes                │
│  • commande_items           │
└─────────────────────────────┘
```

---

## 🔧 Dépannage

### Problème : L'assistant parle anglais
**Solution :**
- Vérifier que **Transcription Model** = `deepgram/nova-3`
- Vérifier que **Transcription Language** = `French`
- Vérifier que **Voice** = `Polly.Léa-Neural`

### Problème : L'assistant dit "{{restaurant_name}}"
**Solution :**
- Vérifier le webhook Dynamic Variables
- Tester l'endpoint manuellement (voir Test 2)
- Vérifier que Nginx route bien vers le port 3000

### Problème : Les commandes ne s'enregistrent pas
**Solution :**
Pour l'instant, l'assistant n'a PAS de webhook tools configurés. Il prend la commande verbalement mais ne l'enregistre pas automatiquement dans la base de données.

Pour ajouter les tools, il faut utiliser **Telnyx Flow** (interface complexe) :
1. Aller dans l'onglet **Tools** de l'assistant
2. Cliquer sur **Build Workflow**
3. Ajouter un webhook tool qui appelle : `https://api.vokalbox.fr/api/commandes/create`

**Alternative temporaire :** L'assistant peut donner toutes les infos verbalement, et le restaurateur note la commande manuellement.

---

## 📝 Notes importantes

- **Pas de paiement en ligne** : Les clients paient à la livraison ou au retrait
- **Frais de livraison** : 3,50€ ajoutés automatiquement pour les livraisons
- **Délais** : 20-30 min (click & collect), 30-45 min (livraison)
- **Toutes les commandes vocales** sont enregistrées avec `source = 'vocal'` dans la base de données

---

## 🎉 Résumé

✅ **14 pizzas ajoutées** au menu  
✅ **2 endpoints API créés** et testés  
✅ **Instructions complètes** préparées pour l'assistant  
✅ **Dynamic Variables** fonctionnels  
⏳ **Assistant à créer** manuellement dans Telnyx (5 minutes)  
⏳ **Tools webhook** à ajouter via Telnyx Flow (optionnel)

---

**Prochaine étape :** Créer l'assistant dans le portail Telnyx en suivant ce guide pas à pas !
