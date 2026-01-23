# Hetzner Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Ready
- [x] Hunter Agent refactored to Enrichment API
- [x] GPT-4 Email Pattern Generator implemented
- [x] All tests passing (test-hunter-enrichment.ts)
- [x] Build successful (pnpm build)
- [x] Committed and pushed to GitHub

### ✅ Environment Variables
Check these are set in `/root/friday-crm/.env`:

```bash
# Database
DATABASE_URL=mysql://bluser:PASSWORD@localhost:3306/friday_crm

# APIs
APOLLO_API_KEY=your_apollo_enrichment_key
OPENAI_API_KEY=your_openai_key

# Server
PORT=3000
NODE_ENV=production
```

### ✅ Database
- [x] MySQL running on localhost:3306
- [x] Database `friday_crm` exists
- [x] User `bluser` has permissions
- [x] Tables created (corporations, hunter_jobs, hunter_results, hunter_settings)

### ✅ PM2 Processes
Expected processes:
- `friday-crm` - Main server (port 3000)
- `scout-worker` - Scout Agent daemon
- `hunter-worker` - Hunter Agent daemon

---

## Deployment Steps

### 1. Backup Current State

```bash
# SSH into Hetzner
ssh root@46.224.13.250

# Create backup
cd /root
tar -czf friday-crm-backup-$(date +%Y%m%d-%H%M%S).tar.gz friday-crm/
mv friday-crm-backup-*.tar.gz ~/backups/

# Verify backup
ls -lh ~/backups/
```

### 2. Deploy New Code

```bash
# Run deployment script
cd /root/friday-crm
bash deploy-hetzner.sh

# Expected output:
# 🚀 FRIDAY CRM Deployment Starting...
# 📥 Pulling latest changes from GitHub...
# 📦 Installing dependencies...
# 🔨 Building project...
# 🔄 Restarting main server...
# 🔄 Restarting Scout Worker...
# 🔄 Restarting Hunter Worker...
# ✅ Deployment complete!
```

### 3. Verify Services

```bash
# Check PM2 status
pm2 status

# Expected output:
# ┌────┬────────────────┬─────────┬─────────┬─────────┬──────────┐
# │ id │ name           │ status  │ restart │ uptime  │ cpu      │
# ├────┼────────────────┼─────────┼─────────┼─────────┼──────────┤
# │ 0  │ friday-crm     │ online  │ 0       │ 10s     │ 0%       │
# │ 1  │ scout-worker   │ online  │ 0       │ 10s     │ 0%       │
# │ 2  │ hunter-worker  │ online  │ 0       │ 10s     │ 0%       │
# └────┴────────────────┴─────────┴─────────┴─────────┴──────────┘

# If any service is stopped:
pm2 restart <name>
```

### 4. Check Logs

```bash
# Main server logs
pm2 logs friday-crm --lines 20

# Expected:
# Server running on http://localhost:3000/
# [OAuth] Initialized with baseURL: https://api.manus.im

# Scout Worker logs
pm2 logs scout-worker --lines 20

# Expected:
# FRIDAY CRM - Scout Worker Daemon
# Poll interval: 30s
# [Scout Worker] Polling Scout Queue...

# Hunter Worker logs
pm2 logs hunter-worker --lines 20

# Expected:
# FRIDAY CRM - Hunter Worker Daemon
# Poll interval: 30s
# Apollo API configured: true
# [Hunter Worker] Polling Hunter Queue...
```

### 5. Test Main Server

```bash
# Check if server responds
curl http://localhost:3000/

# Expected: HTML response with "FRIDAY CRM"

# Check from outside
curl http://46.224.13.250:3000/

# Expected: Same HTML response
```

### 6. Test Database Connection

```bash
# Connect to MySQL
mysql -u bluser -p friday_crm

# Check tables
SHOW TABLES;

# Expected output should include:
# - corporations
# - hunter_jobs
# - hunter_results
# - hunter_settings
# - scout_queue
# - scout_settings

# Check Hunter Settings
SELECT * FROM hunter_settings;

# If empty, run reset script:
mysql -u bluser -p friday_crm < /root/friday-crm/reset-hunter-settings.sql

# Exit MySQL
exit
```

---

## Post-Deployment Testing

### Test 1: Scout Agent (Existing Functionality)

```bash
# Check Scout Queue
mysql -u bluser -p friday_crm -e "SELECT id, seedName, status FROM scout_queue ORDER BY createdAt DESC LIMIT 5;"

# Expected: Should see completed jobs
```

### Test 2: Hunter Agent (New Functionality)

**Step 1: Check Approved Corporations**
```bash
mysql -u bluser -p friday_crm -e "SELECT id, name, website, scoutStatus FROM corporations WHERE scoutStatus = 'Approved' LIMIT 5;"

# Note: If 0 results, approve some corporations via UI first
```

**Step 2: Check Hunter Jobs**
```bash
mysql -u bluser -p friday_crm -e "SELECT id, corporationId, status, createdAt FROM hunter_jobs ORDER BY createdAt DESC LIMIT 5;"

# Expected: Should see jobs (pending or completed)
```

**Step 3: Manually Create Test Job (if needed)**
```bash
# Get a corporation ID
mysql -u bluser -p friday_crm -e "SELECT id, name FROM corporations LIMIT 1;"

# Create hunter job
mysql -u bluser -p friday_crm -e "INSERT INTO hunter_jobs (id, corporationId, status, priority, targetCount) VALUES (UUID(), 'CORPORATION_ID_HERE', 'pending', 1, 10);"

# Wait 30 seconds for worker to process
sleep 30

# Check job status
mysql -u bluser -p friday_crm -e "SELECT id, status, error FROM hunter_jobs ORDER BY createdAt DESC LIMIT 1;"

# Expected: status = 'completed' or 'processing'
```

**Step 4: Check Hunter Results**
```bash
mysql -u bluser -p friday_crm -e "SELECT fullName, email, title, confidence FROM hunter_results ORDER BY createdAt DESC LIMIT 10;"

# Expected: Should see contacts with confidence scores
```

### Test 3: UI Testing

**Via Browser:**
1. Open http://46.224.13.250:3000
2. Login with admin credentials
3. Navigate to Hunter → Dashboard
4. Check if jobs are visible
5. Navigate to Hunter → Review Queue
6. Check if contacts are visible

**Expected:**
- Dashboard shows job statistics
- Jobs show corporation names (not IDs)
- Review Queue shows contacts with confidence scores

---

## Monitoring

### Real-Time Logs

```bash
# Watch all logs
pm2 logs

# Watch specific service
pm2 logs hunter-worker

# Filter for errors
pm2 logs hunter-worker | grep -i error

# Filter for success
pm2 logs hunter-worker | grep -i "completed successfully"
```

### Performance Metrics

```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop

# Disk usage
df -h

# Database size
mysql -u bluser -p friday_crm -e "SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)' FROM information_schema.TABLES WHERE table_schema = 'friday_crm' ORDER BY (data_length + index_length) DESC;"
```

### Database Monitoring

```bash
# Count records
mysql -u bluser -p friday_crm -e "
SELECT 
  'corporations' AS table_name, COUNT(*) AS count FROM corporations
UNION ALL
SELECT 'hunter_jobs', COUNT(*) FROM hunter_jobs
UNION ALL
SELECT 'hunter_results', COUNT(*) FROM hunter_results
UNION ALL
SELECT 'scout_queue', COUNT(*) FROM scout_queue;
"

# Job statistics
mysql -u bluser -p friday_crm -e "
SELECT 
  status, 
  COUNT(*) AS count,
  AVG(TIMESTAMPDIFF(SECOND, createdAt, completedAt)) AS avg_duration_seconds
FROM hunter_jobs 
WHERE completedAt IS NOT NULL
GROUP BY status;
"

# Contact confidence distribution
mysql -u bluser -p friday_crm -e "
SELECT 
  CASE 
    WHEN confidence >= 80 THEN '80-100%'
    WHEN confidence >= 60 THEN '60-79%'
    WHEN confidence >= 40 THEN '40-59%'
    ELSE '0-39%'
  END AS confidence_range,
  COUNT(*) AS count
FROM hunter_results
GROUP BY confidence_range
ORDER BY confidence_range DESC;
"
```

---

## Troubleshooting

### Issue: Worker not starting

**Symptom:**
```bash
pm2 status
# hunter-worker │ stopped │ 0
```

**Solution:**
```bash
# Check logs for error
pm2 logs hunter-worker --err --lines 50

# Common errors:
# 1. "Cannot find module" → Rebuild: pnpm build
# 2. "Database connection failed" → Check DATABASE_URL in .env
# 3. "API key not configured" → Check APOLLO_API_KEY in .env

# Restart worker
pm2 restart hunter-worker

# If still failing, start manually to see full error:
cd /root/friday-crm
node dist/hunterWorkerDaemon.js
```

### Issue: Jobs stuck in "pending"

**Symptom:**
```sql
SELECT status, COUNT(*) FROM hunter_jobs GROUP BY status;
-- pending: 10
-- completed: 0
```

**Solution:**
```bash
# Check if worker is processing
pm2 logs hunter-worker | grep "Processing"

# If not processing:
# 1. Check worker is running: pm2 status
# 2. Check database connection: pm2 logs hunter-worker | grep "Database"
# 3. Restart worker: pm2 restart hunter-worker

# Manually trigger processing:
cd /root/friday-crm
node -e "
const { processPendingJobs } = require('./dist/hunterWorkerDaemon.js');
processPendingJobs().then(() => console.log('Done'));
"
```

### Issue: 0 contacts found

**Symptom:**
```sql
SELECT id, status, error FROM hunter_jobs WHERE status = 'completed';
-- All jobs completed but 0 results
```

**Solution:**
```bash
# Check logs for GPT-4 errors
pm2 logs hunter-worker | grep "Email Pattern"

# Check logs for Apollo errors
pm2 logs hunter-worker | grep "Apollo"

# Test manually:
cd /root/friday-crm
pnpm tsx test-hunter-enrichment.ts

# If test works but production doesn't:
# 1. Check .env has correct API keys
# 2. Verify worker is loading .env: pm2 logs hunter-worker | grep "Configuration"
# 3. Restart worker: pm2 restart hunter-worker
```

### Issue: High error rate

**Symptom:**
```sql
SELECT status, COUNT(*) FROM hunter_jobs GROUP BY status;
-- failed: 8
-- completed: 2
```

**Solution:**
```bash
# Check error messages
mysql -u bluser -p friday_crm -e "SELECT id, error FROM hunter_jobs WHERE status = 'failed' ORDER BY createdAt DESC LIMIT 5;"

# Common errors:
# 1. "No website found" → Corporation missing website field
# 2. "No email patterns generated" → GPT-4 API error
# 3. "Apollo API error" → Rate limit or invalid key

# Fix and retry failed jobs:
mysql -u bluser -p friday_crm -e "UPDATE hunter_jobs SET status = 'pending' WHERE status = 'failed';"
```

---

## Rollback Procedure

If deployment fails or causes issues:

```bash
# Stop all services
pm2 stop all

# Restore from backup
cd /root
rm -rf friday-crm
tar -xzf backups/friday-crm-backup-YYYYMMDD-HHMMSS.tar.gz

# Restart services
cd friday-crm
pm2 restart all

# Verify
pm2 status
pm2 logs
```

---

## Maintenance

### Daily Checks

```bash
# Check service status
pm2 status

# Check for errors
pm2 logs --err --lines 50

# Check disk space
df -h
```

### Weekly Checks

```bash
# Review job statistics
mysql -u bluser -p friday_crm -e "
SELECT 
  DATE(createdAt) AS date,
  status,
  COUNT(*) AS count
FROM hunter_jobs
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(createdAt), status
ORDER BY date DESC;
"

# Review contact quality
mysql -u bluser -p friday_crm -e "
SELECT 
  AVG(confidence) AS avg_confidence,
  COUNT(*) AS total_contacts,
  SUM(CASE WHEN emailStatus = 'valid' THEN 1 ELSE 0 END) AS verified_emails
FROM hunter_results
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY);
"

# Clean old logs
pm2 flush
```

### Monthly Checks

```bash
# Database backup
mysqldump -u bluser -p friday_crm > ~/backups/friday_crm_$(date +%Y%m%d).sql
gzip ~/backups/friday_crm_$(date +%Y%m%d).sql

# Archive old results (optional)
mysql -u bluser -p friday_crm -e "
DELETE FROM hunter_results 
WHERE reviewStatus = 'rejected' 
AND createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
"

# Update dependencies
cd /root/friday-crm
pnpm update
pnpm build
pm2 restart all
```

---

## Support Contacts

**Server:** Hetzner VPS (46.224.13.250)  
**Database:** MySQL 8.0 (localhost:3306)  
**PM2 Dashboard:** `pm2 web` (port 9615)

**Logs Location:**
- PM2 Logs: `~/.pm2/logs/`
- Application Logs: Check PM2 logs
- MySQL Logs: `/var/log/mysql/error.log`

**Backup Location:** `~/backups/`

