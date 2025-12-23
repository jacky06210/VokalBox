# Diagnostic VokalBoxMaître - Problème de connexion

## Résumé du problème
L'utilisateur ne peut pas se connecter à https://app.vokalbox.fr/maitre/ avec les identifiants admin.

## État actuel

### Base de données
```sql
✅ Utilisateur créé: jack06210 (ID: 1)
✅ Restaurant: Administration VokalBox (ID: 9)
✅ Mot de passe hashé: $2b$10$p/u.tY4oGwRvHEJ62UkwWOqZWDh/Cj0xgnOti1P4IPZfPRmEs7ugG
✅ Statut: actif = 1
```

### API Tests
```bash
# Test connexion API
curl -X POST https://app.vokalbox.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"jack06210","password":"bouriquetJ,;321"}'

Résultat: ✅ {"success":true,"user":{...}}
HTTP Code: 200
```

### Serveur
```
✅ vocalbox-api: online (PM2)
✅ Nginx: configuré sur port 3000
✅ SSL: actif
```

## Modification effectuée

### Fichier: /home/vocalbox/api/public/maitre/index.html
**Ligne ~953 (fonction verifyAndLogin)**

❌ **AVANT (bug):**
```javascript
if (data.success && !data.isAdmin) {
    // Ne laisse passer QUE les non-admins
}
```

✅ **APRÈS (corrigé):**
```javascript
if (data.success) {
    // Laisse passer tous les utilisateurs authentifiés
}
```

## Pourquoi ça ne fonctionne peut-être pas

### Hypothèse 1: Cache navigateur
Le fichier JavaScript est mis en cache par le navigateur. L'utilisateur voit l'ancienne version.

**Solution:**
- Vider le cache: Ctrl+Shift+R ou Ctrl+F5
- Navigation privée
- Vider localStorage: ouvrir Console (F12) et taper: `localStorage.clear()`

### Hypothèse 2: Mauvaise version du fichier
Le serveur sert peut-être une ancienne version.

**Vérification:**
```bash
curl -s https://app.vokalbox.fr/maitre/ | grep -A 3 "if (data.success"
```

Devrait montrer: `if (data.success) {` (sans `&& !data.isAdmin`)

### Hypothèse 3: Erreur JavaScript silencieuse
Il y a peut-être une erreur JavaScript qui empêche l'exécution.

**Vérification:**
- Ouvrir Console navigateur (F12)
- Regarder les erreurs en rouge
- Vérifier l'onglet Network pour voir si /api/auth/login est appelé

## Fichier complet

Le fichier complet est sur le serveur:
```
/home/vocalbox/api/public/maitre/index.html
```

Backup créé:
```
/home/vocalbox/api/public/maitre/index.html.backup-YYYYMMDD-HHMMSS
```

## Procédure de test complète

1. **Ouvrir navigation privée** (pour éviter le cache)
2. **Aller sur:** https://app.vokalbox.fr/maitre/
3. **Ouvrir la Console** (F12 > Console)
4. **Entrer les identifiants:**
   - Login: jack06210
   - Password: bouriquetJ,;321
5. **Cliquer sur "Accéder à mon espace"**
6. **Observer dans la Console:**
   - Est-ce qu'il y a des erreurs en rouge?
   - Est-ce que la requête `/api/auth/login` est envoyée? (onglet Network)
   - Quelle est la réponse de l'API?

## Si ça ne fonctionne toujours pas

Le problème peut être:
- La modification n'a pas été sauvegardée correctement
- Il y a un autre fichier index.html qui est servi
- Le serveur cache le fichier HTML
- Il manque quelque chose dans la logique JavaScript

## Commandes pour un autre développeur

```bash
# Se connecter au serveur
ssh -p 65002 root@31.97.53.227

# Voir le fichier actif
cat /home/vocalbox/api/public/maitre/index.html | grep -A 5 "async function verifyAndLogin"

# Vérifier que le serveur tourne
pm2 list

# Redémarrer l'API
pm2 restart vocalbox-api

# Tester l'API directement
curl -X POST https://app.vokalbox.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"jack06210","password":"bouriquetJ,;321"}'
```

## Identifiants de connexion

**Login:** jack06210
**Mot de passe:** bouriquetJ,;321
**Restaurant:** Administration VokalBox (ID: 9)

---

**Date du diagnostic:** 17 décembre 2025
