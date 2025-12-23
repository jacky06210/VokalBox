# VokalBox Dashboard - Documentation

## 📋 Vue d'ensemble

**VokalBox Dashboard** est l'interface web pour les restaurateurs. C'est l'application que les restaurateurs utilisent sur tablette, ordinateur ou smartphone pour :

- 📱 Voir les commandes en temps réel
- 🔔 Gérer les statuts des commandes
- 📊 Consulter les statistiques
- 🍕 Gérer le menu et les promotions
- ⚙️ Paramétrer le restaurant

---

## 🏗️ Technologies

- **React 18** - Framework JavaScript
- **Vite** - Build tool ultra-rapide
- **TailwindCSS** - Framework CSS utility-first
- **React Router** - Navigation
- **React Query** - Gestion des données et cache
- **Zustand** - State management
- **Axios** - Client HTTP
- **Recharts** - Graphiques
- **React Hot Toast** - Notifications
- **Lucide React** - Icônes

---

## 📦 Installation

### 1️⃣ Prérequis

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **VokalBoxAPI** déjà déployée et accessible

### 2️⃣ Installation des dépendances

```bash
cd vokalboxdashboard
npm install
```

### 3️⃣ Configuration

**Créer le fichier `.env` :**

```bash
cp .env.example .env
```

**Modifier les valeurs :**

```env
# URL de l'API VokalBox
VITE_API_URL=https://api.vokalbox.fr

# Environnement
VITE_ENV=development
```

### 4️⃣ Démarrer en développement

```bash
npm run dev
```

L'application démarre sur **http://localhost:5174**

### 5️⃣ Build pour la production

```bash
npm run build
```

Les fichiers sont générés dans le dossier `dist/`

---

## 🚀 Déploiement sur Hostinger

### Option 1 : Déploiement manuel

**1. Build l'application :**

```bash
npm run build
```

**2. Connexion SSH :**

```bash
ssh u123456789@31.97.53.227 -p 65002
```

**3. Créer le dossier :**

```bash
cd ~/domains/dashboard.vokalbox.fr/public_html
```

**4. Upload des fichiers :**

Via FileZilla ou SFTP, uploader le contenu du dossier `dist/` vers `public_html/`

**5. Configurer Nginx :**

```nginx
server {
    listen 80;
    server_name dashboard.vokalbox.fr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.vokalbox.fr;

    ssl_certificate /etc/letsencrypt/live/vokalbox.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vokalbox.fr/privkey.pem;

    root /home/u123456789/domains/dashboard.vokalbox.fr/public_html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**6. Recharger Nginx :**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2 : Déploiement avec Git

**1. Créer un repo GitHub :**

```bash
git init
git add .
git commit -m "Initial VokalBoxDashboard"
git remote add origin https://github.com/votre-compte/vokalboxdashboard.git
git push -u origin main
```

**2. Sur Hostinger, cloner et build :**

```bash
cd ~/domains/dashboard.vokalbox.fr
git clone https://github.com/votre-compte/vokalboxdashboard.git
cd vokalboxdashboard
npm install
npm run build
cp -r dist/* ../public_html/
```

---

## 📱 Fonctionnalités

### 🔐 Authentification

- Connexion avec email/mot de passe
- Session persistante avec JWT
- Déconnexion sécurisée
- Token auto-refresh

### 📊 Tableau de bord

- Vue d'ensemble des statistiques du jour
- CA aujourd'hui, cette semaine, ce mois
- Nombre de commandes
- Panier moyen
- Commandes en attente (temps réel)
- Graphique de progression vers l'objectif
- Liste des dernières commandes

### 📦 Gestion des commandes

- Liste en temps réel (refresh 10s)
- Filtres par statut (Nouvelle, En préparation, Prête)
- Recherche par nom, téléphone ou numéro
- Changement de statut en 1 clic
- Détail complet de chaque commande
- Modal avec tous les détails
- Notifications toast

**Statuts disponibles :**
- 🔴 Nouvelle → En préparation
- 🟠 En préparation → Prête
- 🟢 Prête → Récupérée
- ❌ Annulée

### 🍕 Gestion du menu

- Affichage par catégories
- Toggle disponibilité (disponible/indisponible)
- Gestion des promotions (activer/désactiver)
- Prix barrés pour les promos
- Badge visuel pour les plats en promo
- Modification des plats

### 📈 Statistiques

- **Évolution du CA** : Graphique 30 derniers jours
- **Top 10 des plats** : Plats les plus vendus
- **Heures de pointe** : Graphique par heure
- **Résumé mensuel** : CA et nombre de commandes

### ⚙️ Paramètres

- Modifier les informations du restaurant
- Nom, téléphone, adresse
- Horaires d'ouverture
- Informations d'abonnement

---

## 🎨 Interface

### Design

- **Moderne et épuré**
- **Responsive** : Tablette, Desktop, Mobile
- **Dark mode ready** (à activer)
- **Animations fluides**
- **Loading states**
- **Toast notifications**

### Couleurs

- Primary : Bleu (#0ea5e9)
- Success : Vert (#22c55e)
- Warning : Orange (#f59e0b)
- Danger : Rouge (#ef4444)

### Navigation

- **Sidebar** : Navigation principale (desktop)
- **Bottom bar** : Navigation (mobile)
- **Header** : Notifications et profil

---

## 🔒 Sécurité

- ✅ Routes protégées (authentification requise)
- ✅ Token JWT stocké en localStorage
- ✅ Auto-déconnexion si token expiré
- ✅ HTTPS obligatoire en production
- ✅ Validation des données avant envoi

---

## 📊 Performance

- ✅ React Query pour le cache intelligent
- ✅ Lazy loading des images
- ✅ Code splitting automatique (Vite)
- ✅ Compression gzip
- ✅ Cache des assets statiques

---

## 🧪 Tests

### Test de connexion

```
Email: test@vokalbox.fr
Mot de passe: Test123!
```

### Test des fonctionnalités

1. **Dashboard** : Vérifier l'affichage des stats
2. **Commandes** : Créer une commande via l'API, vérifier l'affichage
3. **Menu** : Toggle disponibilité, activer une promo
4. **Stats** : Vérifier les graphiques
5. **Settings** : Modifier les infos

---

## 🆘 Dépannage

### L'application ne démarre pas

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules
npm install
```

### Erreur de connexion à l'API

Vérifier que :
- L'API est bien démarrée
- L'URL dans `.env` est correcte
- CORS est activé sur l'API

### Build échoue

```bash
# Vérifier la version de Node
node --version  # Doit être >= 16

# Nettoyer et rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 📂 Structure du projet

```
vokalboxdashboard/
├── public/                # Fichiers statiques
├── src/
│   ├── api/
│   │   └── client.js     # Client Axios + fonctions API
│   ├── components/
│   │   └── layout/
│   │       └── DashboardLayout.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── CommandesPage.jsx
│   │   ├── MenuPage.jsx
│   │   ├── StatsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── store/
│   │   └── useAuthStore.js
│   ├── App.jsx           # Router et routes
│   ├── main.jsx          # Entry point
│   └── index.css         # Styles globaux
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 🔄 Workflow de développement

**1. Créer une nouvelle feature :**

```bash
git checkout -b feature/nouvelle-fonctionnalite
```

**2. Développer et tester :**

```bash
npm run dev
```

**3. Commit et push :**

```bash
git add .
git commit -m "feat: ajout nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

**4. Merge et déployer :**

```bash
git checkout main
git merge feature/nouvelle-fonctionnalite
npm run build
# Déployer sur Hostinger
```

---

## 📞 Support

**Développé par** : E Formateck  
**Contact** : Jack  
**Email** : contact@eformatech.fr

---

## 📄 Licence

Propriétaire - E Formateck © 2024

---

## 🎯 Prochaines améliorations

- [ ] Notifications push en temps réel (WebSocket)
- [ ] Mode sombre
- [ ] Export Excel des commandes
- [ ] Impression des tickets
- [ ] App mobile (React Native)
- [ ] Multi-utilisateurs (serveur, cuisinier, gérant)
- [ ] Statistiques avancées (comparaison périodes)
- [ ] Gestion des stocks
