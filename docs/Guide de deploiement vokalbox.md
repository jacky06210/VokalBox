🚀 GUIDE DE DÉPLOIEMENT VOCALBOXMAÎTRE
INFORMATIONS DU SERVEUR
VPS: Hostinger
IP: 31.97.53.227
OS: Ubuntu 22.04
User: root
Domaine: app.vokalbox.fr (déjà configuré)
ARCHITECTURE ACTUELLE
/home/vocalbox/api/          <- API Node.js (PM2: vocalbox-api, port 3000)
    ├── server.js            <- À REMPLACER
    ├── routes/
    │   └── menu-scan.js     <- À CRÉER
    ├── public/
    │   └── maitre/
    │       └── index.html   <- À CRÉER
    ├── .env                 <- EXISTE DÉJÀ (ne pas toucher)
    └── node_modules/        <- EXISTE DÉJÀ

Base de données: MySQL (vocalbox)
ÉTAPES DE DÉPLOIEMENT
ÉTAPE 1 : Créer les dossiers nécessaires
mkdir -p /home/vocalbox/api/routes
mkdir -p /home/vocalbox/api/public/maitre
ÉTAPE 2 : Copier les fichiers
Copier les fichiers suivants depuis ce package :
1.	server.js → /home/vocalbox/api/server.js
2.	routes/menu-scan.js → /home/vocalbox/api/routes/menu-scan.js
3.	public/maitre/index.html → /home/vocalbox/api/public/maitre/index.html
ÉTAPE 3 : Initialiser la base de données
mysql -u vocalbox_user -p vocalbox < schema.sql
# Mot de passe: VocalBox2024Secure
Ou manuellement :
mysql -u vocalbox_user -p
# Puis copier-coller le contenu de schema.sql
ÉTAPE 4 : Vérifier le .env
Le fichier /home/vocalbox/api/.env doit contenir :
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=3306
DB_NAME=vocalbox
DB_USER=vocalbox_user
DB_PASSWORD=VocalBox2024Secure

API_SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

CORS_ORIGINS=https://app.vokalbox.fr,https://commandes.vokalbox.fr

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
CLAUDE_API_KEY=[REDACTED_ANTHROPIC_KEY]
IMPORTANT : La clé CLAUDE_API_KEY doit être présente (c'est la clé Anthropic pour Claude Vision).
ÉTAPE 5 : Redémarrer l'API
cd /home/vocalbox/api
pm2 restart vocalbox-api
pm2 logs vocalbox-api --lines 20
ÉTAPE 6 : Configurer nginx pour servir VocalBoxMaître
Éditer /etc/nginx/sites-available/app.vokalbox.fr :
server {
    listen 80;
    server_name app.vokalbox.fr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name app.vokalbox.fr;

    ssl_certificate /etc/letsencrypt/live/app.vokalbox.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.vokalbox.fr/privkey.pem;

    # Servir les fichiers statiques
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Augmenter les timeouts pour les gros uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
        
        # Augmenter la taille max des uploads
        client_max_body_size 50M;
    }
}
Puis :
sudo nginx -t
sudo systemctl reload nginx
ÉTAPE 7 : Obtenir un certificat SSL (si pas déjà fait)
sudo certbot --nginx -d app.vokalbox.fr
TESTS
Test 1 : API Health
curl https://app.vokalbox.fr/health
# Doit retourner: {"success":true,"message":"API opérationnelle"...}
Test 2 : Interface VocalBoxMaître
Ouvrir dans le navigateur : https://app.vokalbox.fr/maitre/
Test 3 : Créer un restaurant de test
curl -X POST https://api.vokalbox.fr/api/v1/restaurants \
  -H "Content-Type: application/json" \
  -d '{"nom":"Pizza Marco","telephone":"0612345678","email":"marco@pizza.fr"}'
STRUCTURE DES ENDPOINTS
Méthode	Endpoint	Description
GET	/health	Vérification API
GET	/health/db	Vérification base de données
GET	/api/menu-scan/verify/:apiKey	Vérifier code restaurant
POST	/api/menu-scan/analyze	Scanner images avec Claude Vision
POST	/api/menu-scan/save	Sauvegarder menu en base
GET	/api/menu-scan/menu	Récupérer menu actuel
POST	/api/v1/restaurants	Créer un restaurant
GET	/api/v1/restaurants	Lister les restaurants
GET	/api/v1/menu/:apiKey	Récupérer menu (pour Telnyx)
COMMANDES UTILES
# Voir les logs en temps réel
pm2 logs vocalbox-api

# Redémarrer l'API
pm2 restart vocalbox-api

# Voir le statut
pm2 status

# Voir les processus
pm2 list

# Tester MySQL
mysql -u vocalbox_user -p vocalbox -e "SELECT * FROM restaurants;"
DÉPANNAGE
Erreur "Cannot find module"
cd /home/vocalbox/api
npm install
pm2 restart vocalbox-api
Erreur CORS
Vérifier que CORS_ORIGINS dans .env contient bien https://app.vokalbox.fr
Erreur Claude API
Vérifier que CLAUDE_API_KEY est bien défini dans .env
Erreur MySQL
# Vérifier la connexion
mysql -u vocalbox_user -p vocalbox -e "SELECT 1;"
RÉSUMÉ DES FICHIERS À DÉPLOYER
1.	✅ schema.sql → Exécuter dans MySQL
2.	✅ server.js → /home/vocalbox/api/server.js
3.	✅ routes/menu-scan.js → /home/vocalbox/api/routes/menu-scan.js
4.	✅ public/maitre/index.html → /home/vocalbox/api/public/maitre/index.html


