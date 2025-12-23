# 🍕 VOKALBOX - ARCHITECTURE COMPLÈTE SYSTÈME DE COMMANDES

## Vue d'ensemble

Système complet de commande de plats avec :
- ✅ Réservation de table (existant)
- ✅ Commande de plats (nouveau)
- ✅ Paiement en ligne (Stripe + PayPal)
- ✅ Livraison + Click & Collect
- ✅ Dashboard restaurateur temps réel
- ✅ Multi-utilisateurs avec permissions
- ✅ Notifications (SMS + sonore)

---

## 1. FLUX DE COMMANDE VOCALE

```
Client appelle → +33423330767
│
├─→ IA : "Réservation ou commande ?"
│
├─→ RÉSERVATION (flux existant)
│   └─→ verif_event → add_event → Confirmation
│
└─→ COMMANDE (nouveau flux)
    │
    ├─1. Choix mode retrait
    │   ├─→ Livraison (adresse + zone + frais)
    │   └─→ Click & Collect (heure retrait)
    │
    ├─2. Liste des plats disponibles
    │   └─→ Lecture du menu depuis BDD (categories → plats → prix)
    │
    ├─3. Prise de commande
    │   ├─→ "Que souhaitez-vous ?"
    │   ├─→ Détection plat + quantité
    │   ├─→ Ajout au panier (webhook: add_to_cart)
    │   ├─→ Calcul total (webhook: calculate_total)
    │   └─→ "Autre chose ?"
    │
    ├─4. Récapitulatif
    │   ├─→ Liste des plats + quantités
    │   ├─→ Total TTC (plats + frais livraison)
    │   └─→ Confirmation client
    │
    ├─5. Informations client
    │   ├─→ Nom
    │   ├─→ Téléphone
    │   ├─→ Email (optionnel)
    │   └─→ Adresse si livraison
    │
    ├─6. Paiement
    │   ├─→ "Payer maintenant ou à la livraison ?"
    │   ├─→ Si maintenant :
    │   │   ├─→ "Stripe ou PayPal ?"
    │   │   ├─→ Génération lien paiement (webhook: create_payment_link)
    │   │   └─→ Envoi SMS avec lien
    │   └─→ Si à la livraison :
    │       └─→ "Espèces ou carte ?"
    │
    └─7. Confirmation
        ├─→ Enregistrement commande (webhook: create_order)
        ├─→ SMS confirmation
        ├─→ Notification restaurant (sonore + SMS)
        └─→ "Votre commande sera prête à [heure]"
```

---

## 2. STRUCTURE BASE DE DONNÉES

### Tables existantes (modifiées)
- `commandes` - Commandes complètes (33 colonnes !)
- `commande_items` - Détail des plats par commande
- `categories` - Catégories de plats
- `plats` - Plats du menu
- `prix` - Prix avec promos
- `utilisateurs_restaurant` - Utilisateurs avec rôles

### Nouvelles tables
- `zones_livraison` - Zones et frais par restaurant
- `comptes_paiement` - Comptes Stripe/PayPal par restaurant
- `notifications_config` - Configuration notifications par restaurant
- `permissions` - Permissions système
- `roles` - Rôles utilisateurs
- `role_permissions` - Association rôles ↔ permissions

### Vues SQL
- `v_commandes_details` - Vue complète des commandes
- `v_stats_ca_restaurants` - Statistiques CA par jour/restaurant

---

## 3. APPLICATION WEB RESTAURATEUR

### A. Architecture technique
- **Frontend** : Vanilla HTML/CSS/JS (pas de framework)
- **Backend** : Node.js Express (API REST)
- **Hébergement** : VPS Hostinger (même serveur)
- **URL** : https://dashboard.vokalbox.fr (à créer)

### B. Pages de l'application

#### 1. Page de connexion
```
/login
- Email + mot de passe
- Récupération mot de passe
- Redirection vers dashboard
```

#### 2. Dashboard principal
```
/dashboard
┌─────────────────────────────────────────────┐
│  CA Aujourd'hui: 245,50€ | Semaine: 1.234€  │
│  Mois: 4.567€                                │
├─────────────────────────────────────────────┤
│                                              │
│  COMMANDES EN COURS (temps réel)            │
│                                              │
│  [ROUGE]    20h15 | Client X | 23,50€       │
│             Pizza Margherita x2              │
│             [Accepter] [Refuser]             │
│                                              │
│  [ORANGE]   20h05 | Client Y | 45,00€       │
│             En préparation...                │
│             [Marquer prête]                  │
│                                              │
│  [VERT]     19h50 | Client Z | 12,50€       │
│             Prête pour retrait               │
│             [Marquer livrée]                 │
│                                              │
├─────────────────────────────────────────────┤
│  HISTORIQUE COMMANDES                       │
│  [Filtre: Aujourd'hui ▼] [Statut: Tous ▼]  │
│                                              │
│  18h30 | Client A | 34,50€ | Livrée ✓      │
│  17h45 | Client B | 28,00€ | Annulée ✗     │
│                                              │
└─────────────────────────────────────────────┘
```

#### 3. Gestion du menu
```
/menu
- Liste des catégories
- Ajout/modification/suppression plats
- Gestion des prix (normal + promo)
- Upload photos (futur)
- Activer/désactiver plats
```

#### 4. Paramètres
```
/settings
- Zones de livraison (zones + frais)
- Horaires d'ouverture
- Comptes paiement (Stripe/PayPal)
- Notifications (SMS/Email/Son)
- Gestion utilisateurs (multi-comptes)
```

---

## 4. WEBHOOKS API

### Nouveaux endpoints à créer

#### A. Commandes

**POST /api/voice/list_menu**
```json
Request:
{
  "restaurant_id": "1",
  "categorie": "Pizzas" // optionnel
}

Response:
{
  "success": true,
  "categories": [
    {
      "nom": "Pizzas",
      "plats": [
        {
          "id": 1,
          "nom": "Margherita",
          "description": "Tomate, mozzarella, basilic",
          "prix": "12.00",
          "prix_original": "15.00", // si promo
          "promo": 20 // % si promo
        }
      ]
    }
  ]
}
```

**POST /api/voice/add_to_cart**
```json
Request:
{
  "session_id": "call_12345", // ID unique de l'appel
  "restaurant_id": "1",
  "plat_id": 1,
  "quantite": 2,
  "notes": "Sans oignons" // optionnel
}

Response:
{
  "success": true,
  "panier": {
    "items": [
      {
        "plat": "Pizza Margherita",
        "quantite": 2,
        "prix_unitaire": "12.00",
        "sous_total": "24.00"
      }
    ],
    "total": "24.00"
  }
}
```

**POST /api/voice/calculate_total**
```json
Request:
{
  "session_id": "call_12345",
  "restaurant_id": "1",
  "mode_retrait": "livraison",
  "code_postal": "06400" // si livraison
}

Response:
{
  "success": true,
  "total_plats": "24.00",
  "frais_livraison": "3.50",
  "commission": "1.20", // si client paie commission
  "total_ttc": "28.70",
  "zone_livraison": "Centre-ville",
  "delai_estime": "45 min"
}
```

**POST /api/voice/create_payment_link**
```json
Request:
{
  "session_id": "call_12345",
  "restaurant_id": "1",
  "montant": "28.70",
  "mode_paiement": "stripe", // ou "paypal"
  "telephone_client": "0612345678"
}

Response:
{
  "success": true,
  "payment_url": "https://checkout.stripe.com/pay/cs_test_...",
  "sms_envoye": true,
  "expiration": "2025-12-04T21:00:00Z" // 30 min
}
```

**POST /api/voice/create_order**
```json
Request:
{
  "session_id": "call_12345",
  "restaurant_id": "1",
  "nom_client": "Jean Dupont",
  "telephone_client": "0612345678",
  "email_client": "jean@example.com",
  "mode_retrait": "livraison",
  "adresse_livraison": "15 rue Victor Hugo",
  "code_postal": "06400",
  "ville": "Cannes",
  "heure_retrait_souhaitee": "20h30",
  "mode_paiement": "stripe",
  "statut_paiement": "paye", // ou "en_attente"
  "commentaire_client": "Sonner à l'interphone"
}

Response:
{
  "success": true,
  "commande_id": 123,
  "numero_commande": "CMD-20251204-001",
  "heure_preparation_estimee": "20h15",
  "message": "Votre commande sera prête à 20h15"
}
```

#### B. Dashboard restaurateur

**GET /api/dashboard/stats/:restaurant_id**
```json
Response:
{
  "ca_jour": "245.50",
  "ca_semaine": "1234.00",
  "ca_mois": "4567.00",
  "nb_commandes_jour": 12,
  "nb_commandes_en_cours": 3
}
```

**GET /api/dashboard/commandes/:restaurant_id?statut=nouvelle**
```json
Response:
{
  "commandes": [
    {
      "id": 123,
      "numero": "CMD-20251204-001",
      "nom_client": "Jean Dupont",
      "telephone": "0612345678",
      "heure_commande": "20:15:30",
      "mode_retrait": "livraison",
      "adresse": "15 rue Victor Hugo, 06400 Cannes",
      "statut": "nouvelle",
      "statut_paiement": "paye",
      "montant_ttc": "28.70",
      "items": [
        {
          "plat": "Pizza Margherita",
          "quantite": 2,
          "prix_unitaire": "12.00"
        }
      ]
    }
  ]
}
```

**PUT /api/dashboard/commandes/:id/statut**
```json
Request:
{
  "statut": "en_preparation" // ou "prete", "livree", etc.
}

Response:
{
  "success": true,
  "message": "Statut mis à jour",
  "notification_envoyee": true // Si SMS envoyé au client
}
```

---

## 5. INTÉGRATION PAIEMENT

### A. Stripe

**Configuration par restaurant** :
- Compte Stripe Connect
- API keys stockées dans `comptes_paiement`
- Webhooks Stripe → /api/webhooks/stripe
- Gestion des paiements réussis/échoués

**Flux** :
1. Création session Stripe Checkout
2. Envoi URL par SMS au client
3. Client paie sur Stripe
4. Webhook Stripe → Mise à jour `statut_paiement = 'paye'`
5. Notification restaurant

### B. PayPal

**Configuration par restaurant** :
- PayPal Business Account
- Client ID + Secret stockés dans `comptes_paiement`
- Webhooks PayPal → /api/webhooks/paypal

**Flux similaire à Stripe**

---

## 6. SYSTÈME DE NOTIFICATIONS

### A. SMS (via API Telnyx ou Twilio)

**Événements déclencheurs** :
- Nouvelle commande → SMS au restaurant
- Commande payée → SMS confirmation au client
- Commande prête → SMS au client

**Format SMS client** :
```
VokalBox - Chez Jack
Votre commande #CMD-001 est confirmée
2x Pizza Margherita
Total: 28,70€
Prête à: 20h15
Paiement: Carte ✓
```

### B. Notification sonore

**Dashboard restaurateur** :
- WebSocket en temps réel
- Son "ding dong" quand nouvelle commande
- Notification navigateur (permission requise)

### C. Email

**Optionnel** :
- Récapitulatif commande
- Rapport journalier CA

---

## 7. SÉCURITÉ

### A. Authentification
- JWT tokens pour l'API
- Sessions sécurisées (httpOnly cookies)
- Hachage bcrypt pour mots de passe

### B. Permissions
- Vérification rôle à chaque requête
- Gérant : tous les droits
- Cuisinier : voir + modifier commandes
- Serveur : voir commandes
- Livreur : voir commandes en livraison

### C. Paiements
- Jamais stocker numéros de carte
- Tout via Stripe/PayPal
- Webhooks signés (vérification signature)

---

## 8. PROCHAINES ÉTAPES (ORDRE)

1. ✅ Exécuter schema_commandes_complet.sql sur le VPS
2. Créer les webhooks API pour commandes
3. Créer l'application web dashboard restaurateur
4. Intégrer Stripe (mode test d'abord)
5. Intégrer PayPal (mode test)
6. Mettre à jour script Telnyx pour gérer commandes
7. Système de notifications (SMS + son)
8. Tests complets
9. Production !

---

## 9. URLS FINALES

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | https://dashboard.vokalbox.fr | Interface restaurateur |
| API | https://api.vokalbox.fr | API principale |
| Voice | https://voix.vokalbox.fr | Webhooks Telnyx |
| Paiements | https://pay.vokalbox.fr | Redirections Stripe/PayPal |

---

## 10. ESTIMATION DÉVELOPPEMENT

| Tâche | Temps | Priorité |
|-------|-------|----------|
| Schéma BDD | ✅ Fait | - |
| Webhooks commandes | 3-4h | HAUTE |
| Dashboard web | 6-8h | HAUTE |
| Intégration Stripe | 2-3h | HAUTE |
| Intégration PayPal | 2-3h | MOYENNE |
| Script Telnyx commandes | 2-3h | HAUTE |
| Notifications SMS | 1-2h | MOYENNE |
| Notifications son | 1h | BASSE |
| Tests | 2-3h | HAUTE |
| **TOTAL** | **20-28h** | - |

---

**Prêt à commencer le développement ?** 🚀
