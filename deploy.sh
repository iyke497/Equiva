#!/usr/bin/env bash
set -euo pipefail
# ============================================
# EQUIVA — DEPLOY TO UBUNTU SERVER
# Usage: ./deploy.sh
# ============================================

# --- Configuration (edit these) ---
SERVER_USER="equiva-admin"
SERVER_HOST="equivaafrica.org"
SSH_KEY="~/.ssh/equiva-key"
REMOTE_DIR="/var/www/equiva"
APP_PORT="8000"
DOMAIN="equivaafrica.org"

# --- Derived ---
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST}"

# ============================================
# STEP 1 — SYNC FILES
# ============================================
echo "→ Preparing remote directory ..."
$SSH "sudo mkdir -p ${REMOTE_DIR} && sudo chown ${SERVER_USER}:${SERVER_USER} ${REMOTE_DIR}"

echo "→ Syncing files to ${SERVER_HOST}:${REMOTE_DIR} ..."
rsync -az --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude 'instance/' \
  --exclude '.git/' \
  --exclude '.venv/' \
  --exclude '.DS_Store' \
  ./ "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"
echo "✓ Files synced."

# ============================================
# STEP 2 — REMOTE SETUP (packages + venv)
# ============================================
echo "→ Running remote setup ..."

$SSH bash <<REMOTE
set -euo pipefail
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-pip python3-venv nginx supervisor certbot python3-certbot-nginx
cd ${REMOTE_DIR}
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt
echo "✓ Dependencies installed."
REMOTE

# ============================================
# STEP 3 — SEED .env IF MISSING
# ============================================
$SSH bash <<REMOTE
if [ ! -f ${REMOTE_DIR}/.env ]; then
    echo "FLASK_ENV=production" > ${REMOTE_DIR}/.env
    echo "SECRET_KEY=$(openssl rand -hex 32)" >> ${REMOTE_DIR}/.env
    echo "ADMIN_PASSWORD=$(openssl rand -hex 8)" >> ${REMOTE_DIR}/.env
    echo "✓ .env created with random secrets"
    echo "  Admin password: $(grep ADMIN_PASSWORD ${REMOTE_DIR}/.env | cut -d= -f2)"
fi
REMOTE

# ============================================
# STEP 4 — SUPERVISORD
# ============================================
echo "→ Configuring supervisord ..."

$SSH bash <<REMOTE
set -euo pipefail
mkdir -p ${REMOTE_DIR}/instance /var/log/equiva
sudo chown ${SERVER_USER}:${SERVER_USER} ${REMOTE_DIR}/instance /var/log/equiva

sudo tee /etc/supervisor/conf.d/equiva.conf > /dev/null <<CONF
[program:equiva]
command=${REMOTE_DIR}/.venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:${APP_PORT} \
    --access-logfile /var/log/equiva/access.log \
    --error-logfile /var/log/equiva/error.log \
<<<<<<< HEAD
    wsgi:app
directory=${REMOTE_DIR}
user=${SERVER_USER}
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stdout_logfile=/var/log/equiva/supervisor.log
stderr_logfile=/var/log/equiva/supervisor.err
CONF

sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart equiva || sudo supervisorctl start equiva
echo "✓ Gunicorn running under supervisord on 127.0.0.1:${APP_PORT}"
REMOTE

# ============================================
# STEP 5 — NGINX
# ============================================
echo "→ Configuring nginx ..."

$SSH bash <<REMOTE
set -euo pipefail

# Check if SSL certs already exist
if [ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
    # Full HTTPS config
    sudo tee /etc/nginx/sites-available/equiva > /dev/null <<'NGINX'
server {
    listen 80;
    server_name equivaafrica.org www.equivaafrica.org;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl http2;
    server_name equivaafrica.org www.equivaafrica.org;
    ssl_certificate     /etc/letsencrypt/live/equivaafrica.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/equivaafrica.org/privkey.pem;
    client_max_body_size 5m;
    access_log /var/log/equiva/nginx-access.log;
    error_log  /var/log/equiva/nginx-error.log;
    location /static/ {
        alias ${REMOTE_DIR}/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
else
    # HTTP-only config (first run — certbot will add SSL later)
    sudo tee /etc/nginx/sites-available/equiva > /dev/null <<'NGINX'
server {
    listen 80;
    server_name equivaafrica.org www.equivaafrica.org;
    client_max_body_size 5m;
    access_log /var/log/equiva/nginx-access.log;
    error_log  /var/log/equiva/nginx-error.log;
    location /static/ {
        alias ${REMOTE_DIR}/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
fi

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/equiva /etc/nginx/sites-enabled/equiva
sudo nginx -t
sudo systemctl reload nginx
echo "✓ Nginx configured."
REMOTE

# ============================================
# STEP 6 — SSL (first run only, runs after HTTP nginx is up)
# ============================================
$SSH bash <<REMOTE
if [ ! -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
    echo "→ Obtaining SSL certificate ..."
    sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN}
    echo "✓ SSL certificate obtained."
else
    echo "→ SSL certificate exists, renewing if needed ..."
    sudo certbot renew --non-interactive || true
fi
REMOTE

# ============================================
# DONE
# ============================================
echo ""
echo "======================================"
echo "  Equiva deploy complete!"
echo "  Site: https://${DOMAIN}"
echo "  Admin: https://${DOMAIN}/admin/login"
echo "======================================"
