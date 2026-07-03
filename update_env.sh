# Als root auf Hetzner:
# ssh root@46.224.13.250

# Script erstellen:
cat > /tmp/update_env.sh << 'SCRIPT'
#!/bin/bash
cd /home/manus02/friday-crm
chmod +w .env
cat > .env << 'EOF'
DATABASE_URL=mysql://bluser:1Ev3eZcJ8bO0o69O@localhost:3306/friday_crm
JWT_SECRET=friday-crm-jwt-secret-production-2025
OAUTH_SERVER_URL=https://api.manus.im
OWNER_NAME=Martin Langen
OWNER_OPEN_ID=admin
VITE_APP_TITLE=FRIDAY CRM
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=
EOF
chown manus02:manus02 .env
chmod 600 .env
echo "✅ .env updated"
cat .env
SCRIPT

# Ausführen:
bash /tmp/update_env.sh

# Scout Worker neu starten:
su - manus02 -c "cd ~/friday-crm && pkill -f scoutWorkerDaemon && nohup node dist/scoutWorkerDaemon.js > scout-worker.log 2>&1 &"

# Logs prüfen:
tail -f /home/manus02/friday-crm/scout-worker.log

