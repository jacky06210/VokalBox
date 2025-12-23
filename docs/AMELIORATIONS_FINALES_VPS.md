# 🚀 AMÉLIORATIONS FINALES VPS VOKALBOX

**Date** : 03/12/2025
**Serveur** : 31.97.53.227 (Hostinger Ubuntu 22.04)

---

## 📋 RÉSUMÉ DES AMÉLIORATIONS

Suite à la sécurisation initiale, les fonctionnalités suivantes ont été ajoutées :

✅ **1. Backup MySQL automatique quotidien**
✅ **2. Alertes email fail2ban** (jbelletrud@gmail.com)
✅ **3. Mises à jour de sécurité automatiques**
✅ **4. Rotation automatique des logs**
✅ **5. Outils de monitoring** (htop + glances)

---

## 1️⃣ BACKUP MYSQL AUTOMATIQUE

### Configuration
- **Script** : `/root/scripts/backup_mysql.sh`
- **Répertoire backups** : `/var/backups/mysql/`
- **Fréquence** : Tous les jours à 2h du matin
- **Rétention** : 7 jours
- **Format** : Fichiers .sql.gz compressés

### Cron configuré
```bash
0 2 * * * /root/scripts/backup_mysql.sh >> /var/log/mysql_backup.log 2>&1
```

### Commandes utiles
```bash
# Lister les backups
ls -lh /var/backups/mysql/

# Lancer un backup manuel
/root/scripts/backup_mysql.sh

# Voir les logs
tail -f /var/log/mysql_backup.log

# Restaurer un backup
gunzip < /var/backups/mysql/vocalbox_20251203_152619.sql.gz | mysql -u vocalbox_user -p vocalbox
```

### Test effectué
```
[2025-12-03 15:26:19] ✓ Backup créé: /var/backups/mysql/vocalbox_20251203_152619.sql.gz
[2025-12-03 15:26:19] Taille: 8.0K
```

---

## 2️⃣ ALERTES EMAIL FAIL2BAN

### Configuration
- **Email destinataire** : jbelletrud@gmail.com
- **Serveur mail** : Postfix (local)
- **Action** : `%(action_mwl)s` (mail avec logs + whois)

### Fichier configuré
`/etc/fail2ban/jail.local` :
```ini
[DEFAULT]
destemail = jbelletrud@gmail.com
sendername = Fail2Ban-VokalBox
mta = sendmail
action = %(action_mwl)s

[sshd]
enabled = true
port = 65002
maxretry = 3
bantime = 7200  # 2 heures

[nginx-http-auth]
enabled = true
maxretry = 3
bantime = 3600  # 1 heure

[nginx-botsearch]
enabled = true
maxretry = 2
bantime = 3600  # 1 heure
```

### Email de test envoyé
Un email de test a été envoyé à **jbelletrud@gmail.com**.
**⚠️ Vérifiez vos spams** si vous ne l'avez pas reçu.

### Ce que vous recevrez
Lorsqu'une IP est bannie, vous recevrez un email contenant :
- L'IP de l'attaquant
- Le nombre de tentatives échouées
- Les logs complets
- Les informations WHOIS de l'IP

---

## 3️⃣ MISES À JOUR DE SÉCURITÉ AUTOMATIQUES

### Configuration
- **Fréquence** : Quotidienne
- **Type** : Uniquement les mises à jour de sécurité
- **Redémarrage auto** : Désactivé (sécurité)
- **Email rapport** : jbelletrud@gmail.com

### Fichiers configurés
1. `/etc/apt/apt.conf.d/50unattended-upgrades`
2. `/etc/apt/apt.conf.d/20auto-upgrades`

### Ce qui est mis à jour automatiquement
- Correctifs de sécurité Ubuntu
- Mises à jour ESM (Extended Security Maintenance)
- Nettoyage des paquets inutilisés

### Emails que vous recevrez
- Rapport de chaque mise à jour appliquée
- Notification si redémarrage nécessaire
- Erreurs éventuelles

### Commandes utiles
```bash
# Voir les dernières mises à jour
cat /var/log/unattended-upgrades/unattended-upgrades.log | tail -20

# Forcer une vérification
sudo unattended-upgrade --dry-run --debug

# Désactiver temporairement
sudo systemctl stop unattended-upgrades
```

---

## 4️⃣ ROTATION AUTOMATIQUE DES LOGS

### Configuration
**Fichier** : `/etc/logrotate.d/vocalbox`

### Logs gérés

| Fichier | Rotation | Rétention | Compression |
|---------|----------|-----------|-------------|
| `/var/log/mysql_backup.log` | Quotidienne | 30 jours | Gzip |
| `/root/.pm2/logs/*.log` | Quotidienne | 14 jours | Gzip |
| `/var/log/netdata/*.log` | Hebdomadaire | 4 semaines | Gzip |

### Avantages
- Économie d'espace disque
- Logs compressés automatiquement
- Pas de débordement disque
- Historique conservé

### Commandes utiles
```bash
# Tester la config logrotate
logrotate -d /etc/logrotate.d/vocalbox

# Forcer une rotation manuelle
logrotate -f /etc/logrotate.d/vocalbox

# Voir l'espace disque utilisé par les logs
du -sh /var/log/* | sort -h
du -sh /root/.pm2/logs/
```

---

## 5️⃣ OUTILS DE MONITORING

### Outils installés

#### 1. htop
**Utilisation :**
```bash
ssh -p 65002 root@31.97.53.227
htop
```

**Fonctionnalités :**
- Vue en temps réel des processus
- Utilisation CPU/RAM par processus
- Interface colorée et interactive
- Tri par CPU, RAM, temps
- Touches : F9 (kill), F6 (tri), F10 (quitter)

#### 2. glances
**Utilisation :**
```bash
ssh -p 65002 root@31.97.53.227
glances
```

**Fonctionnalités :**
- Dashboard complet dans le terminal
- CPU, RAM, Disque, Réseau
- Processus, Docker (si présent)
- Alertes colorées si surcharge
- Touches : q (quitter), s (sensors), 1 (CPU cores)

### Surveillance recommandée

**À surveiller régulièrement :**
1. **CPU** : Ne devrait pas dépasser 80% en continu
2. **RAM** : 4 Go disponibles, surveiller si > 70% utilisé
3. **Disque** : Alerter si > 80% plein
4. **Réseau** : Trafic anormal = attaque potentielle

**Commandes rapides :**
```bash
# Voir l'espace disque
df -h

# Voir la RAM utilisée
free -h

# Voir les processus les plus gourmands
ps aux --sort=-%mem | head -10
ps aux --sort=-%cpu | head -10

# Voir les connexions réseau
netstat -tulnp | grep ESTABLISHED
```

---

## 📊 RÉCAPITULATIF COMPLET DU VPS

### Services actifs

| Service | Status | Description |
|---------|--------|-------------|
| nginx | ✅ Actif | Reverse proxy SSL |
| PM2 (vocalbox-api) | ✅ Actif | API principale (localhost:3000) |
| PM2 (vocalbox-voix) | ✅ Actif | Service vocal (localhost:3002) |
| n8n | ✅ Actif | Automatisation (localhost:5678) |
| MySQL | ✅ Actif | Base de données (localhost:3306) |
| fail2ban | ✅ Actif | Protection anti-brute-force |
| postfix | ✅ Actif | Serveur mail (alertes) |
| unattended-upgrades | ✅ Actif | Mises à jour auto |
| SSH | ✅ Actif | Port 65002 (clés uniquement) |

### Sauvegardes créées

| Type | Emplacement | Fréquence |
|------|-------------|-----------|
| **MySQL** | `/var/backups/mysql/` | Quotidien 2h |
| **Config sécurité** | `/root/backups/security-20251203/` | Manuel |
| **PM2 dump** | `/root/.pm2/dump.pm2` | À chaque restart |

### Logs importants

| Log | Emplacement |
|-----|-------------|
| Nginx access | `/var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` |
| PM2 vocalbox-api | `/root/.pm2/logs/vocalbox-api-*.log` |
| PM2 vocalbox-voix | `/root/.pm2/logs/vocalbox-voix-*.log` |
| MySQL backup | `/var/log/mysql_backup.log` |
| fail2ban | `/var/log/fail2ban.log` |
| Mises à jour | `/var/log/unattended-upgrades/` |

---

## ✉️ EMAILS QUE VOUS RECEVREZ

Vous recevrez des emails sur **jbelletrud@gmail.com** pour :

1. **Fail2ban** :
   - Bannissement d'IP (tentatives SSH/nginx échouées)
   - Débannissement automatique

2. **Mises à jour de sécurité** :
   - Rapport quotidien des mises à jour appliquées
   - Notification si redémarrage nécessaire

3. **Email de test** :
   - Un email de test a déjà été envoyé
   - Vérifiez vos spams si non reçu

**⚠️ Configuration Gmail** : Les emails venant de votre VPS peuvent arriver en spam. Ajoutez `root@srv842355.hstgr.cloud` à vos contacts pour éviter cela.

---

## 🔍 COMMANDES DE SURVEILLANCE QUOTIDIENNE

### Check rapide (2 minutes)

```bash
# Connexion SSH
ssh -p 65002 root@31.97.53.227

# Voir les services
pm2 list
systemctl status nginx --no-pager

# Voir l'espace disque
df -h | grep -E '(Filesystem|/$)'

# Voir les backups MySQL
ls -lh /var/backups/mysql/ | tail -5

# Voir les IPs bannies aujourd'hui
fail2ban-client status sshd

# Quitter
exit
```

### Monitoring complet (5 minutes)

```bash
# Connexion
ssh -p 65002 root@31.97.53.227

# Monitoring interactif
glances

# (Appuyez sur 'q' pour quitter)

# Vérifier les logs d'erreur
tail -20 /var/log/nginx/error.log
pm2 logs --lines 20 --nostream

# Tester les URLs
curl https://app.vokalbox.fr/health
curl https://voix.vokalbox.fr/health
curl https://api.vokalbox.fr/health

# Quitter
exit
```

---

## 🚨 ALERTES ET PROBLÈMES

### Que faire si...

#### 1. Vous recevez un email fail2ban
- **Normal** : Tentatives de connexion SSH normales sur Internet
- **Action** : Aucune, fail2ban gère tout automatiquement
- **⚠️ Alerte** : Si > 50 emails/jour, possibilité d'attaque DDoS

#### 2. Espace disque > 80%
```bash
# Voir l'utilisation
du -sh /* | sort -h | tail -10

# Nettoyer les logs anciens
journalctl --vacuum-time=7d

# Nettoyer les backups MySQL de plus de 30 jours
find /var/backups/mysql/ -name "*.sql.gz" -mtime +30 -delete
```

#### 3. RAM > 90%
```bash
# Voir les processus gourmands
ps aux --sort=-%mem | head -10

# Redémarrer PM2
pm2 restart all

# Redémarrer MySQL si besoin
systemctl restart mysql
```

#### 4. Site down (HTTP 502)
```bash
# Vérifier PM2
pm2 list
pm2 logs vocalbox-api --lines 50

# Redémarrer si besoin
pm2 restart vocalbox-api
pm2 restart vocalbox-voix
```

---

## 📝 CHECKLIST DE MAINTENANCE MENSUELLE

- [ ] Vérifier l'espace disque : `df -h`
- [ ] Vérifier les backups MySQL : `ls -lh /var/backups/mysql/`
- [ ] Tester une restauration de backup (recommandé)
- [ ] Vérifier les IPs bannies : `fail2ban-client status sshd`
- [ ] Vérifier les mises à jour : `apt list --upgradable`
- [ ] Surveiller les logs d'erreur nginx
- [ ] Vérifier la rotation des logs
- [ ] Tester les alertes email

---

## 🎯 PROCHAINES ÉTAPES (OPTIONNEL)

Si vous voulez aller encore plus loin :

### Court terme
- [ ] Configurer un WAF (Web Application Firewall) comme Cloudflare
- [ ] Mettre en place un système de notification Telegram/Slack
- [ ] Ajouter monitoring externe (UptimeRobot, Pingdom)

### Moyen terme
- [ ] Backup automatique vers stockage externe (S3, Backblaze)
- [ ] Mise en place d'un serveur de staging
- [ ] Documentation des procédures d'urgence

### Long terme
- [ ] Cluster haute disponibilité
- [ ] CDN pour les ressources statiques
- [ ] Load balancer

---

## 📞 SUPPORT ET DOCUMENTATION

### Connexion SSH
```bash
ssh -p 65002 root@31.97.53.227
```

**⚠️ Important** : Vous DEVEZ utiliser vos clés SSH (mot de passe désactivé)

### Fichiers de configuration importants
- Backup MySQL : `/root/scripts/backup_mysql.sh`
- Fail2ban : `/etc/fail2ban/jail.local`
- Logrotate : `/etc/logrotate.d/vocalbox`
- Mises à jour auto : `/etc/apt/apt.conf.d/50unattended-upgrades`
- SSH : `/etc/ssh/sshd_config`
- Nginx : `/etc/nginx/sites-available/`

### Restauration en cas de problème
Tous les backups de configuration sont dans :
```
/root/backups/security-20251203/
```

---

## ✅ CHECKLIST FINALE COMPLÈTE

### Sécurité
- [x] Ports sensibles limités à localhost
- [x] SSH durci (clés uniquement, port 65002)
- [x] MySQL non exposé
- [x] fail2ban actif avec 3 jails
- [x] SSL/TLS sur tous les domaines
- [x] Services Node.js derrière nginx

### Sauvegarde
- [x] Backup MySQL quotidien automatique
- [x] Rétention 7 jours
- [x] Logs de backup
- [x] Backup config sécurité

### Monitoring
- [x] htop installé
- [x] glances installé
- [x] Alertes email fail2ban configurées
- [x] Email de test envoyé

### Automatisation
- [x] Mises à jour de sécurité auto
- [x] Rotation des logs
- [x] Cron backup MySQL
- [x] Nettoyage automatique anciens backups

### Tests
- [x] URLs publiques accessibles (200 OK)
- [x] Ports localhost fonctionnels
- [x] Fail2ban opérationnel
- [x] Postfix actif
- [x] Cron configuré
- [x] Logrotate configuré

---

**🎉 VOTRE VPS EST MAINTENANT ULTRA-SÉCURISÉ ET AUTOMATISÉ !**

*Configuration effectuée le 03/12/2025*
*Par Claude Code pour E Formateck (Cannes)*
*Email : jbelletrud@gmail.com*
