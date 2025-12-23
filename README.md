# 🎙️ VokalBox

**Solution SaaS de réponse vocale IA pour restaurants français**

VokalBox est un système complet de prise de commandes et de réservations téléphoniques automatisées pour les restaurants, utilisant l'intelligence artificielle vocale.

---

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Technologies](#technologies)
- [Installation](#installation)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Licence](#licence)

---

## 🎯 Vue d'ensemble

### Tarification
- **Prix** : 49€ HT/mois par restaurant
- **Marge cible** : 35-40€/client
- **Entreprise** : E Formateck (Cannes, France)

### Numéro Telnyx
- **+33 4 23 33 07 67** (numéro principal)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Restaurant)                      │
│                   Appel téléphonique                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    TELNYX AI ASSISTANT                       │
│  - TTS: MiniMax Speech 2.6 Turbo                            │
│  - STT: Whisper Large v3 Turbo / Deepgram Nova-2            │
│  - LLM: GPT-4.0 / GPT-5                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Webhook    │  │   Webhook    │  │   Webhook    │
│  Variables   │  │  get_menu    │  │  Réserv/Cmd  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               VPS HOSTINGER (Ubuntu 22.04)                   │
│             IP: 31.97.53.227 | Port SSH: 65002               │
│                                                               │
│  ┌────────────────┐          ┌────────────────┐             │
│  │ vocalbox-api   │          │ vocalbox-voix  │             │
│  │   (PM2:3000)   │          │   (PM2:3002)   │             │
│  │                │          │                │             │
│  │ - GET /menu    │          │ - POST /       │             │
│  │ - Scan Claude  │          │   variables    │             │
│  │   Vision       │          │ - POST /       │             │
│  │                │          │   verif_event  │             │
│  └────────┬───────┘          │ - POST /       │             │
│           │                  │   add_event    │             │
│           │                  └────────┬───────┘             │
│           └──────────────────┬────────┘                     │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │  MySQL Database   │                    │
│                    │    vocalbox       │                    │
│                    │                   │                    │
│                    │ - restaurants     │                    │
│                    │ - categories      │                    │
│                    │ - plats           │                    │
│                    │ - prix            │                    │
│                    │ - commandes       │                    │
│                    │ - reservations    │                    │
│                    └───────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACES WEB                            │
│                                                               │
│  - https://app.vokalbox.fr/maitre/  (VokalBoxMaître)        │
│  - https://client.vokalbox.fr        (Commandes clients)     │
│  - https://commandes.vokalbox.fr     (Tablette restaurant)   │
│  - https://dashboard.vokalbox.fr     (Dashboard gérant)      │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Fonctionnalités

### 🎙️ Assistant Vocal IA
- **Prise de commandes** : Pizzas, plats, boissons
- **Réservations de tables** : Vérification disponibilité en temps réel
- **Multi-restaurants** : Un seul système pour plusieurs établissements
- **Variables dynamiques** : Personnalisation par restaurant

### 📱 VokalBoxMaître
- **Numérisation de menus** via Claude Vision API
- Interface web de scan de documents
- Export automatique vers base de données
- Gestion des catégories et prix

### 🛒 Interface Client Web
- Commande en ligne
- Click & Collect / Livraison
- Panier dynamique
- Calcul automatique des frais

### 📊 Dashboard Restaurant
- Vue des commandes en temps réel
- Gestion des réservations
- Statistiques

---

## 🔧 Technologies

### Backend
- **Node.js** + Express
- **MySQL** (base de données)
- **PM2** (process manager)
- **Nginx** (reverse proxy + SSL)

### Frontend
- **HTML/CSS/JavaScript** (vanilla)
- **Tailwind CSS**
- **Responsive design**

### IA & APIs
- **Telnyx** (téléphonie IA)
  - MiniMax Speech 2.6 (TTS)
  - Whisper Large v3 Turbo (STT)
  - GPT-4.0 / GPT-5 (LLM)
- **Anthropic Claude** (Vision API pour scan menus)

### Infrastructure
- **VPS Hostinger** (Ubuntu 22.04)
- **Certbot** (SSL Let's Encrypt)
- **Git** (versioning)

---

## 🚀 Installation

### Prérequis
- Node.js v18+
- MySQL 8.0+
- PM2
- Nginx
- Compte Telnyx
- Compte Anthropic (Claude API)

### Installation Backend

```bash
# Cloner le repo
git clone https://github.com/votre-username/vokalbox.git
cd vokalbox

# Installer les dépendances API
cd backend/api
npm install

# Installer les dépendances Service Voix
cd ../voix
npm install

# Créer la base de données
mysql -u root -p < ../../docs/database-schema.sql

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
```

### Configuration Nginx

```bash
# Copier les configurations
sudo cp config/nginx/* /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.vokalbox.fr /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/client.vokalbox.fr /etc/nginx/sites-enabled/

# Tester et recharger
sudo nginx -t
sudo systemctl reload nginx

# Certificats SSL
sudo certbot --nginx -d api.vokalbox.fr -d client.vokalbox.fr
```

---

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vocalbox
DB_USER=vocalbox_user
DB_PASSWORD=votre_mot_de_passe

# APIs
CLAUDE_API_KEY=sk-ant-api03-...
TELNYX_API_KEY=KEY...

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

### Configuration Telnyx

1. **Créer un AI Assistant** sur https://portal.telnyx.com/#/ai/assistants
2. **Configurer** :
   - **Voice** : MiniMax Speech 2.6 Turbo
   - **Transcription** : Whisper Large v3 Turbo
   - **LLM** : GPT-4.0
3. **Webhooks** :
   - Dynamic Variables : `https://voix.vokalbox.fr/api/voice/variables`
   - get_menu : `https://voix.vokalbox.fr/api/voice/menu-vokalbox`
4. **Instructions** : Copier depuis `docs/SCRIPT_TELNYX_FINAL_HYBRIDE.md`

---

## 📚 Documentation

Toute la documentation est disponible dans le dossier [`docs/`](docs/) :

### Guides principaux
- [CLAUDE.md](docs/CLAUDE.md) - Vue d'ensemble du système
- [CONFIGURATION_FINALE_COMPLETE.md](docs/CONFIGURATION_FINALE_COMPLETE.md) - Guide de configuration
- [GUIDE_TELNYX_CONFIGURATION.md](docs/GUIDE_TELNYX_CONFIGURATION.md) - Configuration Telnyx détaillée

### Architecture
- [ARCHITECTURE_MULTI_RESTAURANTS.md](docs/ARCHITECTURE_MULTI_RESTAURANTS.md)
- [ARCHITECTURE_SYSTEME_COMMANDES.md](docs/ARCHITECTURE_SYSTEME_COMMANDES.md)

### Déploiement
- [GUIDE_DEPLOIEMENT_RAPIDE.md](docs/GUIDE_DEPLOIEMENT_RAPIDE.md)
- [SECURISATION_VPS_COMPLETE.md](docs/SECURISATION_VPS_COMPLETE.md)

---

## 🔐 Sécurité

### Bonnes pratiques
- ✅ Tous les secrets dans `.env` (jamais commités)
- ✅ SSL/TLS sur tous les domaines
- ✅ Pare-feu configuré (ports 80, 443, 65002)
- ✅ SSH sur port personnalisé (65002)
- ✅ Authentification MySQL sécurisée
- ✅ CORS configuré

### Secrets à NE JAMAIS commiter
- Clés API (Telnyx, Anthropic)
- Mots de passe base de données
- Certificats SSL privés
- Fichiers .env

---

## 🤝 Contribution

Ce projet est développé par **E Formateck** pour les restaurants français.

Pour toute question ou amélioration, contactez l'équipe technique.

---

## 📞 Support

- **Email** : support@vokalbox.fr
- **Documentation** : Voir dossier `docs/`
- **Issues** : Ouvrir une issue sur GitHub

---

## 📄 Licence

© 2025 E Formateck - Tous droits réservés

---

## 🎯 Roadmap

### ✅ Fait
- Prise de commandes vocale
- Réservations avec vérification disponibilité
- Scan de menus (Claude Vision)
- Multi-restaurants
- Interface client web

### 🚧 En cours
- Optimisation latence vocale
- Dashboard temps réel

### 📅 À venir
- Application mobile restaurant
- SMS de confirmation automatiques
- Rappels avant réservation (90min)
- Paiement en ligne (Stripe)
- Statistiques avancées

---

**Développé avec ❤️ pour les restaurants français** 🇫🇷
