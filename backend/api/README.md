# VokalBoxAPI - Documentation Complète

## 📋 Vue d'ensemble

VokalBoxAPI est le **cœur du système VokalBox**. C'est l'API centrale qui gère :
- 🏪 Les restaurants et leurs abonnements
- 📋 Les menus et les plats
- 📦 Les commandes
- 💳 Les paiements Stripe
- 📞 L'intégration Telnyx (téléphonie)
- 📊 Les statistiques

---

## 🏗️ Architecture

```
VokalBoxAPI/
├── config/
│   └── database.js          # Configuration MySQL
├── middlewares/
│   ├── auth.js              # Authentification JWT
│   └── errorHandler.js      # Gestion des erreurs
├── routes/
│   ├── auth.js              # Authentification
│   ├── restaurants.js       # Gestion restaurants
│   ├── menus.js             # Gestion menus/plats
│   ├── commandes.js         # Gestion commandes
│   ├── stats.js             # Statistiques
│   ├── stripe.js            # Webhooks Stripe
│   └── telnyx.js            # Webhooks Telnyx
├── database/
│   └── schema.sql           # Schéma de base de données
├── server.js                # Serveur principal
├── package.json             # Dépendances
└── .env                     # Configuration (à créer)
```

---

## 📦 Installation

### 1️⃣ Prérequis

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MySQL** >= 8.0
- Compte **Stripe** (mode test)
- Compte **Telnyx** (optionnel au début)

### 2️⃣ Installation des dépendances

```bash
cd vokalboxapi
npm install
```

### 3️⃣ Configuration de la base de données

**a) Créer la base de données :**

```bash
mysql -u root -p
```

```sql
CREATE DATABASE vokalbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vocalbox_user'@'localhost' IDENTIFIED BY 'VocalBox2024Secure';
GRANT ALL PRIVILEGES ON vokalbox.* TO 'vocalbox_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**b) Importer le schéma :**

```bash
mysql -u vocalbox_user -p vokalbox < database/schema.sql
```

### 4️⃣ Configuration de l'environnement

**Créer le fichier `.env` :**

```bash
cp .env.example .env
nano .env
```

**Modifier les valeurs :**

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=vocalbox_user
DB_PASSWORD=VocalBox2024Secure
DB_NAME=vokalbox

# Serveur
PORT=3000
NODE_ENV=development

# JWT Secret (générer une clé sécurisée)
JWT_SECRET=votre_secret_jwt_super_long_et_securise_ici

# Stripe (clés de test)
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_secret_webhook

# URLs
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174
```

### 5️⃣ Démarrer le serveur

**Mode développement :**

```bash
npm run dev
```

**Mode production :**

```bash
npm start
```

Le serveur démarre sur **http://localhost:3000**

---

## 🚀 Déploiement sur Hostinger

### 1️⃣ Connexion SSH

```bash
ssh u123456789@31.97.53.227 -p 65002
```

### 2️⃣ Créer le dossier de l'API

```bash
cd ~/domains/api.vokalbox.fr/public_html
mkdir vokalboxapi
cd vokalboxapi
```

### 3️⃣ Upload des fichiers

**Option A : Via Git (recommandé)**

```bash
# Sur votre machine locale
cd vokalboxapi
git init
git add .
git commit -m "Initial commit VokalBoxAPI"
git remote add origin https://github.com/votre-compte/vokalboxapi.git
git push -u origin main

# Sur Hostinger
git clone https://github.com/votre-compte/vokalboxapi.git .
```

**Option B : Via FileZilla/SFTP**

1. Ouvrir FileZilla
2. Connexion :
   - Hôte : `sftp://31.97.53.227`
   - Port : `65002`
   - Utilisateur : `u123456789`
   - Mot de passe : `P@ssw0rd-Host2025!`
3. Naviguer vers `/domains/api.vokalbox.fr/public_html/vokalboxapi`
4. Uploader tous les fichiers

### 4️⃣ Installation sur Hostinger

```bash
# Installer les dépendances
npm install --production

# Créer le .env
cp .env.example .env
nano .env
```

**Modifier le .env pour la production :**

```env
DB_HOST=localhost
DB_USER=u123456789_vocalbox
DB_PASSWORD=VotreMDP
DB_NAME=u123456789_vokalbox

PORT=3000
NODE_ENV=production

JWT_SECRET=votre_secret_production_tres_long

STRIPE_SECRET_KEY=sk_live_votre_cle_stripe_production
STRIPE_WEBHOOK_SECRET=whsec_votre_secret_production

API_BASE_URL=https://api.vokalbox.fr
FRONTEND_URL=https://vokalbox.fr
DASHBOARD_URL=https://dashboard.vokalbox.fr
```

### 5️⃣ Configurer PM2

```bash
# Installer PM2 globalement (si pas déjà fait)
npm install -g pm2

# Démarrer l'API avec PM2
pm2 start server.js --name "vokalboxapi"

# Sauvegarder la config PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

### 6️⃣ Configurer Nginx

**Créer le fichier de configuration :**

```bash
sudo nano /etc/nginx/sites-available/api.vokalbox.fr
```

**Contenu :**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.vokalbox.fr;

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.vokalbox.fr;

    # SSL
    ssl_certificate /etc/letsencrypt/live/vokalbox.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vokalbox.fr/privkey.pem;

    # Logs
    access_log /var/log/nginx/api.vokalbox.fr.access.log;
    error_log /var/log/nginx/api.vokalbox.fr.error.log;

    # Proxy vers Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Augmenter la taille max des uploads
    client_max_body_size 10M;
}
```

**Activer le site :**

```bash
sudo ln -s /etc/nginx/sites-available/api.vokalbox.fr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📡 Endpoints API

### 🔐 Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription restaurant |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/refresh` | Rafraîchir le token |

### 🏪 Restaurants

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/restaurants/me` | ✅ | Infos du restaurant |
| PUT | `/api/restaurants/me` | ✅ | Modifier le restaurant |
| GET | `/api/restaurants/by-phone/:phone` | ❌ | Restaurant par numéro Telnyx |
| POST | `/api/restaurants/upload-menu-photos` | ✅ | Upload photos menu |
| GET | `/api/restaurants/:id/status` | ✅ | Statut numérisation |

### 📋 Menus

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/menus/:restaurantId` | ❌ | Menu complet |
| POST | `/api/menus/:restaurantId/categories` | ✅ | Créer catégorie |
| POST | `/api/menus/:restaurantId/plats` | ✅ | Créer plat |
| PUT | `/api/menus/plats/:platId` | ✅ | Modifier plat |
| DELETE | `/api/menus/plats/:platId` | ✅ | Supprimer plat |
| GET | `/api/menus/:restaurantId/promotions` | ❌ | Plats en promo |

### 📦 Commandes

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/commandes` | ❌ | Créer commande |
| GET | `/api/commandes/:restaurantId` | ✅ | Toutes les commandes |
| GET | `/api/commandes/:restaurantId/today` | ✅ | Commandes du jour |
| GET | `/api/commandes/detail/:commandeId` | ✅ | Détail commande |
| PATCH | `/api/commandes/:commandeId/status` | ✅ | Changer statut |
| POST | `/api/commandes/panier/create` | ❌ | Créer panier |
| POST | `/api/commandes/panier/:sessionId/add` | ❌ | Ajouter au panier |

### 📊 Statistiques

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/stats/:restaurantId` | ✅ | Stats globales |
| GET | `/api/stats/:restaurantId/plats-populaires` | ✅ | Top plats |
| GET | `/api/stats/:restaurantId/historique` | ✅ | CA historique |
| GET | `/api/stats/:restaurantId/heures-pointe` | ✅ | Heures de pointe |

### 🔗 Webhooks

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/webhooks/stripe` | Webhooks Stripe |
| POST | `/webhooks/stripe/create-payment-intent` | Créer paiement |
| POST | `/webhooks/telnyx` | Webhooks Telnyx |
| POST | `/webhooks/telnyx/voice-response` | Réponse vocale |

---

## 🧪 Tests

### Test de santé

```bash
curl http://localhost:3000/health
```

**Réponse attendue :**

```json
{
  "success": true,
  "message": "VokalBoxAPI est en ligne",
  "version": "1.0.0",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Test d'authentification

```bash
# Inscription
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@restaurant.fr",
    "password": "password123",
    "nom_restaurant": "Restaurant Test",
    "telephone": "0601020304",
    "adresse": "123 Rue Test",
    "code_postal": "06000",
    "ville": "Nice"
  }'

# Connexion
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@restaurant.fr",
    "password": "password123"
  }'
```

### Test des menus

```bash
# Récupérer un menu (remplacer TOKEN et RESTAURANT_ID)
curl http://localhost:3000/api/menus/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Sécurité

### Points importants

✅ **JWT** : Authentification sécurisée
✅ **Helmet** : Protection des headers HTTP
✅ **CORS** : Contrôle des origines
✅ **Rate Limiting** : Protection contre les abus
✅ **SQL Injection** : Paramètres préparés
✅ **XSS** : Validation des entrées

### Bonnes pratiques

- ⚠️ Ne JAMAIS commit le `.env`
- ⚠️ Générer un `JWT_SECRET` fort (32+ caractères)
- ⚠️ Utiliser HTTPS en production
- ⚠️ Vérifier les signatures des webhooks
- ⚠️ Logger les erreurs importantes

---

## 🐛 Dépannage

### Erreur de connexion MySQL

```bash
# Vérifier que MySQL est démarré
sudo systemctl status mysql

# Tester la connexion
mysql -u vocalbox_user -p vokalbox
```

### Port 3000 déjà utilisé

```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
kill -9 PID
```

### PM2 ne démarre pas

```bash
# Voir les logs
pm2 logs vokalboxapi

# Redémarrer
pm2 restart vokalboxapi

# Supprimer et recréer
pm2 delete vokalboxapi
pm2 start server.js --name "vokalboxapi"
```

---

## 📞 Support

**Développé par** : E Formateck
**Contact** : Jack
**Email** : contact@eformatech.fr

---

## 📄 Licence

Propriétaire - E Formateck © 2024
