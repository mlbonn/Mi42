# FRIDAY CRM: Deployment auf Hetzner Server

## Voraussetzungen

**Server:**
- Ubuntu 22.04 LTS
- Mindestens 2 GB RAM
- 20 GB Speicher
- Root-Zugriff

**Domain:**
- Domain konfiguriert (z.B. `crm.bl2020.com`)
- DNS A-Record auf Server-IP

---

## Schritt 1: Server-Vorbereitung

### SSH-Verbindung

```bash
ssh root@YOUR_SERVER_IP
```

### System aktualisieren

```bash
apt update && apt upgrade -y
```

### Node.js installieren (v22)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### pnpm installieren

```bash
npm install -g pnpm
```

### MySQL installieren

```bash
apt install -y mysql-server
mysql_secure_installation
```

### MySQL-Datenbank erstellen

```bash
mysql -u root -p
```

```sql
CREATE DATABASE friday_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'friday_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON friday_crm.* TO 'friday_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Nginx installieren

```bash
apt install -y nginx
```

### Certbot für SSL

```bash
apt install -y certbot python3-certbot-nginx
```

---

## Schritt 2: Projekt deployen

### Git installieren

```bash
apt install -y git
```

### Projekt clonen

```bash
cd /var/www
git clone https://github.com/YOUR_REPO/friday-crm.git
cd friday-crm
```

**Hinweis:** Falls noch kein Git-Repository, Dateien per SCP hochladen:

```bash
# Lokal ausführen
scp -r /home/ubuntu/friday-crm root@YOUR_SERVER_IP:/var/www/
```

### Dependencies installieren

```bash
pnpm install
```

### Environment Variables

```bash
nano .env
```

**.env Inhalt:**

```bash
# Database
DATABASE_URL=mysql://friday_user:STRONG_PASSWORD_HERE@localhost:3306/friday_crm

# JWT Secret (generieren mit: openssl rand -base64 32)
JWT_SECRET=YOUR_GENERATED_SECRET_HERE

# Manus OAuth (aus Manus-Projekt kopieren)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=Your Name

# App Config
VITE_APP_TITLE=FRIDAY CRM
VITE_APP_LOGO=/logo.png

# Manus Built-in APIs (aus Projekt kopieren)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# Production
NODE_ENV=production
PORT=3000
```

### Datenbank migrieren

```bash
pnpm db:push
```

### Build

```bash
pnpm build
```

---

## Schritt 3: PM2 Process Manager

### PM2 installieren

```bash
npm install -g pm2
```

### PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'friday-crm',
    script: 'server/index.js',
    cwd: '/var/www/friday-crm',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### App starten

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Status prüfen

```bash
pm2 status
pm2 logs friday-crm
```

---

## Schritt 4: Nginx Reverse Proxy

### Nginx Config

```bash
nano /etc/nginx/sites-available/friday-crm
```

**/etc/nginx/sites-available/friday-crm:**

```nginx
server {
    listen 80;
    server_name crm.bl2020.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Config aktivieren

```bash
ln -s /etc/nginx/sites-available/friday-crm /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Schritt 5: SSL-Zertifikat (Let's Encrypt)

```bash
certbot --nginx -d crm.bl2020.com
```

**Hinweise:**
- E-Mail-Adresse angeben
- Terms akzeptieren
- Redirect zu HTTPS: Ja

### Auto-Renewal testen

```bash
certbot renew --dry-run
```

---

## Schritt 6: Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

---

## Schritt 7: Backup-Strategie

### MySQL Backup (täglich)

```bash
nano /root/backup-friday-crm.sh
```

**/root/backup-friday-crm.sh:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/friday-crm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# MySQL Backup
mysqldump -u friday_user -pSTRONG_PASSWORD_HERE friday_crm > $BACKUP_DIR/friday_crm_$DATE.sql

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "friday_crm_*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /root/backup-friday-crm.sh
```

### Cron Job (täglich um 2 Uhr)

```bash
crontab -e
```

```
0 2 * * * /root/backup-friday-crm.sh >> /var/log/friday-crm-backup.log 2>&1
```

---

## Schritt 8: Monitoring

### PM2 Monitoring

```bash
pm2 monit
```

### Logs

```bash
# PM2 Logs
pm2 logs friday-crm

# Nginx Logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MySQL Logs
tail -f /var/log/mysql/error.log
```

---

## Updates deployen

### Code aktualisieren

```bash
cd /var/www/friday-crm
git pull  # oder per SCP hochladen
pnpm install
pnpm build
pm2 restart friday-crm
```

### Datenbank-Migration

```bash
pnpm db:push
```

---

## Troubleshooting

### App startet nicht

```bash
pm2 logs friday-crm
```

Häufige Fehler:
- `.env` Datei fehlt oder falsch
- Datenbank-Verbindung fehlgeschlagen
- Port 3000 bereits belegt

### Nginx 502 Bad Gateway

```bash
systemctl status nginx
pm2 status
```

Prüfen:
- PM2 App läuft
- Port 3000 erreichbar: `curl http://localhost:3000`

### Datenbank-Verbindung fehlgeschlagen

```bash
mysql -u friday_user -p friday_crm
```

Prüfen:
- User existiert
- Passwort korrekt
- Datenbank existiert

---

## Performance-Optimierung

### Nginx Caching

```nginx
# In /etc/nginx/sites-available/friday-crm
location /assets/ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";
}
```

### PM2 Cluster Mode (mehrere Instanzen)

```javascript
// ecosystem.config.js
instances: 'max',  // statt 1
exec_mode: 'cluster'
```

---

## Sicherheit

### Fail2Ban (Brute-Force-Schutz)

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### SSH Key-Only (kein Passwort)

```bash
nano /etc/ssh/sshd_config
```

```
PasswordAuthentication no
```

```bash
systemctl restart sshd
```

### MySQL Remote Access deaktivieren

```bash
nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```
bind-address = 127.0.0.1
```

```bash
systemctl restart mysql
```

---

## Checkliste

- [ ] Server vorbereitet (Node.js, MySQL, Nginx)
- [ ] Projekt geclont/hochgeladen
- [ ] `.env` konfiguriert
- [ ] Dependencies installiert
- [ ] Datenbank migriert
- [ ] Build erfolgreich
- [ ] PM2 läuft
- [ ] Nginx konfiguriert
- [ ] SSL-Zertifikat installiert
- [ ] Firewall aktiviert
- [ ] Backup-Strategie eingerichtet
- [ ] Domain erreichbar
- [ ] Login funktioniert

---

## Support

Bei Problemen:
1. PM2 Logs prüfen: `pm2 logs friday-crm`
2. Nginx Logs prüfen: `tail -f /var/log/nginx/error.log`
3. Datenbank-Verbindung testen: `mysql -u friday_user -p friday_crm`

