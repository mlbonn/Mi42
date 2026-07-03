#!/bin/bash
# Deploy Scout Worker to Hetzner Server
# Usage: ./deploy-worker-hetzner.sh

set -e

echo "=========================================="
echo "FRIDAY CRM - Scout Worker Deployment"
echo "=========================================="

# Configuration
HETZNER_HOST="46.224.13.250"
HETZNER_USER="manus02"
HETZNER_PASS="mIlrq2NQiGP88yLo"
REMOTE_DIR="friday-crm-dev"
OPENAI_KEY=""  # removed

echo "Building project..."
pnpm build

echo "Uploading files to Hetzner..."
sshpass -p "$HETZNER_PASS" scp -o StrictHostKeyChecking=no \
  dist/scoutWorkerDaemon.js \
  dist/scoutWorker.js \
  "$HETZNER_USER@$HETZNER_HOST:~/$REMOTE_DIR/dist/"

echo "Creating worker start script on server..."
sshpass -p "$HETZNER_PASS" ssh -o StrictHostKeyChecking=no "$HETZNER_USER@$HETZNER_HOST" << 'ENDSSH'
cd ~/friday-crm-dev

# Create worker start script
cat > start-worker.sh << 'EOF'
#!/bin/bash
export DATABASE_URL='mysql://manus02:mIlrq2NQiGP88yLo@localhost:3306/friday_crm'
export OPENAI_API_KEY=  # removed
nohup node dist/scoutWorkerDaemon.js > worker.log 2>&1 &
echo $! > worker.pid
echo "Worker started with PID $(cat worker.pid)"
EOF

chmod +x start-worker.sh

# Create worker stop script
cat > stop-worker.sh << 'EOF'
#!/bin/bash
if [ -f worker.pid ]; then
  PID=$(cat worker.pid)
  kill $PID 2>/dev/null && echo "Worker stopped (PID: $PID)" || echo "Worker not running"
  rm worker.pid
else
  echo "No PID file found"
fi
EOF

chmod +x stop-worker.sh

echo "Scripts created successfully"
ENDSSH

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "To start the worker on Hetzner:"
echo "  ssh manus02@$HETZNER_HOST"
echo "  cd $REMOTE_DIR"
echo "  ./start-worker.sh"
echo ""
echo "To stop the worker:"
echo "  ./stop-worker.sh"
echo ""
echo "To view logs:"
echo "  tail -f worker.log"
echo ""

