# 🎯 GUIDE COMPLET : Configuration Telnyx avec VokalBoxMaître

## ✅ BACKEND PRÊT - Menu accessible via API

L'endpoint est **opérationnel** et testé :
- **URL** : `https://voix.vokalbox.fr/api/voice/menu-vokalbox`
- **Méthode** : GET
- **Paramètres** :
  - `restaurant_code` (requis)
  - `category` (optionnel)
  - `promo` (optionnel)

### Test réussi avec Chez Jack (REST-001)
```bash
curl "https://voix.vokalbox.fr/api/voice/menu-vokalbox?restaurant_code=REST-001"
```

**Résultat** : 52 plats dans 9 catégories récupérés avec succès ✅

---

## 📋 CONFIGURATION TELNYX (à faire maintenant)

### ÉTAPE 1 : Ouvrir l'AI Assistant

1. Aller sur https://portal.telnyx.com/#/ai/assistants
2. Sélectionner votre assistant (ou en créer un nouveau)
3. Cliquer sur **Edit**

---

### ÉTAPE 2 : Ajouter l'outil `get_menu`

Dans la section **Tools**, cliquer sur **Add Tool** :

**Configuration de l'outil :**

| Champ | Valeur |
|-------|--------|
| **Tool Name** | `get_menu` |
| **Tool Type** | Webhook |
| **HTTP Method** | GET |
| **URL** | `https://voix.vokalbox.fr/api/voice/menu-vokalbox` |
| **Description** | Récupère le menu du restaurant pour répondre aux questions sur les plats, prix et promotions |

**Paramètres à ajouter :**

#### Paramètre 1 : restaurant_code
- **Name** : `restaurant_code`
- **Type** : string
- **Required** : ✅ Yes
- **Description** : Code du restaurant (ex: REST-001)

#### Paramètre 2 : category (optionnel)
- **Name** : `category`
- **Type** : string
- **Required** : ❌ No
- **Description** : Filtrer par catégorie (ex: pizzas, desserts, boissons)

#### Paramètre 3 : promo (optionnel)
- **Name** : `promo`
- **Type** : boolean
- **Required** : ❌ No
- **Description** : Uniquement les plats en promotion

**Cliquer sur Save**

---

### ÉTAPE 3 : Modifier les Instructions de l'assistant

Dans l'onglet **Instructions**, **AJOUTER** cette section (ne pas effacer le reste) :

```
## QUESTIONS SUR LE MENU

Tu as accès à l'outil `get_menu` pour consulter le menu du restaurant en temps réel.

### Quand utiliser get_menu :
- Le client demande "Qu'avez-vous à la carte ?"
- Le client demande un type de plat spécifique (pizzas, desserts, etc.)
- Le client demande les prix
- Le client demande les promotions

### Comment l'utiliser :

1. **Menu complet** :
   - Client : "Qu'avez-vous à la carte ?"
   - Action : `get_menu(restaurant_code="{{restaurant_code}}")`

2. **Catégorie spécifique** :
   - Client : "Vous avez des pizzas ?"
   - Action : `get_menu(restaurant_code="{{restaurant_code}}", category="pizzas")`

3. **Promotions** :
   - Client : "Quelles sont vos offres ?"
   - Action : `get_menu(restaurant_code="{{restaurant_code}}", promo=true)`

### Règles de présentation :
- NE LIS PAS tout le menu d'un coup (trop long)
- Présente d'abord les CATÉGORIES disponibles
- Laisse le client choisir ce qui l'intéresse
- Donne 2-3 exemples par catégorie max
- Mentionne les PROMOTIONS en premier si disponibles

### Exemple de dialogue :
```
Client : Qu'avez-vous à manger ?
Assistant : [Appelle get_menu(restaurant_code="REST-001")]
Assistant : Nous avons au menu : des pizzas classiques, des pizzas spéciales, des pizzas végétariennes, des pizzas de la mer, des box apéro et des desserts. Qu'est-ce qui vous ferait plaisir ?

Client : Les pizzas spéciales, c'est quoi ?
Assistant : [Déjà récupéré avec get_menu précédent]
Assistant : En pizzas spéciales, je vous recommande la Pistadelle à 14.90€ avec mortadelle pistachée et stracciatella, ou la Burrata à 15.90€ avec burrata fumée et jambon cru de Modène. Nous avons aussi l'Envie de truffes à 17.90€. Laquelle vous tente ?
```

### Variables importantes :
- `{{restaurant_code}}` : Code du restaurant (ex: REST-001)
- Utilise TOUJOURS cette variable dans get_menu
```

**Cliquer sur Save**

---

### ÉTAPE 4 : Configurer les Variables Dynamiques (si pas encore fait)

Dans la section **Dynamic Variables**, configurer :

**Dynamic Variables Webhook URL** :
```
https://voix.vokalbox.fr/api/v1/voice/dynamic-vars
```

Cette URL injecte automatiquement les variables :
- `{{restaurant_code}}` → REST-001, REST-002, etc.
- `{{restaurant_name}}` → Nom du restaurant
- `{{horaires_ouverture}}` → Horaires
- etc.

---

### ÉTAPE 5 : Configurer la voix française

Dans l'onglet **Voice** :

1. **Speech-to-Text (STT)** :
   - Provider : Telnyx
   - Model : `openai/whisper-large-v3-turbo` ⚠️ IMPORTANT

2. **Text-to-Speech (TTS)** :
   - Provider : AWS Polly (recommandé)
   - Voice : `Lea` (voix féminine française)
   - Ou : `Celine` (alternative)

**Cliquer sur Save**

---

### ÉTAPE 6 : Assigner le numéro

Dans l'onglet **Phone Numbers** :

1. Sélectionner le numéro **+33 4 23 33 07 67**
2. Cliquer sur **Assign**

---

### ÉTAPE 7 : Enable l'assistant

1. Cliquer sur le toggle **Enable** en haut à droite
2. Vérifier que le statut passe à **Active**

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Endpoint direct (déjà fait ✅)
```bash
curl "https://voix.vokalbox.fr/api/voice/menu-vokalbox?restaurant_code=REST-001"
```
**Résultat** : Menu complet de Chez Jack avec 52 plats

### Test 2 : Filtre par catégorie
```bash
curl "https://voix.vokalbox.fr/api/voice/menu-vokalbox?restaurant_code=REST-001&category=desserts"
```
**Résultat attendu** : Uniquement les desserts (Douceurs)

### Test 3 : Filtre promotions
```bash
curl "https://voix.vokalbox.fr/api/voice/menu-vokalbox?restaurant_code=REST-001&promo=true"
```
**Résultat attendu** : Marguerite (-40%) et Ukrainienne (-20%)

### Test 4 : Appel téléphonique

**Scénario de test complet** :

1. **Appeler** le +33 4 23 33 07 67

2. **Test menu complet** :
   - Vous : "Bonjour, qu'avez-vous à la carte ?"
   - IA : [Devrait appeler get_menu et lister les catégories]

3. **Test catégorie** :
   - Vous : "Vous avez des desserts ?"
   - IA : [Devrait filtrer category=desserts et lister les douceurs]

4. **Test prix** :
   - Vous : "Combien coûte la Marguerite ?"
   - IA : [Devrait répondre 5.70€ en promo, prix normal 9.50€]

5. **Test promotions** :
   - Vous : "Avez-vous des offres spéciales ?"
   - IA : [Devrait appeler get_menu avec promo=true]

---

## 📊 RÉSULTATS ATTENDUS

### Réponse API (format JSON)
```json
{
  "success": true,
  "restaurant": {
    "code": "REST-001",
    "nom": "Chez Jack",
    "telephone": "+33493999999"
  },
  "menu": {
    "categories": [
      {
        "nom": "Pizzas classiques (33cm)",
        "plats": [
          {
            "nom": "Marguerite",
            "description": "Sauce tomate maison, mozzarella fior di latte...",
            "prix": [
              {
                "label": "Prix unique",
                "valeur": "5.70",
                "prix_original": "9.50",
                "promo": 40
              }
            ]
          }
        ]
      }
    ]
  },
  "stats": {
    "totalCategories": 9,
    "totalPlats": 52
  },
  "formatted_text": "MENU CHEZ JACK\n\nPIZZAS CLASSIQUES..."
}
```

### Ce que l'IA reçoit (formatted_text)
```
MENU CHEZ JACK

PIZZAS CLASSIQUES (33CM):
- Marguerite (5.70€): Sauce tomate maison, mozzarella fior di latte [PROMO -40%, prix normal 9.50€]
- Sicilienne (10.50€): Sauce tomate maison...
...
```

L'IA utilise le `formatted_text` pour répondre naturellement au client.

---

## 🎯 AVANTAGES DE CETTE INTÉGRATION

1. ✅ **Temps réel** : Menu toujours à jour (synchronisé avec VokalBoxMaître)
2. ✅ **Multi-restaurants** : Un seul endpoint pour tous les restaurants
3. ✅ **Promotions automatiques** : Détection et mise en avant des promos
4. ✅ **Filtrage intelligent** : Par catégorie ou promotions uniquement
5. ✅ **Format optimisé** : Texte formaté spécialement pour la voix
6. ✅ **Performance** : Réponse rapide (< 500ms)

---

## 🔄 WORKFLOW COMPLET

```
┌─────────────────────────┐
│ Client appelle          │
│ +33 4 23 33 07 67      │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Telnyx AI Assistant     │
│ Webhook Dynamic Vars    │
│ → Injecte restaurant_code│
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Client demande menu     │
│ "Qu'avez-vous ?"       │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ IA appelle get_menu     │
│ restaurant_code=REST-001│
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ API /menu-vokalbox      │
│ Requête MySQL           │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Retour menu formaté     │
│ 52 plats, 9 catégories │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ IA présente le menu     │
│ au client (voix)        │
└─────────────────────────┘
```

---

## 📝 CHECKLIST FINALE

Avant de tester l'appel :

- [ ] Endpoint testé : `curl "https://voix.vokalbox.fr/api/voice/menu-vokalbox?restaurant_code=REST-001"` ✅
- [ ] Outil `get_menu` ajouté dans Telnyx Tools
- [ ] Paramètres configurés (restaurant_code requis, category/promo optionnels)
- [ ] Instructions modifiées pour inclure l'usage du menu
- [ ] Variables dynamiques configurées (webhook /dynamic-vars)
- [ ] Voix française : STT = whisper-large-v3-turbo, TTS = AWS Polly Lea
- [ ] Numéro +33 4 23 33 07 67 assigné à l'assistant
- [ ] Assistant **Enabled** (toggle activé)

---

## 🎬 PROCHAINES ÉTAPES

### Immédiat (à faire maintenant)
1. ✅ Configurer l'outil get_menu dans Telnyx (étape 2)
2. ✅ Modifier les Instructions (étape 3)
3. ✅ Vérifier la voix française (étape 5)
4. ✅ Tester l'appel téléphonique (test 4)

### Court terme
1. Ajouter d'autres restaurants (REST-002, REST-003...)
2. Tester avec plusieurs restaurants
3. Affiner les réponses de l'IA selon les retours clients

### Moyen terme
1. Prise de commande via l'IA (pas seulement info menu)
2. Réservation de table intégrée
3. Envoi SMS de confirmation

---

## 🐛 DÉPANNAGE

### L'IA ne trouve pas le menu
**Vérifier** :
1. L'outil `get_menu` est bien configuré dans Telnyx
2. Le paramètre `restaurant_code` est bien passé
3. Les Instructions mentionnent l'usage de `{{restaurant_code}}`
4. Le webhook Dynamic Variables fonctionne

**Test manuel** :
```bash
curl "https://voix.vokalbox.fr/api/voice/menu-vokalbox?restaurant_code=REST-001"
```

### L'IA parle anglais
**Vérifier** :
1. STT = `openai/whisper-large-v3-turbo` ⚠️ CRITIQUE
2. TTS = AWS Polly avec voix française (Lea ou Celine)

### Le menu n'est pas à jour
**Action** :
1. Aller sur https://app.vokalbox.fr/maitre/
2. Se connecter avec REST-001
3. Rescanner le menu
4. Sauvegarder

---

## 📞 SUPPORT

**Si problème pendant les tests** :
1. Noter l'heure exacte de l'appel
2. Récupérer les logs : `pm2 logs vocalbox-api --lines 50`
3. Vérifier la Conversation History dans Telnyx
4. Tester l'endpoint manuellement avec curl

**Fichiers importants** :
- `/home/vocalbox/api/routes/voice-menu-integration.js` → Endpoint menu
- `/home/vocalbox/api/server.js` → Configuration routes
- `https://portal.telnyx.com/#/ai/assistants` → Configuration Telnyx

---

**Date** : 18 décembre 2025
**Status** : Backend prêt ✅ - Configuration Telnyx à faire
**Version** : VokalBoxMaître VERSION-02 + Intégration Menu API
