# 🚀 VOKALBOXAPI - GUIDE DE DÉMARRAGE RAPIDE

## ✅ CE QUI A ÉTÉ CRÉÉ

**API Node.js complète avec :**

✅ Authentification JWT
✅ Gestion des restaurants
✅ Gestion des menus et plats  
✅ Gestion des commandes
✅ Statistiques (CA, plats populaires, etc.)
✅ Webhooks Stripe (paiements)
✅ Webhooks Telnyx (téléphonie)
✅ Base de données MySQL complète
✅ Sécurité (Helmet, CORS, Rate Limiting)
✅ Documentation complète

---

## 📦 FICHIERS CRÉÉS

```
vokalboxapi/
├── config/
│   └── database.js              ✅ Connexion MySQL
├── middlewares/
│   ├── auth.js                  ✅ Authentification JWT
│   └── errorHandler.js          ✅ Gestion erreurs
├── routes/
│   ├── auth.js                  ✅ Login/Register
│   ├── restaurants.js           ✅ Gestion restaurants
│   ├── menus.js                 ✅ Gestion menus/plats
│   ├── commandes.js             ✅ Gestion commandes
│   ├── stats.js                 ✅ Statistiques
│   ├── stripe.js                ✅ Webhooks Stripe
│   └── telnyx.js                ✅ Webhooks Telnyx
├── database/
│   └── schema.sql               ✅ Schéma BDD complet
├── server.js                    ✅ Serveur principal
├── package.json                 ✅ Dépendances
├── .env.example                 ✅ Config exemple
├── .gitignore                   ✅ Fichiers à ignorer
└── README.md                    ✅ Documentation

TOTAL : 14 fichiers créés
```

---

## 🎯 PROCHAINES ÉTAPES (ORDRE)

### 1️⃣ INSTALLATION EN LOCAL (30 min)

```bash
# 1. Télécharger le dossier vokalboxapi
# 2. Ouvrir un terminal dans le dossier
cd vokalboxapi

# 3. Installer les dépendances
npm install

# 4. Créer la base de données MySQL
mysql -u root -p
CREATE DATABASE vokalbox;
CREATE USER 'vocalbox_user'@'localhost' IDENTIFIED BY 'VocalBox2024';
GRANT ALL PRIVILEGES ON vokalbox.* TO 'vocalbox_user'@'localhost';
EXIT;

# 5. Importer le schéma
mysql -u vocalbox_user -p vokalbox < database/schema.sql

# 6. Créer le .env
cp .env.example .env
nano .env  # Modifier les valeurs

# 7. Démarrer le serveur
npm run dev
```

**Test :** Ouvrir http://localhost:3000 dans le navigateur

---

### 2️⃣ CONFIGURATION STRIPE (15 min)

**a) Créer un compte Stripe (mode test)**
1. Aller sur https://stripe.com
2. Créer un compte
3. Activer le mode test
4. Récupérer les clés :
   - Clé secrète : `sk_test_...`
   - Clé publique : `pk_test_...`

**b) Configurer le webhook Stripe**
1. Dashboard Stripe → Développeurs → Webhooks
2. Ajouter un endpoint : `https://api.vokalbox.fr/webhooks/stripe`
3. Sélectionner les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Récupérer le secret : `whsec_...`

**c) Mettre à jour le .env**
```env
STRIPE_SECRET_KEY=sk_test_votre_cle
STRIPE_WEBHOOK_SECRET=whsec_votre_secret
```

---

### 3️⃣ DÉPLOIEMENT SUR HOSTINGER (45 min)

**a) Préparer le dépôt Git**
```bash
cd vokalboxapi
git init
git add .
git commit -m "Initial VokalBoxAPI"
# Créer un repo sur GitHub
git remote add origin https://github.com/votre-compte/vokalboxapi.git
git push -u origin main
```

**b) Connexion SSH Hostinger**
```bash
ssh u123456789@31.97.53.227 -p 65002
```

**c) Installation sur le serveur**
```bash
cd ~/domains/api.vokalbox.fr/public_html
git clone https://github.com/votre-compte/vokalboxapi.git
cd vokalboxapi
npm install --production

# Créer le .env production
nano .env
# Copier le contenu depuis .env.example et adapter

# Créer la base MySQL sur Hostinger
mysql -u u123456789 -p
CREATE DATABASE u123456789_vokalbox;
EXIT;

# Importer le schéma
mysql -u u123456789 -p u123456789_vokalbox < database/schema.sql

# Démarrer avec PM2
pm2 start server.js --name vokalboxapi
pm2 save
```

**d) Configurer Nginx**
Voir le fichier README.md section "Configurer Nginx"

---

### 4️⃣ INTÉGRATION AVEC VOKALBOXRESTO (30 min)

**Modifier VokalBoxResto/script.js :**

```javascript
// Ligne 2 - API URL
const API_URL = 'https://api.vokalbox.fr';

// Ligne 290 - Fonction createPaymentIntent
async function createPaymentIntent() {
    const response = await fetch(`${API_URL}/webhooks/stripe/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            restaurant_id: formData.restaurantId, // Sera créé dans submitForm
            email: formData.email
        })
    });
    
    const data = await response.json();
    return data.data.clientSecret;
}

// Ligne 250 - Après la création du restaurant
async function submitForm() {
    // ... code existant ...
    
    // 1. Créer le restaurant via l'API
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: formData.email,
            password: generatePassword(), // Générer un mot de passe
            nom_restaurant: formData.restaurantName,
            telephone: formData.phone,
            adresse: formData.address,
            code_postal: formData.postalCode,
            ville: formData.city
        })
    });
    
    const registerData = await registerResponse.json();
    formData.restaurantId = registerData.data.restaurantId;
    
    // 2. Continuer avec le paiement...
}

// Après le paiement réussi
async function handlePaymentSuccess() {
    // Upload des photos
    const uploadResponse = await fetch(`${API_URL}/api/restaurants/upload-menu-photos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${formData.token}`
        },
        body: JSON.stringify({
            photos: formData.photos
        })
    });
    
    // Envoyer email de confirmation, etc.
}
```

---

### 5️⃣ TESTS COMPLETS (30 min)

**Test 1 : Santé de l'API**
```bash
curl https://api.vokalbox.fr/health
```

**Test 2 : Inscription restaurant**
```bash
curl -X POST https://api.vokalbox.fr/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@resto.fr",
    "password": "Test123!",
    "nom_restaurant": "Test Restaurant",
    "telephone": "0601020304",
    "adresse": "123 Rue Test",
    "code_postal": "06000",
    "ville": "Nice"
  }'
```

**Test 3 : Connexion**
```bash
curl -X POST https://api.vokalbox.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@resto.fr",
    "password": "Test123!"
  }'
```

**Test 4 : Récupérer le menu**
```bash
curl https://api.vokalbox.fr/api/menus/1
```

**Test 5 : Créer une commande**
```bash
curl -X POST https://api.vokalbox.fr/api/commandes \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 1,
    "telephone_client": "0612345678",
    "items": [
      {"plat_id": 1, "quantite": 2},
      {"plat_id": 3, "quantite": 1}
    ]
  }'
```

---

## 📊 STRUCTURE DE LA BASE DE DONNÉES

**Tables créées :**
- ✅ `restaurants` - Infos restaurants + abonnements
- ✅ `categories` - Catégories de menu (Entrées, Plats, etc.)
- ✅ `plats` - Liste des plats avec prix et promos
- ✅ `commandes` - Commandes des clients
- ✅ `commande_items` - Détail des plats commandés
- ✅ `paniers` - Paniers temporaires (appels Telnyx)
- ✅ `menu_photos` - Photos uploadées
- ✅ `paiements` - Historique paiements Stripe
- ✅ `logs` - Logs d'activité
- ✅ `sessions` - Sessions utilisateurs

**Données de test incluses :**
- 1 restaurant test
- 4 catégories (Entrées, Plats, Desserts, Boissons)
- 6 plats exemple

---

## 🔑 POINTS IMPORTANTS

### Sécurité
⚠️ Générer un JWT_SECRET fort (32+ caractères)
⚠️ Ne JAMAIS commit le .env
⚠️ Utiliser HTTPS en production
⚠️ Vérifier les signatures des webhooks

### Performance
✅ Pool de connexions MySQL (10 connexions)
✅ Compression gzip activée
✅ Rate limiting (100 req/15min)
✅ Indexes sur les colonnes principales

### Webhooks
📍 Stripe : `/webhooks/stripe`
📍 Telnyx : `/webhooks/telnyx`

---

## 🎯 APRÈS LE DÉPLOIEMENT

**Tu pourras :**
1. ✅ Recevoir les inscriptions depuis VokalBoxResto
2. ✅ Traiter les paiements Stripe
3. ✅ Gérer les menus et plats
4. ✅ Créer des commandes
5. ✅ Voir les statistiques
6. ✅ Intégrer Telnyx pour les appels

**Prochaine étape :**
→ Créer **VokalBoxDashboard** (l'interface restaurant)

---

## 📞 BESOIN D'AIDE ?

**Si tu as un problème :**
1. Vérifie les logs : `pm2 logs vokalboxapi`
2. Teste la connexion MySQL
3. Vérifie le .env
4. Consulte le README.md

**Tu peux me rappeler à tout moment pour :**
- Débugger un problème
- Ajouter une fonctionnalité
- Modifier l'API
- Créer le Dashboard

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [ ] Installer en local
- [ ] Tester en local (http://localhost:3000)
- [ ] Créer compte Stripe mode test
- [ ] Configurer webhooks Stripe
- [ ] Créer repo Git
- [ ] Déployer sur Hostinger
- [ ] Configurer Nginx
- [ ] Tester en production (https://api.vokalbox.fr)
- [ ] Intégrer avec VokalBoxResto
- [ ] Tests end-to-end

---

**Développé par E Formateck**
**Version 1.0.0**
**Janvier 2024**
