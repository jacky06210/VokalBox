# Programme VokalBoxMaître

## Fichiers dans ce dossier

- **index.html** - Fichier principal de l'interface VokalBoxMaître (VERSION CORRIGÉE)

## Modification importante

### Ligne 953 (fonction verifyAndLogin)

**❌ AVANT (bug) :**
```javascript
if (data.success && !data.isAdmin) {
```

**✅ APRÈS (corrigé) :**
```javascript
if (data.success) {
```

Cette modification permet à TOUS les utilisateurs authentifiés de se connecter, pas seulement les non-admins.

## Comment utiliser

### Option 1: Tester localement (ne fonctionnera PAS complètement)
1. Ouvrir `index.html` dans votre navigateur
2. Vous verrez l'interface MAIS elle ne pourra pas se connecter à l'API (besoin du serveur)

### Option 2: Uploader sur le serveur
1. Utiliser FileZilla avec ces paramètres:
   - Hôte: 31.97.53.227
   - Port: 65002
   - Protocole: SFTP
   - User: root
2. Aller dans: `home/vocalbox/api/public/maitre/`
3. Remplacer `index.html` par ce fichier

### Option 3: Via SSH (pour développeurs)
```bash
ssh -p 65002 root@31.97.53.227
nano /home/vocalbox/api/public/maitre/index.html
# Copier-coller le contenu
# Ctrl+X, Y, Enter pour sauvegarder
pm2 restart vocalbox-api
```

## Identifiants de test

**Login:** jack06210
**Password:** bouriquetJ,;321

## URL de production

https://app.vokalbox.fr/maitre/

## Support

Voir le fichier `DIAGNOSTIC-VOKALBOXMAITRE.md` dans le dossier parent pour le diagnostic complet.
