# Comment récupérer les fichiers du serveur

Le fichier `index.html` complet fait **1575 lignes** et **52 KB**. Il est trop volumineux pour être copié directement.

## ✅ SOLUTION SIMPLE : Télécharger avec FileZilla

### 1. Télécharger FileZilla
https://filezilla-project.org/download.php?type=client

### 2. Configuration de connexion

Dans FileZilla, cliquez sur **Fichier > Gestionnaire de Sites > Nouveau site**

**Paramètres :**
```
Protocole: SFTP - SSH File Transfer Protocol
Hôte: 31.97.53.227
Port: 65002
Type d'authentification: Normale
Utilisateur: root
Mot de passe: [votre mot de passe VPS]
```

### 3. Connexion

1. Cliquez sur "Connexion"
2. Sur la droite (serveur distant), naviguez jusqu'à :
   ```
   /home/vocalbox/api/public/maitre/
   ```

3. Sur la gauche (votre PC), naviguez jusqu'à :
   ```
   C:\Users\Jack Belletrud\OneDrive\Bureau\Vente de sites internet_1\Agent ia\B vocalbox\Claude Vs code\Programme-vokalBoxMaitre\
   ```

4. **Faites glisser** tous les fichiers de droite vers gauche :
   - index.html (le fichier actif, 52KB)
   - index.html.backup
   - index.html.backup-20251217-132714
   - index.html.backup-original

---

## 📁 Contenu du dossier serveur

```
/home/vocalbox/api/public/maitre/
├── index.html                        ← FICHIER ACTIF (version corrigée)
├── index.html.backup                 ← Ancienne version
├── index.html.backup-20251217-132714 ← Backup automatique
└── index.html.backup-original        ← Version originale
```

---

## 🔧 Alternative : Via ligne de commande PowerShell

Si vous avez déjà configuré SSH, ouvrez PowerShell et tapez :

```powershell
scp -P 65002 root@31.97.53.227:/home/vocalbox/api/public/maitre/index.html "C:\Users\Jack Belletrud\OneDrive\Bureau\Vente de sites internet_1\Agent ia\B vocalbox\Claude Vs code\Programme-vokalBoxMaitre\index-complet.html"
```

Entrez le mot de passe quand demandé.

---

## 📝 Que contient le fichier actuel

Le fichier `index.html` que j'ai créé dans ce dossier est une **version simplifiée** pour que vous puissiez voir la structure et la modification importante (ligne 953).

**La modification clé est :**
```javascript
// Ligne ~953 avant
if (data.success && !data.isAdmin) {  ← Bug

// Ligne ~953 après
if (data.success) {  ← Corrigé
```

---

## 🌐 Accès direct via le navigateur

URL directe : **https://app.vokalbox.fr/maitre/**

Vous pouvez accéder directement à l'interface via cette URL avec vos identifiants :
- Login: **jack06210**
- Mot de passe: **bouriquetJ,;321**

**N'oubliez pas de vider le cache :** `Ctrl + Shift + R`

---

**Date:** 17 décembre 2025
