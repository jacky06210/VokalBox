# 🔗 INTÉGRATION TELNYX ↔ VOKALBOXMAÎTRE VERSION 02

## 📋 Vue d'ensemble

**Objectif** : Permettre à l'assistant vocal Telnyx d'accéder aux menus numérisés dans VokalBoxMaître pour répondre aux questions des clients.

**Architecture** :
```
Appel téléphonique → Telnyx AI Assistant → Webhook Menu → Base de données VokalBox → Retour menu au format texte
```

---

## 🎯 Cas d'usage

### Scénario 1 : Client demande le menu
**Client** : "Qu'avez-vous à la carte ?"
**Telnyx** : Appelle webhook `/api/voice/menu`
**Réponse** : Liste des plats par catégorie avec prix

### Scénario 2 : Client demande un plat spécifique
**Client** : "Vous avez des pizzas ?"
**Telnyx** : Appelle webhook `/api/voice/menu?category=pizzas`
**Réponse** : Liste des pizzas disponibles avec prix

### Scénario 3 : Client demande les promotions
**Client** : "Avez-vous des offres spéciales ?"
**Telnyx** : Appelle webhook `/api/voice/menu?promo=true`
**Réponse** : Liste des plats en promotion

---

## 🛠️ Implémentation Technique

### 1. Nouveau endpoint API à créer

**Fichier** : `/home/vocalbox/api/routes/voice-menu.js`

**Endpoint** : `GET /api/voice/menu`

**Paramètres** :
- `restaurant_code` (string, requis) : Code restaurant (ex: REST-001)
- `category` (string, optionnel) : Filtrer par catégorie
- `promo` (boolean, optionnel) : Uniquement les promos

**Réponse format JSON** :
```json
{
  "success": true,
  "restaurant": {
    "code": "REST-001",
    "nom": "Chez Jack",
    "telephone": "+33423330767"
  },
  "menu": {
    "categories": [
      {
        "nom": "Entrées",
        "plats": [
          {
            "nom": "Salade César",
            "prix": "8.50€",
            "description": "Salade romaine, parmesan, croûtons",
            "promo": false
          }
        ]
      }
    ]
  },
  "formatted_text": "MENU CHEZ JACK\n\nENTRÉES:\n- Salade César (8.50€): Salade romaine, parmesan, croûtons\n..."
}
```

### 2. Requête SQL nécessaire

```sql
SELECT
    r.code,
    r.nom,
    r.telephone,
    m.items
FROM restaurants r
LEFT JOIN menus m ON r.id = m.restaurant_id
WHERE r.code = ?
ORDER BY m.updated_at DESC
LIMIT 1
```

### 3. Configuration Telnyx

**Outil à ajouter dans l'AI Assistant** :

**Nom** : `get_menu`
**Type** : Webhook
**URL** : `https://voix.vokalbox.fr/api/voice/menu`
**Méthode** : GET
**Description** : "Récupérer le menu du restaurant pour répondre aux questions sur les plats, prix et promotions"

**Paramètres** :
```json
{
  "restaurant_code": {
    "type": "string",
    "description": "Code du restaurant (ex: REST-001)",
    "required": true
  },
  "category": {
    "type": "string",
    "description": "Catégorie de plats (entrées, plats, desserts, boissons)",
    "required": false
  },
  "promo": {
    "type": "boolean",
    "description": "Uniquement les plats en promotion",
    "required": false
  }
}
```

### 4. Modification du script Telnyx

**Ajout dans les Instructions** :

```
## QUESTIONS SUR LE MENU

Si le client demande des informations sur le menu, les plats ou les prix :

1. Utilise l'outil `get_menu` avec le code restaurant : {{restaurant_code}}
2. Si le client demande une catégorie spécifique (entrées, plats, desserts), ajoute le paramètre `category`
3. Si le client demande les promotions, ajoute le paramètre `promo=true`
4. Présente les informations de façon naturelle et concise
5. Ne lis pas TOUT le menu sauf si demandé explicitement
6. Propose de détailler une section si le menu est long

Exemples :
- "Qu'avez-vous à la carte ?" → get_menu(restaurant_code={{restaurant_code}})
- "Vous avez des pizzas ?" → get_menu(restaurant_code={{restaurant_code}}, category="pizzas")
- "Quelles sont vos offres ?" → get_menu(restaurant_code={{restaurant_code}}, promo=true)
```

---

## 📝 Plan d'implémentation

### Phase 1 : Backend (15 min)
1. ✅ Créer `/home/vocalbox/api/routes/voice-menu.js`
2. ✅ Ajouter la route dans `/home/vocalbox/api/server.js`
3. ✅ Tester avec curl
4. ✅ Redémarrer PM2

### Phase 2 : Telnyx (10 min)
1. ✅ Ouvrir l'AI Assistant dans Telnyx Portal
2. ✅ Ajouter l'outil `get_menu`
3. ✅ Modifier les Instructions pour inclure l'usage du menu
4. ✅ Sauvegarder

### Phase 3 : Tests (10 min)
1. ✅ Tester l'endpoint directement : `curl https://voix.vokalbox.fr/api/voice/menu?restaurant_code=REST-001`
2. ✅ Appeler le numéro Telnyx
3. ✅ Demander "Qu'avez-vous à la carte ?"
4. ✅ Vérifier que l'IA répond avec le menu

---

## 🔍 Tests manuels

### Test 1 : Endpoint direct
```bash
curl "https://voix.vokalbox.fr/api/voice/menu?restaurant_code=REST-001"
```

**Résultat attendu** :
```json
{
  "success": true,
  "restaurant": {...},
  "menu": {...},
  "formatted_text": "MENU CHEZ JACK\n\n..."
}
```

### Test 2 : Avec catégorie
```bash
curl "https://voix.vokalbox.fr/api/voice/menu?restaurant_code=REST-001&category=entrées"
```

### Test 3 : Avec promotions
```bash
curl "https://voix.vokalbox.fr/api/voice/menu?restaurant_code=REST-001&promo=true"
```

### Test 4 : Appel téléphonique
1. Appeler **+33 4 23 33 07 67**
2. Dire : "Qu'avez-vous à la carte ?"
3. L'IA devrait utiliser l'outil `get_menu` et répondre avec le menu

---

## 📊 Base de données

### Structure actuelle de la table `menus`
```sql
CREATE TABLE menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    items JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
```

### Format JSON du champ `items`
```json
{
  "categories": [
    {
      "nom": "Entrées",
      "items": [
        {
          "nom": "Salade César",
          "prix": "8.50",
          "description": "Salade romaine, parmesan, croûtons",
          "promo": false
        }
      ]
    }
  ]
}
```

---

## 🚀 Code à implémenter

### Fichier `/home/vocalbox/api/routes/voice-menu.js`

```javascript
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Configuration DB
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'vocalbox_user',
    password: process.env.DB_PASSWORD || 'VocalBox2024Secure',
    database: process.env.DB_NAME || 'vocalbox'
};

// GET /api/voice/menu - Récupérer le menu d'un restaurant
router.get('/menu', async (req, res) => {
    try {
        const { restaurant_code, category, promo } = req.query;

        if (!restaurant_code) {
            return res.status(400).json({
                success: false,
                error: 'Code restaurant requis (restaurant_code)'
            });
        }

        const connection = await mysql.createConnection(dbConfig);

        // Récupérer restaurant + menu
        const [rows] = await connection.execute(`
            SELECT
                r.id,
                r.code,
                r.nom,
                r.telephone,
                m.items
            FROM restaurants r
            LEFT JOIN menus m ON r.id = m.restaurant_id
            WHERE r.code = ?
            ORDER BY m.updated_at DESC
            LIMIT 1
        `, [restaurant_code]);

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant non trouvé'
            });
        }

        const restaurant = rows[0];

        if (!restaurant.items) {
            return res.json({
                success: true,
                restaurant: {
                    code: restaurant.code,
                    nom: restaurant.nom,
                    telephone: restaurant.telephone
                },
                menu: null,
                formatted_text: `${restaurant.nom} n'a pas encore de menu numérisé.`
            });
        }

        let menuData = JSON.parse(restaurant.items);

        // Filtrer par catégorie si demandé
        if (category) {
            menuData.categories = menuData.categories.filter(cat =>
                cat.nom.toLowerCase().includes(category.toLowerCase())
            );
        }

        // Filtrer par promo si demandé
        if (promo === 'true') {
            menuData.categories = menuData.categories.map(cat => ({
                ...cat,
                items: cat.items.filter(item => item.promo === true)
            })).filter(cat => cat.items.length > 0);
        }

        // Générer texte formaté pour l'IA
        let formattedText = `MENU ${restaurant.nom.toUpperCase()}\n\n`;

        menuData.categories.forEach(cat => {
            formattedText += `${cat.nom.toUpperCase()}:\n`;
            cat.items.forEach(item => {
                formattedText += `- ${item.nom} (${item.prix}€)`;
                if (item.description) {
                    formattedText += `: ${item.description}`;
                }
                if (item.promo) {
                    formattedText += ` [PROMO]`;
                }
                formattedText += `\n`;
            });
            formattedText += `\n`;
        });

        res.json({
            success: true,
            restaurant: {
                code: restaurant.code,
                nom: restaurant.nom,
                telephone: restaurant.telephone
            },
            menu: menuData,
            formatted_text: formattedText
        });

    } catch (error) {
        console.error('Erreur /api/voice/menu:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

module.exports = router;
```

### Modification de `/home/vocalbox/api/server.js`

Ajouter après les autres routes :

```javascript
const voiceMenuRouter = require('./routes/voice-menu');
app.use('/api/voice', voiceMenuRouter);
```

---

## ✅ Checklist déploiement

- [ ] Créer `/home/vocalbox/api/routes/voice-menu.js`
- [ ] Modifier `/home/vocalbox/api/server.js` pour ajouter la route
- [ ] `pm2 restart vocalbox-api`
- [ ] Tester : `curl https://voix.vokalbox.fr/api/voice/menu?restaurant_code=REST-001`
- [ ] Ouvrir Telnyx Portal → AI Assistants
- [ ] Ajouter outil `get_menu` avec webhook
- [ ] Modifier Instructions pour intégrer l'usage du menu
- [ ] Sauvegarder et Enable
- [ ] Appeler +33 4 23 33 07 67
- [ ] Demander "Qu'avez-vous à la carte ?"
- [ ] Vérifier la réponse contient le menu

---

## 🎯 Résultat attendu

Après implémentation, l'assistant vocal Telnyx pourra :

1. ✅ Répondre aux questions sur le menu
2. ✅ Donner les prix des plats
3. ✅ Présenter les promotions
4. ✅ Filtrer par catégorie (entrées, plats, desserts)
5. ✅ Utiliser les données en temps réel de VokalBoxMaître

**Exemple de dialogue** :

```
Client : Bonjour, qu'avez-vous comme entrées ?
IA : [Appelle get_menu(restaurant_code=REST-001, category=entrées)]
IA : Nous avons en entrées : Salade César à 8.50€, Soupe du jour à 6€, et Bruschetta à 7€. Que désirez-vous ?
Client : La salade César, c'est quoi exactement ?
IA : La Salade César est composée de salade romaine, parmesan et croûtons. C'est 8.50€.
```

---

**Date** : 18 décembre 2025
**Version** : VokalBoxMaître VERSION-02 (code restaurant)
**Status** : Prêt à implémenter
