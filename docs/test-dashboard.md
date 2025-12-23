# 🧪 GUIDE DE TEST - DASHBOARD VOCALBOX

## ✅ Checklist avant de commencer

- [ ] DNS configuré (A record: dashboard → 31.97.53.227)
- [ ] DNS propagé (test: `nslookup dashboard.vokalbox.fr`)
- [ ] Navigateur web ouvert

---

## 📍 Test 1 : Accès au dashboard

### Ouvrir le dashboard
👉 **https://dashboard.vokalbox.fr**

### Ce que tu devrais voir :

**En-tête** :
```
🎙️ VokalBox Dashboard
Restaurant: Chez Jack
```

**Statistiques (5 cartes)** :
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ CA Aujourd'hui  │  │ CA Semaine      │  │ CA Mois         │
│     21,50€      │  │     21,50€      │  │     21,50€      │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ Commandes Jour  │  │ En Cours        │
│        1        │  │        1        │
└─────────────────┘  └─────────────────┘
```

**Commande en cours** (fond orange 🟠) :
```
CMD-20251205-001                    08:44:30
👤 Test VokalBox | 📞 0612345678
[Payé ✓] [Livraison]

┌────────────────────────────────────┐
│ 2x Marguerita - 18.00€             │
└────────────────────────────────────┘

Total: 21,50€ (dont 3,50€ de livraison)

[Marquer prête]
```

✅ **Si tu vois tout ça → Test 1 réussi !**

---

## 🎨 Test 2 : Changement de statut

### Action : Cliquer sur [Marquer prête]

**Ce qui devrait se passer** :
1. La commande passe du fond orange 🟠 au fond vert 🟢
2. Le bouton change : [Marquer prête] → [Marquer livrée]
3. Les stats restent identiques (CA : 21,50€)

✅ **Si la couleur change et le bouton aussi → Test 2 réussi !**

---

## 🔄 Test 3 : Bouton refresh

### Action : Cliquer sur le bouton bleu 🔄 en bas à droite

**Ce qui devrait se passer** :
1. Le bouton tourne (animation)
2. Les données se rechargent
3. La commande reste verte (statut: prete)

✅ **Si l'animation joue et les données se rechargent → Test 3 réussi !**

---

## 🔍 Test 4 : Filtres

### Action : Changer le filtre de statut

1. Cliquer sur le menu déroulant "Tous les statuts"
2. Sélectionner "Prêtes"

**Ce qui devrait se passer** :
- La commande verte reste affichée
- Si tu sélectionnes "Nouvelles" → Aucune commande (car on l'a passée à "prête")

✅ **Si les filtres fonctionnent → Test 4 réussi !**

---

## 📱 Test 5 : Responsive (mobile)

### Action : Réduire la fenêtre du navigateur (ou ouvrir sur téléphone)

**Ce qui devrait se passer** :
- Les 5 cartes de stats s'empilent verticalement
- Les commandes restent lisibles
- Le bouton 🔄 reste visible en bas à droite

✅ **Si tout s'adapte bien → Test 5 réussi !**

---

## 🔗 Test 6 : API directement

### Tester les endpoints sans l'interface

```bash
# Test 1 : Stats
curl https://voix.vokalbox.fr/api/dashboard/stats/1

# Réponse attendue :
{
  "success": true,
  "ca_jour": "21.50",
  "ca_semaine": "21.50",
  "ca_mois": "21.50",
  "nb_commandes_jour": 1,
  "nb_commandes_en_cours": 1
}

# Test 2 : Liste commandes
curl https://voix.vokalbox.fr/api/dashboard/commandes/1?statut=tous

# Réponse attendue :
{
  "success": true,
  "commandes": [
    {
      "id": 1,
      "numero_commande": "CMD-20251205-001",
      "nom_client": "Test VokalBox",
      "montant_ttc": "21.50",
      "statut": "prete",
      ...
    }
  ]
}

# Test 3 : Changer statut vers "livree"
curl -X PUT https://voix.vokalbox.fr/api/dashboard/commandes/1/statut \
  -H "Content-Type: application/json" \
  -d '{"statut": "livree"}'

# Réponse attendue :
{
  "success": true,
  "message": "Statut mis à jour",
  "notification_envoyee": false
}
```

✅ **Si toutes les requêtes retournent success: true → Test 6 réussi !**

---

## 🎯 Test 7 : Scénario complet (nouvelle commande)

### Créer une nouvelle commande via API

```bash
# 1. Ajouter au panier
curl -X POST https://voix.vokalbox.fr/api/orders/add_to_cart \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_dashboard_001",
    "restaurant_id": "1",
    "plat_id": 2,
    "quantite": 1
  }'

# 2. Créer la commande
curl -X POST https://voix.vokalbox.fr/api/orders/create_order \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_dashboard_001",
    "restaurant_id": "1",
    "nom_client": "Jean Dupont",
    "telephone_client": "0698765432",
    "mode_retrait": "click_collect",
    "mode_paiement": "especes",
    "statut_paiement": "en_attente"
  }'
```

### Vérifier sur le dashboard

1. Rafraîchir le dashboard (🔄)
2. **Tu devrais voir 2 commandes maintenant** :
   - CMD-20251205-001 (verte ou livrée)
   - CMD-20251205-002 (rouge = nouvelle)

3. Les stats devraient afficher :
   - CA Jour : augmenté
   - Commandes Jour : 2
   - En Cours : 1 ou 2 selon les statuts

✅ **Si la nouvelle commande apparaît → Test 7 réussi !**

---

## 🐛 Dépannage

### Problème : Dashboard ne charge pas

**Vérifications** :
```bash
# 1. DNS propagé ?
nslookup dashboard.vokalbox.fr
# Doit retourner : 31.97.53.227

# 2. Nginx actif ?
ssh -p 65002 root@31.97.53.227 "systemctl status nginx"

# 3. Fichier dashboard existe ?
ssh -p 65002 root@31.97.53.227 "ls -la /var/www/vocalbox/dashboard/"
```

### Problème : "Chargement des commandes..." infini

**Cause probable** : API ne répond pas

**Solution** :
```bash
# Vérifier que vocalbox-voix tourne
ssh -p 65002 root@31.97.53.227 "pm2 status"

# Redémarrer si besoin
ssh -p 65002 root@31.97.53.227 "pm2 restart vocalbox-voix"

# Voir les logs
ssh -p 65002 root@31.97.53.227 "pm2 logs vocalbox-voix --lines 20"
```

### Problème : Stats affichent "0,00€"

**Cause** : Aucune commande dans la base pour aujourd'hui

**Solution** : Créer une commande test (voir Test 7)

### Problème : Erreur CORS dans la console

**Vérifier** :
```bash
ssh -p 65002 root@31.97.53.227 "grep CORS_ORIGINS /root/vocalbox-voix/.env"
```

**Doit contenir** :
```
CORS_ORIGINS=https://dashboard.vokalbox.fr,https://app.vokalbox.fr
```

---

## 📊 Résultats attendus

### Tous les tests réussis ✅

Le dashboard est **100% fonctionnel** et prêt pour la production !

**Prochaines étapes** :
1. Configurer l'authentification (login restaurateur)
2. Ajouter notifications sonores
3. Intégrer avec Telnyx pour les commandes vocales

### Certains tests échouent ❌

**Me fournir** :
1. Quel test a échoué ?
2. Message d'erreur exact
3. Console navigateur (F12 → Console)
4. Logs PM2 : `pm2 logs vocalbox-voix --lines 50`

---

## 📸 Captures d'écran

Pour validation complète, prendre 3 screenshots :

1. **Dashboard vue d'ensemble** (stats + commandes)
2. **Commande verte** (après clic "Marquer prête")
3. **Console navigateur** (F12) sans erreurs

---

## 🎉 Validation finale

Si tous les tests sont ✅, le dashboard est **prêt pour l'utilisation réelle** !

Tu peux maintenant :
- Le partager avec tes restaurateurs
- L'utiliser pour gérer les commandes en direct
- Passer à l'étape suivante (Stripe, Telnyx, notifications...)
