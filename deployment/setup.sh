#!/bin/bash
set -e
echo "=== Equiva Server Setup ==="

# System packages
sudo apt update
sudo apt install -y python3-venv python3-pip nginx supervisor git certbot python3-certbot-nginx

# Create web root
sudo mkdir -p /var/www/equiva/logs
sudo chown -R $USER:$USER /var/www/equiva

# Clone repo
cd /var/www
git clone https://github.com/iyke497/Equiva.git equiva
cd equiva

# Python venv + deps
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "=== EDIT .env NOW ==="
    echo "Add these lines to /var/www/equiva/.env:"
    echo "FLASK_ENV=production"
    echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
    echo "ADMIN_PASSWORD=<your-password>"
    read -p "Press enter after editing .env..."
fi

# Nginx
sudo cp deployment/equiva.nginx /etc/nginx/sites-available/equiva
sudo ln -sf /etc/nginx/sites-available/equiva /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d equivaafrica.org -d www.equivaafrica.org --non-interactive --agree-tos -m admin@equivaafrica.org || echo "Certbot skipped — run manually if needed"

# Supervisor
sudo cp deployment/equiva.conf /etc/supervisor/conf.d/equiva.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start equiva

# Create instance dir for SQLite
mkdir -p /var/www/equiva/instance
sudo chown -R www-data:www-data /var/www/equiva/instance

echo "=== Setup complete ==="
echo "Visit https://equivaafrica.org"
echo "Admin: https://equivaafrica.org/admin/login"
