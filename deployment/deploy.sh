#!/bin/bash
set -e
cd /var/www/equiva
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart equiva
echo "Deployed at $(date)"
