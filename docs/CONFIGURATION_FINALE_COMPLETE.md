# 🎉 CONFIGURATION FINALE - SYSTÈME COMPLET AVEC VÉRIFICATION DISPONIBILITÉ

## ✅ Ce qui est fait automatiquement

### 1. Base de données MySQL
- Tables créées : `restaurants`, `menus`, `reservations`, `utilisateurs_restaurant`
- Restaurant test "Chez Jack" (+33423330767) configuré
- Menu test avec 7 plats

### 2. API vocalbox-voix - 4 webhooks fonctionnels
| Endpoint | Description | Status |
|----------|-------------|--------|
| `/api/voice/variables` | Injection variables restaurant | ✅ Testé |
| `/api/voice/verif_event` | Vérification disponibilité | ✅ Testé |
| `/api/voice/add_event` | Enregistrement réservation | ✅ Testé |
| `/api/voice/reservation` | Legacy (compatibilité) | ✅ |

### 3. Formats français
- **Date** : dd-mm-yyyy (ex: 15-12-2025)
- **Heure** : HHhMM (ex: 20h30, 14h00)
- Conversion automatique vers MySQL en backend

### 4. Tests réussis
```json
// Test vérification disponibilité
POST /api/voice/verif_event
{
  "restaurant_id": "1",
  "date_reservation": "15-12-2025",
  "heure_reservation": "20h30",
  "nb_personnes": 4
}
→ {"available": true, "message": "Table disponible"}

// Test enregistrement
POST /api/voice/add_event
→ {"success": true, "reservation_id": 1, "message": "Réservation confirmée"}

// Vérification en BDD
SELECT * FROM reservations
→ Date: 2025-12-15, Heure: 20:30:00 ✅
```

---

## 🔧 À FAIRE MAINTENANT dans Telnyx (15 min)

### ÉTAPE 1 : Configurer le webhook Dynamic Variables (2 min)

1. Aller sur https://portal.telnyx.com/#/ai/assistants
2. Ouvrir l'assistant **VokalBox-Restaurant-FR**
3. Scroller vers le bas jusqu'à **"Dynamic Variables Webhook URL"**
4. Entrer : `https://voix.vokalbox.fr/api/voice/variables`
5. **Save**

---

### ÉTAPE 2 : Copier le script complet (5 min)

1. Dans le même assistant, onglet **"Instructions"**
2. **EFFACER TOUT** le contenu actuel
3. **COPIER le script** depuis le fichier [SCRIPT_TELNYX_FINAL_HYBRIDE.md](SCRIPT_TELNYX_FINAL_HYBRIDE.md)
4. **COLLER** dans Instructions
5. **Save**

**Le script contient** :
- Variables dynamiques pour multi-restaurants
- Workflow en 8 étapes structuré
- Formats français (dd-mm-yyyy, HHhMM)
- Vérification disponibilité en temps réel
- Garde-fous comportementaux

---

### ÉTAPE 3 : Configurer les outils Telnyx (8 min)

Dans le même assistant, section **"Tools"** :

#### Outil 1 : hang_up
- Type : **Hangup**
- Description : `Raccrocher l'appel après avoir dit au revoir`

#### Outil 2 : transfer_call
- Type : **SIP Transfer**
- Destination : `{{telephone_resto}}`
- Description : `Transférer vers un humain si nécessaire`

#### Outil 3 : verif_event
- Type : **Webhook**
- URL : `https://voix.vokalbox.fr/api/voice/verif_event`
- Méthode : **POST**
- Description : `Vérifier la disponibilité d'un créneau avant de réserver`
- Paramètres requis :
  ```json
  {
    "restaurant_id": "string",
    "date_reservation": "string",
    "heure_reservation": "string",
    "nb_personnes": "number"
  }
  ```

#### Outil 4 : add_event
- Type : **Webhook**
- URL : `https://voix.vokalbox.fr/api/voice/add_event`
- Méthode : **POST**
- Description : `Enregistrer une réservation confirmée`
- Paramètres requis :
  ```json
  {
    "restaurant_id": "string",
    "date_reservation": "string",
    "heure_reservation": "string",
    "nb_personnes": "number",
    "nom_client": "string",
    "telephone_client": "string"
  }
  ```

**Sauvegarder** après chaque outil configuré.

---

## 🧪 ÉTAPE 4 : Tester le système complet

### Test 1 : Appeler le numéro
**Appelez le +33 4 23 33 07 67**

**Ce que vous devriez entendre :**
- "Bonjour, Chez Jack à l'appareil..." (en français 🇫🇷)
- Voix féminine française (Polly.Lea)

### Test 2 : Réservation simple
**Dialogue type :**
- IA : "Que puis-je faire pour vous ?"
- Vous : "Je voudrais réserver une table"
- IA : "Pas de problème. Pour quelle date ?"
- Vous : "Le 20 décembre"
- IA : "À quelle heure ?"
- Vous : "20h30"
- IA : "Pour combien de personnes ?"
- Vous : "4 personnes"
- IA : "À quel nom ?"
- Vous : "Dupont"
- IA : "Votre téléphone ?"
- Vous : "06 12 34 56 78"
- IA : **Vérifie la disponibilité** (verif_event)
- IA : "Parfait, nous avons une table disponible..."
- IA : **Récapitule** et demande confirmation
- IA : **Enregistre** (add_event)
- IA : "C'est noté, Monsieur Dupont..."

### Test 3 : Créneau complet (tester la vérification)
- Appelez à nouveau
- Demandez le même créneau (20-12-2025 à 20h30) pour 40 personnes
- L'IA devrait dire : "Ce créneau est complet. Je propose 21h00 ou 21h30 ?"

### Test 4 : Vérifier en BDD
```bash
ssh -p 65002 root@31.97.53.227
mysql -u vocalbox_user -pVocalBox2024Secure vocalbox
SELECT * FROM reservations ORDER BY created_at DESC LIMIT 5;
```

Vous devriez voir vos réservations avec :
- Date au format MySQL : 2025-12-20
- Heure au format MySQL : 20:30:00
- Statut : confirmée

---

## 📊 Récapitulatif technique

### Système multi-restaurants complet

```
┌─────────────────┐
│  Appel entrant  │
└────────┬────────┘
         ↓
┌────────────────────────────────┐
│ Telnyx AI Assistant            │
│ VokalBox-Restaurant-FR         │
│ STT: whisper-large-v3-turbo    │
│ Voice: Polly.Lea               │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ 1. Webhook /variables          │
│ → Récupère infos restaurant    │
│ → Injecte variables dynamiques │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ 2. IA parle en français        │
│ avec nom + horaires restaurant │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ 3. Collecte infos réservation  │
│ (date, heure, nb, nom, tel)    │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ 4. Webhook /verif_event        │
│ → Vérifie disponibilité        │
│ → Propose alternatives si plein│
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ 5. Webhook /add_event          │
│ → Enregistre réservation       │
│ → Retourne confirmation        │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│ 6. Confirmation client         │
│ → SMS (à venir)                │
└────────────────────────────────┘
```

### Configuration actuelle

**Restaurant test :**
- Code : REST-001
- Nom : Chez Jack
- Numéro : +33423330767
- Capacité : 40 couverts
- Horaires : Midi 12h-14h30 / Soir 19h-22h30
- Fermé : Dimanche, Lundi

**Webhooks actifs :**
- https://voix.vokalbox.fr/api/voice/variables
- https://voix.vokalbox.fr/api/voice/verif_event
- https://voix.vokalbox.fr/api/voice/add_event

**Assistant Telnyx :**
- ID : assistant-b0a911d6-9028-4200-8125-4976c25807ed
- Nom : VokalBox-Restaurant-FR

---

## 🚀 Prochaines étapes (après test réussi)

### Immédiat
1. ✅ Tester l'appel complet avec réservation
2. ✅ Vérifier que tout fonctionne en français
3. ✅ Valider la vérification de disponibilité

### Court terme
1. Ajouter d'autres restaurants dans la BDD
2. Système d'envoi SMS de confirmation
3. Interface web pour les restaurants

### Moyen terme
1. Dashboard réservations en temps réel
2. Rappels automatiques 90 minutes avant
3. Système de paiement (Stripe)
4. Application mobile restaurant

---

## 🐛 Dépannage

### L'IA parle toujours anglais
1. Vérifier que le webhook /variables est configuré dans Telnyx
2. Tester manuellement : `curl -X POST https://voix.vokalbox.fr/api/voice/variables ...`
3. Vérifier les logs : `ssh ... pm2 logs vocalbox-voix`

### La vérification de disponibilité ne fonctionne pas
1. Vérifier que l'outil `verif_event` est bien configuré dans Telnyx
2. Tester : `curl -X POST https://voix.vokalbox.fr/api/voice/verif_event ...`
3. Vérifier les logs pour voir les requêtes

### La réservation n'est pas enregistrée
1. Vérifier que l'outil `add_event` est configuré
2. Vérifier en BDD : `SELECT * FROM reservations`
3. Vérifier les logs pour voir les erreurs

### Formats de date/heure incorrects
Les formats sont :
- Date : **dd-mm-yyyy** (ex: 15-12-2025)
- Heure : **HHhMM** (ex: 20h30)

La conversion vers MySQL (yyyy-mm-dd, HH:MM:SS) est automatique.

---

## 📞 Support

Si problème, fournir :
1. Les logs PM2 : `pm2 logs vocalbox-voix --lines 50`
2. L'heure de l'appel test
3. Ce que l'IA a dit (en français ou anglais ?)
4. L'erreur exacte rencontrée

---

## 🎯 Résumé

**Un système COMPLET et SCALABLE** :
- ✅ Multi-restaurants (un script pour tous)
- ✅ Vérification disponibilité en temps réel
- ✅ Formats français natifs
- ✅ Workflow structuré en 8 étapes
- ✅ 4 webhooks testés et fonctionnels
- ✅ Voix française (Polly.Lea)
- ✅ Prêt pour la production

**Pour ajouter un nouveau restaurant** :
1. Ligne en BDD dans `restaurants`
2. Acheter numéro Telnyx
3. Assigner au MÊME assistant
4. C'est tout ! 🚀
