# VokalBoxResto - Application d'Onboarding

Application web pour l'inscription et l'onboarding des restaurateurs au service VokalBox.

## 📋 Fonctionnalités

- ✅ Landing page commerciale attractive
- ✅ Formulaire multi-étapes (informations, photos, paiement)
- ✅ Upload de photos de menu (max 10)
- ✅ Intégration paiement Stripe
- ✅ Design moderne et responsive
- ✅ Validation des formulaires
- ✅ Page de confirmation

## 🚀 Installation

### 1. Upload sur Hostinger

```bash
# Via FTP ou File Manager Hostinger
# Uploader les 3 fichiers dans un dossier :
# /public_html/vokalbox/ ou /public_html/resto/

- index.html
- style.css
- script.js
```

### 2. Configuration Stripe

**Étape 1 : Obtenir les clés Stripe**

1. Créer un compte sur https://stripe.com
2. Aller dans **Developers → API keys**
3. Copier la **Publishable key** (commence par `pk_`)

**Étape 2 : Modifier script.js**

```javascript
// Ligne 2 de script.js
const STRIPE_PUBLIC_KEY = 'pk_live_VOTRE_VRAIE_CLE'; // Remplacer ici
```

**Mode Test vs Production**
- Test : `pk_test_...` (cartes de test)
- Production : `pk_live_...` (vrais paiements)

### 3. Configurer les endpoints API

**Dans script.js, remplacer les URLs :**

```javascript
// Ligne 180 - Création du Payment Intent
const response = await fetch('https://api.vokalbox.fr/api/create-payment-intent', {

// Ligne 232 - Upload des photos
const response = await fetch('https://api.vokalbox.fr/api/upload-menu-photos', {
```

Ces endpoints devront être créés dans **VokalBoxAPI** (composant 3).

## 📁 Structure des fichiers

```
vokalboxresto/
├── index.html      # Page principale (landing + formulaire)
├── style.css       # Styles CSS
├── script.js       # Logique JavaScript + Stripe
└── README.md       # Ce fichier
```

## 🎨 Personnalisation

### Modifier les couleurs

Dans `style.css`, modifier les variables CSS (lignes 8-17) :

```css
:root {
    --primary-color: #2563eb;    /* Bleu principal */
    --secondary-color: #10b981;  /* Vert secondaire */
    /* ... */
}
```

### Modifier le contenu

**Coordonnées de contact** (dans `index.html`) :
- Ligne 244 : Email de contact
- Ligne 245 : Téléphone

**Prix** :
- Ligne 93 : Prix affiché (49€)
- script.js ligne 292 : Montant en centimes (4900)

## 🔗 Endpoints API nécessaires

VokalBoxResto appelle 2 endpoints de **VokalBoxAPI** (à créer) :

### 1. POST `/api/create-payment-intent`

**Request :**
```json
{
  "restaurantName": "Restaurant La Bella",
  "address": "123 rue de la Paix",
  "zipCode": "06000",
  "city": "Nice",
  "phone": "0493123456",
  "email": "contact@labella.fr",
  "hours": "Lundi-Vendredi 11h-14h",
  "amount": 4900
}
```

**Response :**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "orderId": 123
}
```

### 2. POST `/api/upload-menu-photos`

**Request :** FormData avec :
- `orderId`: ID de la commande
- `photo_0`, `photo_1`, ... : Fichiers images

**Response :**
```json
{
  "success": true,
  "message": "Photos uploadées avec succès"
}
```

## 🧪 Tests

### Tester en local

1. Installer un serveur local (ex: `php -S localhost:8000`)
2. Ouvrir http://localhost:8000/index.html

### Cartes de test Stripe

En mode test, utiliser ces cartes :
- **Succès** : 4242 4242 4242 4242
- **Refusée** : 4000 0000 0000 0002
- **Authentification** : 4000 0027 6000 3184

Expiration : n'importe quelle date future  
CVC : n'importe quel 3 chiffres

## 📊 Workflow complet

```
1. Utilisateur remplit le formulaire (étape 1)
   ↓
2. Upload photos menu (étape 2)
   ↓
3. Paiement Stripe (étape 3)
   ↓
4. VokalBoxResto → VokalBoxAPI : create-payment-intent
   ↓
5. Stripe confirme le paiement
   ↓
6. VokalBoxResto → VokalBoxAPI : upload-menu-photos
   ↓
7. Affichage confirmation (étape 4)
   ↓
8. VokalBoxAPI → VokalBoxMaître : numérisation menu
   ↓
9. Email confirmation au restaurateur
```

## 🔒 Sécurité

- ✅ Stripe gère la sécurité des paiements (PCI-DSS)
- ✅ Pas de numéro de carte stocké côté VokalBox
- ✅ Validation côté client ET serveur (API)
- ⚠️ Ajouter HTTPS obligatoire en production

## 🐛 Debugging

**Erreurs courantes :**

1. **"Stripe is not defined"**
   - Vérifier que le script Stripe est chargé dans `index.html` ligne 8

2. **Erreur de paiement**
   - Vérifier la clé publique Stripe
   - Vérifier que l'API répond bien

3. **Photos ne s'uploadent pas**
   - Vérifier la limite de taille (10 MB)
   - Vérifier le format (images uniquement)

## 📞 Support

Pour toute question : contact@vokalbox.fr

## 📄 Licence

© 2025 VokalBox - E Formateck. Tous droits réservés.
