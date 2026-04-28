#!/usr/bin/env bash
set -euo pipefail
# ============================================
# EQUIVA — DEPLOY TO UBUNTU SERVER
# Usage: ./deploy.sh
# ============================================

# --- Configuration ---
SERVER_USER="equiva-admin"
SERVER_HOST="equivaafrica.org"
SSH_KEY="~/.ssh/equiva-key"
REMOTE_DIR="/var/www/equiva"

# --- Derived ---
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST}"

echo "→ Pulling latest code on server ..."
$SSH "cd ${REMOTE_DIR} && git pull origin main"

echo "→ Installing dependencies ..."
$SSH "cd ${REMOTE_DIR} && source .venv/bin/activate && pip install -r requirements.txt -q"

echo "→ Restarting gunicorn ..."
$SSH "sudo supervisorctl restart equiva"

echo ""
echo "======================================"
echo "  Deploy complete!"
echo "  https://equivaafrica.org"
echo "======================================"
