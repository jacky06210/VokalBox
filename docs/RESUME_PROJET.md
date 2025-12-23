# Résumé du Projet VokalBox - Interface Commandes

## Contexte
Application de commande pour tablettes dans les restaurants.
- **URL production :** https://commandes.vokalbox.fr
- **API :** https://api.vokalbox.fr/api/orders
- **VPS :** 31.97.53.227:65002 (Hostinger Ubuntu 22.04)

## Fichiers Principaux

### Frontend
- **Fichier :** `client-v2.html` (HTML + CSS + JavaScript vanilla)
- **Localisation VPS :** `/var/www/vocalbox/commandes/index.html`
- **Tech :** HTML5, CSS3, JavaScript pur (pas de framework)

### Backend
- **Fichier :** `orders.js` (Express.js router)
- **Localisation VPS :** `/home/vocalbox/api-v2/routes/orders.js`
- **Tech :** Node.js, Express, MySQL
- **PM2 service :** `vokalbox-api-v2` (port 3001)

## Problèmes Identifiés par l'Utilisateur

### 1. ❌ Bouton + dans le panier ne fonctionne pas
**Symptôme :** Quand on clique sur +, rien ne se passe
**Cause identifiée :** L'endpoint `/api/orders/update_quantity` manquait
**Correction faite :** Route ajoutée dans orders.js (lignes 121-160)
**Status :** ✅ Route créée, API testée et fonctionne

### 2. ❌ L'addition des plats ne fonctionne pas
**Symptôme :** Le total ne se met pas à jour
**Cause probable :** Lié au problème #1 (le + ne marchait pas)
**Status :** 🔍 À vérifier après correction du problème #1

### 3. ❌ Affichage des promos incomplet
**Attendu :** Badge "PROMO" rose + prix barré + pourcentage
**Actuel :** Prix barré + badge jaune avec %
**Références :** Voir screenshots 1.jpg, 2.jpg, 3.jpg
**Status :** ⏳ Pas encore implémenté

### 4. ❌ Pas de page d'accueil
**Attendu :** Page avec nom du restaurant + adresse
**Actuel :** Menu directement affiché
**Status :** ⏳ Pas encore implémenté

### 5. ❌ Pas d'authentification
**Attendu :** Code PIN (défaut: 0000) + système de mot de passe
**Actuel :** Accès direct
**Status :** ⏳ Pas encore implémenté

## Tests API Effectués

### ✅ Health Check
```bash
curl http://localhost:3001/health
# Résultat : {"success":true,"message":"VokalBoxAPI est en ligne"}
```

### ✅ List Menu
```bash
curl -X POST http://localhost:3001/api/orders/list_menu \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id":1}'
# Résultat : 51 plats chargés avec promos
```

### ✅ Add to Cart
```bash
curl -X POST http://localhost:3001/api/orders/add_to_cart \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test789","restaurant_id":1,"plat_id":1,"quantite":1}'
# Résultat : {"success":true,"panier":{"items":[...],"total":"6.30"}}
```

### ✅ Update Quantity
```bash
curl -X POST http://localhost:3001/api/orders/update_quantity \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test789","plat_id":1,"quantite":3}'
# Résultat : {"success":true,"panier":{"items":[...],"total":"18.90"}}
```

**Conclusion : L'API fonctionne parfaitement !**

## Problème Cache

### Actions réalisées :
1. ✅ Fichier client-v2.html uploadé (timestamp: 15:55 UTC)
2. ✅ Configuration nginx modifiée (headers no-cache ajoutés)
3. ✅ Nginx rechargé
4. ❌ **MAIS** : L'utilisateur ne voit toujours pas les changements

### Hypothèses :
- Cache navigateur très agressif ?
- Cloudflare ou CDN devant ?
- Autre proxy ?
- L'utilisateur n'a pas fait Ctrl+F5 en navigation privée ?

## Configuration Nginx

**Fichier :** `/etc/nginx/sites-available/commandes.vokalbox.fr`

Headers ajoutés :
```nginx
add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
add_header Pragma "no-cache";
add_header Expires "0";
```

## Base de Données

**Connexion MySQL :**
- Host: localhost
- Database: vocalbox
- User: vocalbox_user
- Password: VocalBox2024Secure

**Tables importantes :**
- `restaurants` - Infos des restos
- `categories` - Catégories de plats
- `plats` - Détails des plats
- `prix` - Prix et promos (colonnes: valeur, prix_original)
- `commandes` - Commandes créées
- `commande_items` - Détails des commandes

## Code JavaScript Important

### API_BASE (ligne 540)
```javascript
const API_BASE = 'https://api.vokalbox.fr/api/orders';
```

### Fonction updateQuantity (ligne 687)
```javascript
async function updateQuantity(index, change) {
    const item = cart[index];
    const newQuantite = item.quantite + change;

    const response = await fetch(`${API_BASE}/update_quantity`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            session_id: SESSION_ID,
            plat_id: item.plat_id,
            quantite: newQuantite
        })
    });
    // ... suite
}
```

### Affichage du menu (ligne 579)
```javascript
function displayMenu(categories) {
    // Affiche les catégories et plats
    // Gère l'affichage des promos (lignes 585-598)
    const hasPromo = plat.prix_original && parseFloat(plat.prix_original) > parseFloat(plat.prix);
    const promoPercent = hasPromo ? Math.round(...) : 0;
}
```

## Demandes Utilisateur (depuis appli commande.docx)

> "Quand je clique sur le + rien ne se passe alors qu'il devrait s'incrémenter à chaque fois"

> "Ne fonctionne pas l'ajout de plats avec l'addition des plats commandés"

> "On doit pouvoir modifier les tarifs en y mettant des promos"
> (voir screenshots pour le système de badge PROMO rose)

> "Il manque une page principale où l'on peut voir le nom du resto avec son adresse"

> "Un code secret pour pouvoir l'ouvrir. Pour démarrer on mettra 0000"

## Questions pour l'Autre IA

1. **Pourquoi les changements ne sont-ils pas visibles côté client malgré :**
   - Upload réussi (timestamp vérifié)
   - Cache nginx désactivé
   - Tests API réussis
   - Instructions Ctrl+F5 données

2. **Comment implémenter proprement :**
   - Page d'accueil avec nom resto + adresse
   - Système de code PIN (0000 par défaut)
   - Badges PROMO roses comme dans les screenshots

3. **Y a-t-il un problème dans le code JavaScript actuel ?**
   - La fonction updateQuantity semble correcte
   - L'API répond correctement
   - Mais l'utilisateur dit que rien ne change

## Fichiers à Vérifier

1. `client-v2.html` (local)
2. `index_from_vps.html` (téléchargé du VPS)
3. `orders.js` (backend)
4. `1.jpg`, `2.jpg`, `3.jpg` (références UI)
5. `appli commande.docx` (cahier des charges)

## Commandes Utiles

### Voir les logs PM2
```bash
ssh -p 65002 root@31.97.53.227
pm2 logs vokalbox-api-v2 --lines 50
```

### Vérifier le fichier sur le VPS
```bash
ls -lh /var/www/vocalbox/commandes/index.html
grep "const API_BASE" /var/www/vocalbox/commandes/index.html
```

### Redémarrer l'API
```bash
pm2 restart vokalbox-api-v2
```

---

**Dernière mise à jour :** 8 décembre 2025, 15:55 UTC
**Par :** Claude (Assistant IA)
**Pour :** Vérification par une autre IA
