# Récap Session - 3 décembre 2025

## Ce qui a été fait aujourd'hui

### 1. Installation Claude Code for VS Code ✅
- Extension installée depuis le marketplace VS Code (anthropic.claude-code v2.0.56)
- Connexion via "Claude.ai Subscription" (même abonnement que claude.ai)
- Dossier de travail ouvert : `Claude Vs code`

### 2. Fichiers créés et ajoutés au dossier

| Fichier | Contenu |
|---------|---------|
| **CLAUDE.md** | Mémoire projet VokalBox complète (serveur, accès, config Telnyx) |
| **TELNYX_DOCUMENTATION.md** | Documentation complète Telnyx AI Assistants (500+ lignes) |

### 3. Documentation Telnyx analysée
- Document source : "Absolument tout sur Telnyx.docx" (20 000+ lignes)
- Extrait et converti en markdown structuré
- Informations clés pour VokalBox extraites

---

## Problème Telnyx identifié et solution

### Problème
L'AI Assistant Telnyx parle **anglais** au lieu de **français**.

### Solution trouvée
Dans l'onglet **Voice** de l'AI Assistant :
1. **Transcription model** → `openai/whisper-large-v3-turbo` (OBLIGATOIRE pour le français !)
2. **Voice provider** → AWS Polly (Lea/Celine) ou Azure ou Telnyx

---

## Explications données à Jack

### VS Code vs Claude Code
- **VS Code** = L'éditeur de code (la voiture)
- **Claude Code** = L'extension IA (le GPS dans la voiture)

### Fichiers .md (Markdown)
- Format texte simple pour documents formatés
- Claude Code lit automatiquement les fichiers .md
- CLAUDE.md = mémoire du projet, lu à chaque session

### Système de mémoire Claude Code
- Pas de mémoire automatique entre sessions
- Solution : fichier CLAUDE.md avec infos importantes
- Les fichiers .docx sont difficiles à lire → convertir en .md

### Dossiers et projets
- Un dossier = un projet
- VS Code ouvre le dossier directement (pas de copie)
- Modifications PC ↔ VS Code synchronisées automatiquement

### Coût
- Claude Code utilise le même abonnement que claude.ai
- Pas de coût supplémentaire
- Limite de messages partagée entre les deux

---

## État actuel projet VokalBox

### ✅ Fonctionnel
- VocalBoxMaître (scan menus Claude Vision)
- API principale sur VPS Hostinger
- SSL sur tous les domaines
- Pare-feu configuré

### ⚠️ À faire
- Configurer AI Assistant Telnyx en français (solution documentée)
- Assigner numéro +33 4 23 33 07 67 à l'assistant
- Implémenter vocalbox-voix avec webhooks
- Tester interface tablette commandes

---

## Infos importantes VokalBox

### Accès VPS
```
IP : 31.97.53.227
SSH : ssh -p 65002 root@31.97.53.227
```

### Numéro Telnyx
```
+33 4 23 33 07 67
```

### URLs
- https://api.vokalbox.fr/health ✅
- https://voix.vokalbox.fr/health ✅
- https://app.vokalbox.fr/maitre/ ✅

---

## Prochaines étapes suggérées

1. Aller sur https://portal.telnyx.com/#/ai/assistants
2. Configurer l'AI Assistant avec :
   - Transcription model = `openai/whisper-large-v3-turbo`
   - Voice provider avec voix française
   - Instructions et Greeting en français
3. Assigner le numéro +33 4 23 33 07 67
4. Tester avec un appel

---

*Récap créé le 3 décembre 2025 - Session Claude.ai avec Jack*
