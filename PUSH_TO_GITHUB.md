# 📤 Instructions pour pousser VokalBox sur GitHub

## ✅ Ce qui a été fait

- ✅ Structure du repo créée
- ✅ 71 fichiers copiés (backend, frontend, docs)
- ✅ `.gitignore` configuré (secrets exclus)
- ✅ README.md complet créé
- ✅ Git initialisé avec commit initial

---

## 🚀 Étapes pour pousser sur GitHub

### 1️⃣ Créer le repository sur GitHub

1. Allez sur https://github.com/new
2. **Repository name** : `vokalbox`
3. **Description** : `Solution SaaS de réponse vocale IA pour restaurants français`
4. **Visibilité** : ✅ Public
5. **NE PAS** initialiser avec README, .gitignore ou licence
6. Cliquez **Create repository**

---

### 2️⃣ Pousser le code

Ouvrez Git Bash dans le dossier `vokalbox-github` et exécutez :

```bash
# Se positionner dans le repo
cd ~/vokalbox-github

# Ajouter l'URL du repo GitHub (REMPLACER votre-username)
git remote add origin https://github.com/votre-username/vokalbox.git

# Vérifier l'URL
git remote -v

# Pousser sur GitHub
git push -u origin master
```

**⚠️ IMPORTANT** : Remplacez `votre-username` par votre nom d'utilisateur GitHub!

---

### 3️⃣ Authentification GitHub

Si GitHub demande l'authentification :

**Option A : Token d'accès personnel (recommandé)**
1. Allez sur https://github.com/settings/tokens
2. **Generate new token** (classic)
3. Cochez `repo` (accès complet aux repos)
4. **Generate token**
5. **Copiez le token** (vous ne le reverrez plus!)
6. Utilisez le token comme mot de passe lors du push

**Option B : SSH**
```bash
# Générer une clé SSH
ssh-keygen -t ed25519 -C "votre-email@example.com"

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub

# Copier la clé et l'ajouter sur GitHub
# https://github.com/settings/keys

# Changer l'URL remote en SSH
git remote set-url origin git@github.com:votre-username/vokalbox.git

# Pousser
git push -u origin master
```

---

### 4️⃣ Vérifier sur GitHub

Une fois poussé :
1. Allez sur `https://github.com/votre-username/vokalbox`
2. Vous devriez voir :
   - README.md affiché
   - 71 fichiers
   - Structure : backend/, frontend/, docs/, config/

---

## 📋 Contenu du repository

```
vokalbox/
├── README.md                 # Documentation principale
├── .gitignore                # Fichiers exclus
├── backend/
│   ├── api/                  # API Node.js
│   └── voix/                 # Service vocal (vide pour l'instant)
├── frontend/
│   ├── client/               # Interface client web
│   ├── maitre/               # VokalBoxMaître
│   └── commandes/            # Dashboard restaurant
├── docs/                     # 27 fichiers de documentation
├── scripts/                  # Scripts utiles (vide)
└── config/                   # Configurations (vide)
```

---

## 🔐 Sécurité - Fichiers exclus

Les fichiers suivants sont **automatiquement exclus** par `.gitignore` :

- ❌ `.env` (secrets, mots de passe)
- ❌ `node_modules/` (dépendances)
- ❌ Clés SSH, certificats privés
- ❌ Logs
- ❌ Fichiers temporaires

**Aucun secret n'est dans le repo!** ✅

---

## 📝 Prochaines étapes après le push

1. **Configurer les secrets GitHub** (si CI/CD) :
   - Settings → Secrets and variables → Actions
   - Ajouter `CLAUDE_API_KEY`, `TELNYX_API_KEY`, etc.

2. **Ajouter des collaborateurs** (si besoin) :
   - Settings → Collaborators

3. **Activer GitHub Pages** (optionnel) :
   - Settings → Pages
   - Source : Deploy from a branch → main → /docs

4. **Créer un .github/workflows/** pour CI/CD (optionnel)

---

## 🆘 Dépannage

### Erreur : "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/votre-username/vokalbox.git
```

### Erreur : "Authentication failed"
Utilisez un token d'accès personnel au lieu du mot de passe GitHub.

### Erreur : "Permission denied (publickey)"
Configurez SSH correctement ou utilisez HTTPS avec token.

---

## ✅ Vérification finale

Après le push, vérifiez que :
- [ ] Le README.md s'affiche correctement
- [ ] La structure de dossiers est visible
- [ ] Aucun fichier `.env` n'apparaît
- [ ] Les 27 fichiers de docs sont présents
- [ ] Le code backend et frontend sont complets

---

**Le repo est prêt pour Claude Opus 4.5!** 🎉

Une fois sur GitHub, vous pouvez partager l'URL avec Claude Opus pour qu'il analyse le projet complet.
