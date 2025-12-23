# 🚀 Accès Rapides VokalBox

## 📱 Interfaces Web

### VokalBoxMaître - Numérisation de Menus
**URL :** https://app.vokalbox.fr/maitre/
**Description :** Scanner de menus avec Claude Vision
**Login :** Code restaurant + mot de passe

### Interface Test - Workflow Complet
**URL :** https://app.vokalbox.fr/test-workflow.html
**Description :** Créer restaurant test + scanner menu en 1 fois
**Accès :** Direct (pas de login)

### Interface Inscription Restaurant
**URL :** https://app.vokalbox.fr/inscription/
**Description :** Inscription nouveaux clients avec paiement
**Accès :** Public

### Interface Admin
**URL :** https://app.vokalbox.fr/admin/
**Description :** Gestion de tous les restaurants
**Login :** Admin uniquement

### Interface Commandes (Tablette)
**URL :** https://commandes.vokalbox.fr
**Description :** Interface pour le restaurant (commandes en temps réel)
**Status :** ⚠️ À tester

---

## 🎙️ Portail Telnyx

### Dashboard Principal
**URL :** https://portal.telnyx.com/

### AI Assistants
**URL :** https://portal.telnyx.com/#/ai/assistants
**Assistant actif :** VokalBox-Pizza-Universal

### Numéros de Téléphone
**URL :** https://portal.telnyx.com/#/numbers/my-numbers
**Numéro principal :** +33 4 23 33 07 67

### Integration Secrets
**URL :** https://portal.telnyx.com/#/integration-secrets
**Secret OpenAI :** openai-key

---

## 🔧 API Endpoints

### Health Check
**URL :** https://api.vokalbox.fr/health
**Description :** Vérifier que l'API fonctionne

### Dynamic Variables (Webhook Telnyx)
**URL :** https://api.vokalbox.fr/api/v1/voice/dynamic-vars
**Description :** Retourne les infos restaurant + menu

### Menu Pizzas
**URL :** https://api.vokalbox.fr/api/commandes/menu-pizzas?restaurant_id=8
**Description :** Récupère le menu du restaurant

### Créer Commande
**URL :** https://api.vokalbox.fr/api/commandes/create
**Method :** POST
**Description :** Créer une nouvelle commande

### VokalBoxMaître - Scanner Menu
**URL :** https://app.vokalbox.fr/api/menu-scan/analyze
**Method :** POST
**Description :** Numériser photos de menu avec Claude

---

## 🗄️ Serveur VPS

### Connexion SSH
```bash
ssh -p 65002 root@31.97.53.227
```

**IP :** 31.97.53.227
**Port SSH :** 65002
**User :** root
**OS :** Ubuntu 22.04

### Chemins importants
- API : `/home/vocalbox/api/`
- Logs PM2 : `pm2 logs vocalbox-api`
- Nginx config : `/etc/nginx/sites-enabled/api.vokalbox.fr`
- Fichiers publics : `/home/vocalbox/api/public/`

### Commandes utiles
```bash
# Redémarrer l'API
pm2 restart vocalbox-api

# Voir les logs
pm2 logs vocalbox-api --lines 50

# Voir les processus
pm2 list

# Tester Nginx
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## 🗃️ Base de Données

### Connexion MySQL
```bash
mysql -u vocalbox_user -p'VocalBox2024Secure' vocalbox
```

**Host :** localhost
**Port :** 3306
**Database :** vocalbox
**User :** vocalbox_user
**Password :** VocalBox2024Secure

### Tables principales
- `restaurants` - Infos restaurants
- `menus` - Plats et prix
- `commandes` - Commandes clients
- `commande_items` - Détails des commandes
- `reservations` - Réservations de tables

### Requêtes utiles
```sql
-- Voir les restaurants test
SELECT id, nom_restaurant, code_restaurant, telnyx_phone_number
FROM restaurants
WHERE statut_abonnement = 'test';

-- Voir le menu d'un restaurant
SELECT categorie, nom_plat, prix
FROM menus
WHERE restaurant_id = 8
ORDER BY categorie, nom_plat;

-- Voir les commandes
SELECT * FROM commandes
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔑 Clés API

### Telnyx
```
[REDACTED_TELNYX_KEY]
```

### OpenAI (dans Telnyx Integration Secrets)
**Nom du secret :** openai-key
**Clé :** [REDACTED_OPENAI_KEY]

### Claude (Anthropic)
```
[REDACTED_ANTHROPIC_KEY]
```
**Localisation :** `/home/vocalbox/api/.env` (CLAUDE_API_KEY)

---

## 📞 Numéro de Test

**Numéro Telnyx :** +33 4 23 33 07 67
**Restaurant actuel :** Cap Pizza (ID: 8)
**Assistant IA :** VokalBox-Pizza-Universal

**Pour tester :**
1. Appeler le +33 4 23 33 07 67
2. L'assistant répond "Bonjour, Cap Pizza à l'appareil"
3. Commander une pizza
4. Donner nom, téléphone, mode de retrait

---

## 🎨 Codes Restaurants

### Restaurant Test Actuel
- **Nom :** Cap Pizza
- **ID :** 8
- **Code :** TEST-1765906285528
- **Numéro :** +33423330767

### Restaurant Démo (ancien)
- **Nom :** Chez Jack
- **ID :** 1
- **Code :** TEST-DEMO-2024
- **Numéro :** +33000000001 (désactivé)

---

## 📚 Documentation

### Claude.md - Instructions Projet
**Chemin local :** `C:\Users\Jack Belletrud\OneDrive\Bureau\Vente de sites internet_1\Agent ia\B vocalbox\Claude Vs code\CLAUDE.md`
**Chemin serveur :** Documentation complète du projet

### Résumés de Sessions
- **16 Décembre :** [RESUME-SESSION-16DEC.md](file:///C:/Users/Jack%20Belletrud/OneDrive/Bureau/Vente%20de%20sites%20internet_1/Agent%20ia/B%20vocalbox/Claude%20Vs%20code/RESUME-SESSION-16DEC.md)

### Instructions Assistant IA
- [INSTRUCTIONS-ASSISTANT-AMELIOREES.md](file:///C:/Users/Jack%20Belletrud/OneDrive/Bureau/Vente%20de%20sites%20internet_1/Agent%20ia/B%20vocalbox/Claude%20Vs%20code/INSTRUCTIONS-ASSISTANT-AMELIOREES.md)

---

## 🆘 Dépannage Rapide

### L'API ne répond pas
```bash
pm2 restart vocalbox-api
pm2 logs vocalbox-api --lines 30
```

### L'assistant parle anglais
→ Vérifier Transcription Model = `deepgram/nova-3` + Language = `French`

### Dynamic Variables ne marchent pas
```bash
# Tester le webhook
curl -X POST https://api.vokalbox.fr/api/v1/voice/dynamic-vars \
  -H "Content-Type: application/json" \
  -d '{"data":{"payload":{"telnyx_agent_target":"+33423330767"}}}'
```

### Le numéro ne décroche pas
→ Vérifier dans Telnyx que le numéro est bien assigné à l'assistant

### Nginx erreur 502
```bash
# Vérifier que l'API tourne
pm2 list

# Redémarrer
pm2 restart vocalbox-api

# Recharger Nginx
sudo systemctl reload nginx
```

---

**Dernière mise à jour :** 16 Décembre 2025
**Version :** 1.0
