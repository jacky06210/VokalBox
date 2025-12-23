# 🛡️ SÉCURISATION COMPLÈTE VPS VOKALBOX

**Date** : 03/12/2025
**Serveur** : 31.97.53.227 (Hostinger Ubuntu 22.04)

---

## 📋 RÉSUMÉ EXÉCUTIF

Votre VPS VokalBox a été entièrement sécurisé. **Tous les services critiques sont maintenant protégés** et aucun port sensible n'est exposé publiquement.

### ✅ Résultat de l'audit

| Élément | État Avant | État Après | Status |
|---------|-----------|-----------|--------|
| Port 3000 (API) | 🔴 Public (0.0.0.0) | ✅ Localhost uniquement | **SÉCURISÉ** |
| Port 3002 (Voix) | 🔴 Public (0.0.0.0) | ✅ Localhost uniquement | **SÉCURISÉ** |
| Port 5678 (n8n) | 🔴 Public (0.0.0.0) | ✅ Localhost + BasicAuth | **SÉCURISÉ** |
| MySQL (3306) | ✅ Déjà localhost | ✅ Localhost uniquement | **SÉCURISÉ** |
| SSH (65002) | ⚠️ Mot de passe accepté | ✅ Clés SSH uniquement | **SÉCURISÉ** |
| Redis | ✅ Non installé | - | **N/A** |
| MongoDB | ✅ Non installé | - | **N/A** |

---

## 🔧 MODIFICATIONS EFFECTUÉES

### 1. Sécurisation des services Node.js

**Fichiers modifiés :**
- `/home/vocalbox/api/server.js` → Écoute sur `127.0.0.1:3000`
- `/root/vocalbox-voix/src/index.js` → Écoute sur `127.0.0.1:3002`
- `/etc/n8n/.env` → Ajout de `N8N_LISTEN_ADDRESS=127.0.0.1`

**Tous les services passent maintenant par nginx avec SSL/TLS.**

### 2. Durcissement SSH

**Fichier modifié :** `/etc/ssh/sshd_config`

**Nouvelles règles :**
```
PermitRootLogin prohibit-password    # Clés SSH uniquement
PasswordAuthentication no             # Pas de mot de passe
MaxAuthTries 3                        # 3 tentatives max
ClientAliveInterval 300               # Timeout 5 minutes
```

### 3. Protection fail2ban

**Fichier créé :** `/etc/fail2ban/jail.local`

**Jails actifs :**
- `sshd` : 3 échecs → ban 2h
- `nginx-http-auth` : 3 échecs → ban 1h
- `nginx-botsearch` : 2 échecs → ban 1h

---

## 🧪 TESTS DE VALIDATION

### URLs publiques (via nginx)
```
✅ https://app.vokalbox.fr/health    → HTTP 200
✅ https://voix.vokalbox.fr/health   → HTTP 200
✅ https://api.vokalbox.fr/health    → HTTP 200
✅ https://n8n.aviboxx.com           → HTTP 401 (Basic Auth)
```

### Ports localhost
```
✅ curl http://localhost:3000/health  → OK
✅ curl http://localhost:3002/health  → OK
✅ curl http://localhost:5678         → OK
```

### Scan de ports exposés
```
tcp  0.0.0.0:80      → nginx (HTTP → HTTPS redirect)
tcp  0.0.0.0:443     → nginx (HTTPS/SSL)
tcp  0.0.0.0:65002   → SSH (clés uniquement)
tcp  127.0.0.1:3000  → vocalbox-api (PROTÉGÉ)
tcp  127.0.0.1:3002  → vocalbox-voix (PROTÉGÉ)
tcp  127.0.0.1:3306  → MySQL (PROTÉGÉ)
tcp  127.0.0.1:5678  → n8n (PROTÉGÉ)
```

---

## 💾 BACKUPS DE SÉCURITÉ

Tous les backups sont dans `/root/backups/security-20251203/`

- `sshd_config.bak` → Config SSH originale
- `nginx-sites-available.bak/` → Configs nginx
- `server.js.bak.20251203` → API VokalBox
- `index.js.bak` → Service vocal
- `.env.bak.20251203` → Config n8n
- PM2 dump sauvegardé

**En cas de problème, vous pouvez restaurer avec :**
```bash
ssh -p 65002 root@31.97.53.227
cd /root/backups/security-20251203/
cp sshd_config.bak /etc/ssh/sshd_config
systemctl restart sshd
```

---

## 📊 ARCHITECTURE DE SÉCURITÉ

```
┌─────────────────────────────────────────────────────┐
│                   INTERNET                          │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  fail2ban (actif)  │
         │   Auto-ban IPs     │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────┐
         │  nginx (80/443)    │  ← SSL/TLS
         │   Reverse Proxy    │
         └────┬────┬────┬─────┘
              │    │    │
    ┌─────────┘    │    └──────────┐
    │              │               │
┌───▼────┐   ┌────▼─────┐   ┌─────▼────┐
│ API    │   │  Voix    │   │   n8n    │
│ :3000  │   │  :3002   │   │  :5678   │
│localhost   │localhost │   │localhost │
└────────┘   └──────────┘   └──────────┘
                   │
            ┌──────▼──────┐
            │ MySQL :3306 │
            │  localhost  │
            └─────────────┘
```

---

## 🚀 COMMANDES UTILES

### Surveillance
```bash
# Voir les ports exposés
netstat -tulnp | grep LISTEN

# Status des services
pm2 list
systemctl status nginx
systemctl status fail2ban

# Logs en temps réel
pm2 logs vocalbox-api
pm2 logs vocalbox-voix
tail -f /var/log/nginx/access.log
```

### Fail2ban
```bash
# Status général
fail2ban-client status

# Détails d'un jail
fail2ban-client status sshd

# Voir les IPs bannies
fail2ban-client status sshd | grep "Banned IP"

# Débannir une IP
fail2ban-client set sshd unbanip 1.2.3.4
```

### Vérification sécurité
```bash
# Test santé des services
curl https://app.vokalbox.fr/health
curl https://voix.vokalbox.fr/health
curl https://api.vokalbox.fr/health

# Vérifier que les ports sont bien sur localhost
netstat -tulnp | grep -E '(3000|3002|5678)'
```

---

## 🔐 RECOMMANDATIONS FUTURES

### Court terme (Optionnel)
- [ ] Configurer les alertes email fail2ban
- [ ] Installer Netdata pour monitoring en temps réel
- [ ] Configurer la rotation automatique des logs

### Moyen terme
- [ ] Script de backup automatique MySQL quotidien
- [ ] Vérifier le renouvellement automatique SSL (certbot)
- [ ] Activer les mises à jour de sécurité automatiques

### Long terme
- [ ] Envisager un WAF (Cloudflare)
- [ ] Mettre en place un IDS/IPS
- [ ] Audit de vulnérabilités mensuel

---

## ⚠️ IMPORTANT - À RETENIR

1. **Connexion SSH** : Vous DEVEZ maintenant utiliser vos clés SSH. Les mots de passe sont désactivés.
2. **Port 65002** : Le SSH est sur ce port personnalisé (pas le 22 standard).
3. **Clés SSH** : Vous avez 2 clés autorisées dans `/root/.ssh/authorized_keys`.
4. **Si vous perdez vos clés** : Contactez Hostinger pour accès console VNC.

---

## 📞 SUPPORT

**En cas de problème :**
1. Vérifier les logs : `pm2 logs` et `/var/log/nginx/error.log`
2. Consulter les backups : `/root/backups/security-20251203/`
3. Rapport complet sur le VPS : `/root/RAPPORT_SECURITE_VOKALBOX.md`

**Connexion SSH :**
```bash
ssh -p 65002 root@31.97.53.227
```

---

## ✅ CHECKLIST FINALE

- [x] Tous les ports sensibles limités à localhost
- [x] SSH durci (clés uniquement, 3 tentatives max)
- [x] MySQL non exposé (localhost uniquement)
- [x] fail2ban actif avec 3 jails
- [x] SSL/TLS sur tous les domaines
- [x] Services Node.js derrière nginx
- [x] Backups créés et testés
- [x] Tests de connectivité : 100% réussis
- [x] Redis/MongoDB : Non installés (pas de risque)

---

**🎉 VOTRE VPS EST MAINTENANT SÉCURISÉ !**

*Sécurisation effectuée le 03/12/2025*
*Par Claude Code pour E Formateck (Cannes)*
