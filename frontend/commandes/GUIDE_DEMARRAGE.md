# 🚀 VOKALBOXDASHBOARD - GUIDE DE DÉMARRAGE RAPIDE

## ✅ CE QUI A ÉTÉ CRÉÉ

**Application React complète avec :**

✅ Interface moderne et responsive
✅ Authentification JWT
✅ Tableau de bord temps réel
✅ Gestion des commandes
✅ Gestion du menu et promotions
✅ Statistiques avec graphiques
✅ Paramètres restaurant
✅ Notifications toast
✅ Auto-refresh des données

---

## 📦 FICHIERS CRÉÉS

```
vokalboxdashboard/
├── src/
│   ├── api/
│   │   └── client.js               ✅ Client API + fonctions
│   ├── components/layout/
│   │   └── DashboardLayout.jsx     ✅ Layout avec sidebar
│   ├── pages/
│   │   ├── LoginPage.jsx           ✅ Page de connexion
│   │   ├── DashboardPage.jsx       ✅ Tableau de bord
│   │   ├── CommandesPage.jsx       ✅ Gestion commandes
│   │   ├── MenuPage.jsx            ✅ Gestion menu
│   │   ├── StatsPage.jsx           ✅ Statistiques
│   │   └── SettingsPage.jsx        ✅ Paramètres
│   ├── store/
│   │   └── useAuthStore.js         ✅ State management
│   ├── App.jsx                     ✅ Router
│   ├── main.jsx                    ✅ Entry point
│   └── index.css                   ✅ Styles Tailwind
├── index.html                      ✅ HTML principal
├── vite.config.js                  ✅ Config Vite
├── tailwind.config.js              ✅ Config Tailwind
├── postcss.config.js               ✅ Config PostCSS
├── package.json                    ✅ Dépendances
├── .env.example                    ✅ Config exemple
├── .gitignore                      ✅ Fichiers à ignorer
└── README.md                       ✅ Documentation

TOTAL : 20+ fichiers créés
```

---

## 🎯 PROCHAINES ÉTAPES (ORDRE)

### 1️⃣ INSTALLATION EN LOCAL (10 min)

```bash
# 1. Télécharger le dossier vokalboxdashboard
# 2. Ouvrir un terminal dans le dossier
cd vokalboxdashboard

# 3. Installer les dépendances
npm install

# 4. Créer le .env
cp .env.example .env
nano .env

# Contenu du .env :
VITE_API_URL=http://localhost:3000

# 5. Démarrer le serveur
npm run dev
```

**Test :** Ouvrir http://localhost:5174 dans le navigateur

---

### 2️⃣ TEST DE CONNEXION (5 min)

**a) S'assurer que VokalBoxAPI est démarrée :**

```bash
# Dans un autre terminal
cd vokalboxapi
npm run dev
```

**b) Se connecter au Dashboard :**

1. Aller sur http://localhost:5174
2. Utiliser les identifiants de test :
   - Email : `test@vokalbox.fr`
   - Mot de passe : `Test123!`

**OU créer un nouveau compte via l'API :**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "monresto@email.fr",
    "password": "MonMotDePasse123!",
    "nom_restaurant": "Mon Restaurant",
    "telephone": "0601020304",
    "adresse": "123 Rue Test",
    "code_postal": "06000",
    "ville": "Nice"
  }'
```

---

### 3️⃣ BUILD POUR LA PRODUCTION (5 min)

```bash
# Build l'application
npm run build

# Les fichiers sont dans le dossier dist/
```

---

### 4️⃣ DÉPLOIEMENT SUR HOSTINGER (30 min)

**a) Préparer le dépôt Git :**

```bash
cd vokalboxdashboard
git init
git add .
git commit -m "Initial VokalBoxDashboard"
# Créer un repo sur GitHub
git remote add origin https://github.com/votre-compte/vokalboxdashboard.git
git push -u origin main
```

**b) Connexion SSH Hostinger :**

```bash
ssh u123456789@31.97.53.227 -p 65002
```

**c) Cloner et builder :**

```bash
cd ~/domains/dashboard.vokalbox.fr
git clone https://github.com/votre-compte/vokalboxdashboard.git
cd vokalboxdashboard

# Installer les dépendances
npm install

# Créer le .env production
nano .env
# Contenu :
# VITE_API_URL=https://api.vokalbox.fr
# VITE_ENV=production

# Build
npm run build

# Copier dans public_html
cp -r dist/* ../public_html/
```

**d) Configurer Nginx :**

```bash
sudo nano /etc/nginx/sites-available/dashboard.vokalbox.fr
```

**Contenu :**

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

    # Route toutes les requêtes vers index.html (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache des assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Activer et recharger :**

```bash
sudo ln -s /etc/nginx/sites-available/dashboard.vokalbox.fr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📱 FONCTIONNALITÉS PRINCIPALES

### 🔐 Authentification
- ✅ Connexion avec email/mot de passe
- ✅ Session persistante (localStorage)
- ✅ Auto-déconnexion si token expiré
- ✅ Redirection automatique

### 📊 Tableau de bord
- ✅ CA du jour, semaine, mois
- ✅ Nombre de commandes
- ✅ Panier moyen
- ✅ Commandes en attente
- ✅ Graphique objectif mensuel
- ✅ Dernières commandes
- ✅ Auto-refresh (30s)

### 📦 Commandes
- ✅ Liste en temps réel (refresh 10s)
- ✅ Filtres par statut
- ✅ Recherche (nom, téléphone, numéro)
- ✅ Changement de statut en 1 clic
- ✅ Modal détail complet
- ✅ Notifications toast
- ✅ Badges colorés par statut

### 🍕 Menu
- ✅ Affichage par catégories
- ✅ Toggle disponibilité
- ✅ Activer/désactiver promotions
- ✅ Prix barrés pour promos
- ✅ Badges visuels

### 📈 Statistiques
- ✅ Graphique CA (30 jours)
- ✅ Top 10 plats
- ✅ Heures de pointe
- ✅ Graphiques interactifs (Recharts)

### ⚙️ Paramètres
- ✅ Modifier infos restaurant
- ✅ Horaires d'ouverture
- ✅ Infos abonnement

---

## 🎨 DESIGN

**Responsive :**
- 📱 Mobile (< 768px)
- 💻 Tablette (768px - 1024px)
- 🖥️ Desktop (> 1024px)

**Couleurs :**
- Primary : Bleu #0ea5e9
- Success : Vert #22c55e
- Warning : Orange #f59e0b
- Danger : Rouge #ef4444

**Navigation :**
- Sidebar (desktop)
- Burger menu (mobile)
- Bottom bar (mobile)

---

## 🔄 WORKFLOW

**Exemple d'utilisation restaurateur :**

```
08:00 → Restaurateur ouvre la tablette
08:01 → Se connecte au Dashboard
08:02 → Voit le tableau de bord (0 commandes)
12:15 → 🔔 Nouvelle commande apparaît !
12:16 → Clique sur "Commencer"
12:17 → Prépare la commande
12:30 → Clique sur "Marquer prête"
12:35 → Client récupère → "Récupérée"
14:00 → Consulte les stats du jour
14:05 → Active une promo sur un plat
```

---

## 📊 TECHNOLOGIES

**Frontend :**
- React 18
- Vite
- TailwindCSS
- React Router
- React Query
- Zustand
- Axios

**Graphiques :**
- Recharts

**Notifications :**
- React Hot Toast

**Icônes :**
- Lucide React

---

## 🔐 SÉCURITÉ

- ✅ Routes protégées
- ✅ Token JWT
- ✅ HTTPS obligatoire
- ✅ Validation des données
- ✅ Auto-logout si token expiré

---

## ⚡ PERFORMANCE

- ✅ React Query (cache intelligent)
- ✅ Code splitting (Vite)
- ✅ Lazy loading
- ✅ Compression gzip
- ✅ Cache assets

---

## 🧪 TESTS

**Test complet du workflow :**

1. **Login**
   - Ouvrir http://localhost:5174
   - Se connecter
   - Vérifier redirection vers dashboard

2. **Dashboard**
   - Vérifier affichage stats
   - Vérifier auto-refresh

3. **Créer une commande (via API)**

```bash
curl -X POST http://localhost:3000/api/commandes \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 1,
    "nom_client": "Jean Dupont",
    "telephone_client": "0612345678",
    "items": [
      {"plat_id": 1, "quantite": 2},
      {"plat_id": 3, "quantite": 1}
    ]
  }'
```

4. **Commandes**
   - Voir la commande apparaître
   - Changer le statut
   - Vérifier modal détail

5. **Menu**
   - Toggle disponibilité d'un plat
   - Activer une promo

6. **Stats**
   - Vérifier les graphiques
   - Vérifier les plats populaires

7. **Settings**
   - Modifier les infos
   - Sauvegarder

---

## 🆘 DÉPANNAGE

### Erreur "Cannot connect to API"
```bash
# Vérifier que l'API est démarrée
cd vokalboxapi
npm run dev

# Vérifier l'URL dans .env
cat .env
```

### Page blanche après le build
```bash
# Vérifier la console du navigateur
# Souvent un problème de chemin d'assets

# Solution : vérifier vite.config.js
base: '/'
```

### Token expiré en boucle
```bash
# Supprimer le localStorage
localStorage.clear()

# Se reconnecter
```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

- [ ] Installer en local
- [ ] Tester la connexion
- [ ] Tester toutes les pages
- [ ] Build pour la production
- [ ] Vérifier la taille du build
- [ ] Créer repo Git
- [ ] Push sur GitHub
- [ ] Cloner sur Hostinger
- [ ] Configurer .env production
- [ ] Build sur serveur
- [ ] Configurer Nginx
- [ ] Tester HTTPS
- [ ] Tests end-to-end
- [ ] Vérifier responsive (mobile, tablette)

---

## 🎯 APRÈS LE DÉPLOIEMENT

**Le restaurateur pourra :**

1. ✅ Se connecter à dashboard.vokalbox.fr
2. ✅ Voir ses commandes en temps réel
3. ✅ Gérer les statuts
4. ✅ Consulter ses stats
5. ✅ Gérer son menu
6. ✅ Activer des promos

**Prochaine étape :**
→ Intégrer **Telnyx** pour les appels vocaux

---

## 💡 AMÉLIORATIONS FUTURES

- [ ] Notifications push (WebSocket)
- [ ] Mode sombre
- [ ] Export Excel
- [ ] Impression tickets
- [ ] App mobile (React Native)
- [ ] Multi-utilisateurs
- [ ] Gestion stocks

---

## 📞 BESOIN D'AIDE ?

**Tu peux me rappeler pour :**
- Débugger un problème
- Ajouter une fonctionnalité
- Modifier le design
- Optimiser les performances

---

**Développé par E Formateck**
**Version 1.0.0**
**Janvier 2024**
