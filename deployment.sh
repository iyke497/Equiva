#!/bin/bash
# deployment.sh — Blue-green deployment with true rollback (two directories)

# ── Configuration ──
SERVER_ALIAS="Equiva-Prod"
SERVER_USER="equiva-admin"
SERVER_IP="102.68.84.89"
REPO_URL="https://github.com/iyke497/Equiva.git"
SSH_IDENTITY="~/.ssh/equiva-key"

# Directories
GREEN_DIR="/home/equiva-admin/equiva-green"
BLUE_DIR="/home/equiva-admin/equiva-blue"
DATA_DIR="/home/equiva-admin/equiva-data"
STATIC_LINK="/home/equiva-admin/equiva-static"
DB_PATH="${DATA_DIR}/equiva.db"
DB_BACKUP_PATH="${DATA_DIR}/equiva.db.pre-deploy"
ENV_PATH="${DATA_DIR}/.env"

# Blue-green ports
GREEN_PORT=8000
BLUE_PORT=8001

# System paths
NGINX_UPSTREAM="/etc/nginx/conf.d/equiva-upstream.conf"
SUPERVISOR_CONF="/etc/supervisor/conf.d/equiva.conf"
DEPLOY_STATE_GREEN="${GREEN_DIR}/.deploy_state"
DEPLOY_STATE_BLUE="${BLUE_DIR}/.deploy_state"
LOG_DIR="/var/log/equiva"

# Supervisor group prefix
SUPERVISOR_GREEN="equiva:equiva_green"
SUPERVISOR_BLUE="equiva:equiva_blue"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════
#  SSH / Connection
# ═══════════════════════════════════════════════════════

check_ssh_connection() {
    echo -e "${BLUE}Checking SSH connection to ${SERVER_ALIAS}...${NC}"
    if ssh -q -o ConnectTimeout=5 "${SERVER_ALIAS}" exit; then
        echo -e "${GREEN}✓ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Cannot connect to ${SERVER_ALIAS}${NC}"
        echo -e "${YELLOW}Add the following to ~/.ssh/config:${NC}"
        echo "  Host ${SERVER_ALIAS}"
        echo "      HostName ${SERVER_IP}"
        echo "      User ${SERVER_USER}"
        echo "      IdentityFile ${SSH_IDENTITY}"
        echo "      IdentitiesOnly yes"
        return 1
    fi
}

# Run a command inside a specific repo directory with its venv
dir_cmd() {
    local dir=$1
    shift
    ssh "${SERVER_ALIAS}" "cd ${dir} && source ${dir}/venv/bin/activate && $*"
}

# ═══════════════════════════════════════════════════════
#  Git Operations
# ═══════════════════════════════════════════════════════

setup_remote() {
    echo -e "${BLUE}Setting up git remote...${NC}"
    if git remote | grep -q "^production$"; then
        echo -e "${YELLOW}Remote 'production' already exists${NC}"
        CURRENT_URL=$(git remote get-url production)
        echo "Current URL: ${CURRENT_URL}"
        return 0
    fi
    git remote add production "${REPO_URL}"
    echo -e "${GREEN}✓ Added remote 'production' -> ${REPO_URL}${NC}"
}

push_to_server() {
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "${BLUE}Pushing branch '${BRANCH}' to GitHub...${NC}"
    if ! git log "${BRANCH}" --not --remotes --oneline 2>/dev/null | grep -q .; then
        echo -e "${YELLOW}No new commits to push${NC}"
        return 0
    fi
    echo -e "${YELLOW}Commits to be pushed:${NC}"
    git log production/"${BRANCH}".."${BRANCH}" --oneline 2>/dev/null || git log --oneline -5
    if git push -u production "${BRANCH}"; then
        echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
        return 0
    else
        echo -e "${RED}✗ Push failed${NC}"
        return 1
    fi
}

pull_in_dir() {
    local dir=$1
    local branch="${2:-$(git rev-parse --abbrev-ref HEAD)}"
    echo -e "${BLUE}Pulling branch '${branch}' into ${dir}...${NC}"
    ssh "${SERVER_ALIAS}" bash -c "'
        if [ ! -d ${dir} ]; then
            echo \"Creating directory...\"
            mkdir -p \$(dirname ${dir})
            git clone --branch ${branch} ${REPO_URL} ${dir}
            echo \"Repository cloned to ${dir}\"
        else
            cd ${dir}
            git reset --hard HEAD
            git pull origin ${branch}
        fi
        echo \"\"
        echo \"Commit: \$(git log --oneline -1)\"
    '"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${dir} updated${NC}"
        return 0
    else
        echo -e "${RED}✗ Pull into ${dir} failed${NC}"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════
#  Blue-Green State Management
# ═══════════════════════════════════════════════════════

get_active_name() {
    local state=$(ssh "${SERVER_ALIAS}" "cat ${DEPLOY_STATE_GREEN}" 2>/dev/null)
    echo "$state" | python3 -c "import sys,json; print(json.load(sys.stdin)['active'])" 2>/dev/null || echo "green"
}

get_idle_name() {
    local active=$(get_active_name)
    if [ "$active" = "green" ]; then echo "blue"; else echo "green"; fi
}

get_idle_port() {
    local idle=$(get_idle_name)
    if [ "$idle" = "green" ]; then echo "${GREEN_PORT}"; else echo "${BLUE_PORT}"; fi
}

get_active_port() {
    local active=$(get_active_name)
    if [ "$active" = "green" ]; then echo "${GREEN_PORT}"; else echo "${BLUE_PORT}"; fi
}

get_idle_dir() {
    local idle=$(get_idle_name)
    if [ "$idle" = "green" ]; then echo "${GREEN_DIR}"; else echo "${BLUE_DIR}"; fi
}

get_active_dir() {
    local active=$(get_active_name)
    if [ "$active" = "green" ]; then echo "${GREEN_DIR}"; else echo "${BLUE_DIR}"; fi
}

get_idle_supervisor() {
    local idle=$(get_idle_name)
    if [ "$idle" = "green" ]; then echo "${SUPERVISOR_GREEN}"; else echo "${SUPERVISOR_BLUE}"; fi
}

get_active_supervisor() {
    local active=$(get_active_name)
    if [ "$active" = "green" ]; then echo "${SUPERVISOR_GREEN}"; else echo "${SUPERVISOR_BLUE}"; fi
}

flip_active() {
    local new_active=$(get_idle_name)
    local new_dir=$(get_idle_dir)
    local new_rev=$(ssh "${SERVER_ALIAS}" "cd ${new_dir} && git rev-parse --short HEAD" 2>/dev/null || echo "unknown")
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local state_file="${GREEN_DIR}/.deploy_state"
    ssh "${SERVER_ALIAS}" "python3 -c \"
import json
state_file = '${state_file}'
with open(state_file) as f:
    s = json.load(f)
s['previous_active'] = s['active']
s['active'] = '${new_active}'
s['${new_active}_revision'] = '${new_rev}'
s['last_deploy'] = '${ts}'
with open(state_file, 'w') as f:
    json.dump(s, f)
# Mirror to both directories
import shutil
shutil.copy('${GREEN_DIR}/.deploy_state', '${BLUE_DIR}/.deploy_state')
\""
}

# ═══════════════════════════════════════════════════════
#  Health Check
# ═══════════════════════════════════════════════════════

health_check() {
    local port=$1
    local max_retries=10
    local delay=2
    echo -e "${BLUE}Health check on port ${port}...${NC}"
    for i in $(seq 1 $max_retries); do
        local code=$(ssh "${SERVER_ALIAS}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${port}/" 2>/dev/null)
        if [ "$code" = "200" ] || [ "$code" = "302" ]; then
            echo -e "${GREEN}✓ Healthy (HTTP ${code}) on attempt ${i}${NC}"
            return 0
        fi
        echo -e "${YELLOW}  Attempt ${i}: HTTP ${code:-no response}, waiting ${delay}s...${NC}"
        sleep $delay
    done
    echo -e "${RED}✗ Health check failed after ${max_retries} attempts${NC}"
    return 1
}

# ═══════════════════════════════════════════════════════
#  Nginx Upstream Switch
# ═══════════════════════════════════════════════════════

flip_nginx() {
    local port=$1
    echo -e "${BLUE}Switching nginx upstream to port ${port}...${NC}"
    ssh "${SERVER_ALIAS}" "echo 'upstream equiva_backend { server 127.0.0.1:${port}; }' | sudo tee ${NGINX_UPSTREAM} > /dev/null"
    ssh "${SERVER_ALIAS}" "sudo nginx -s reload 2>/dev/null || sudo systemctl reload nginx"
    echo -e "${GREEN}✓ nginx reloaded → port ${port}${NC}"
}

flip_static() {
    local dir=$1
    echo -e "${BLUE}Switching static symlink to ${dir}/static...${NC}"
    ssh "${SERVER_ALIAS}" "ln -snf ${dir}/static ${STATIC_LINK}"
    echo -e "${GREEN}✓ static symlink → ${dir}/static${NC}"
}

backup_db() {
    echo -e "${BLUE}Backing up database before deploy...${NC}"
    ssh "${SERVER_ALIAS}" "cp ${DB_PATH} ${DB_BACKUP_PATH}" && echo -e "${GREEN}✓ DB backed up to ${DB_BACKUP_PATH}${NC}"
}

restore_db() {
    echo -e "${BLUE}Restoring database from pre-deploy backup...${NC}"
    if ssh "${SERVER_ALIAS}" "[ -f ${DB_BACKUP_PATH} ]"; then
        ssh "${SERVER_ALIAS}" "cp ${DB_BACKUP_PATH} ${DB_PATH}" && echo -e "${GREEN}✓ DB restored from ${DB_BACKUP_PATH}${NC}"
        return 0
    else
        echo -e "${RED}✗ No backup found at ${DB_BACKUP_PATH}${NC}"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════
#  Commands
# ═══════════════════════════════════════════════════════

cmd_init() {
    local branch=$(git rev-parse --abbrev-ref HEAD)
    echo -e "${BLUE}=== First-Time Deployment: ${SERVER_ALIAS} ===${NC}"
    echo ""

    # 1: Push to GitHub
    echo -e "${BLUE}Pushing branch '${branch}' to GitHub...${NC}"
    push_to_server || { echo -e "${RED}✗ Push failed${NC}"; return 1; }
    echo ""

    # 2: System dependencies
    echo -e "${BLUE}Checking system dependencies...${NC}"
    ssh "${SERVER_ALIAS}" "sudo apt update -qq && sudo apt install -y -qq python3-pip" 2>/dev/null
    local py_version=$(ssh "${SERVER_ALIAS}" "python3 --version 2>/dev/null | grep -oP '\d+\.\d+' || echo '3.12'")
    ssh "${SERVER_ALIAS}" "sudo apt install -y -qq python${py_version}-venv python${py_version}-dev"
    ssh "${SERVER_ALIAS}" "sudo mkdir -p ${LOG_DIR} && sudo chown ${SERVER_USER}:${SERVER_USER} ${LOG_DIR}"

    # 3: Clone into BOTH directories
    pull_in_dir "${GREEN_DIR}" "${branch}" || return 1
    pull_in_dir "${BLUE_DIR}" "${branch}" || return 1

    # 4: Shared data directory — DB + .env symlinks
    echo -e "${BLUE}Setting up shared data...${NC}"
    ssh "${SERVER_ALIAS}" "mkdir -p ${DATA_DIR}"
    # Ensure nginx (www-data) can traverse home dir to reach static files
    ssh "${SERVER_ALIAS}" "chmod o+x \$(dirname ${GREEN_DIR})"

    # Move existing DB from green's instance dir if present
    if ssh "${SERVER_ALIAS}" "[ -f ${GREEN_DIR}/instance/equiva.db ] && [ ! -L ${GREEN_DIR}/instance/equiva.db ]"; then
        ssh "${SERVER_ALIAS}" "mv ${GREEN_DIR}/instance/equiva.db ${DB_PATH}"
        echo -e "${GREEN}✓ Moved existing DB to ${DATA_DIR}${NC}"
    fi

    # Move existing .env from green's root if present
    if ssh "${SERVER_ALIAS}" "[ -f ${GREEN_DIR}/.env ] && [ ! -L ${GREEN_DIR}/.env ]"; then
        ssh "${SERVER_ALIAS}" "cp ${GREEN_DIR}/.env ${ENV_PATH}"
        echo -e "${GREEN}✓ Moved existing .env to ${DATA_DIR}${NC}"
    fi

    # Symlink DB and .env in both directories
    ssh "${SERVER_ALIAS}" "mkdir -p ${GREEN_DIR}/instance ${BLUE_DIR}/instance"
    ssh "${SERVER_ALIAS}" "ln -snf ${DB_PATH} ${GREEN_DIR}/instance/equiva.db"
    ssh "${SERVER_ALIAS}" "ln -snf ${DB_PATH} ${BLUE_DIR}/instance/equiva.db"
    ssh "${SERVER_ALIAS}" "ln -snf ${ENV_PATH} ${GREEN_DIR}/.env"
    ssh "${SERVER_ALIAS}" "ln -snf ${ENV_PATH} ${BLUE_DIR}/.env"

    # Warn if .env is missing entirely
    local has_env=$(ssh "${SERVER_ALIAS}" "[ -f ${ENV_PATH} ] && echo 'yes' || echo 'no'")
    if [ "$has_env" = "no" ]; then
        echo -e "${YELLOW}⚠ No .env found at ${ENV_PATH}${NC}"
        echo -e "${YELLOW}  Create it on the server with required secrets ${NC}"
    fi

    # 5: Create venv in BOTH directories
    echo -e "${BLUE}Creating virtualenv in green...${NC}"
    ssh "${SERVER_ALIAS}" "cd ${GREEN_DIR} && python3 -m venv venv" || { echo -e "${RED}✗ venv green failed${NC}"; return 1; }
    echo -e "${BLUE}Creating virtualenv in blue...${NC}"
    ssh "${SERVER_ALIAS}" "cd ${BLUE_DIR} && python3 -m venv venv" || { echo -e "${RED}✗ venv blue failed${NC}"; return 1; }

    # 6: Install requirements in BOTH
    echo -e "${BLUE}Installing requirements in green...${NC}"
    dir_cmd "${GREEN_DIR}" "pip install -r requirements.txt" || return 1
    echo -e "${BLUE}Installing requirements in blue...${NC}"
    dir_cmd "${BLUE_DIR}" "pip install -r requirements.txt" || return 1

    # 7: Write supervisor config
    echo -e "${BLUE}Writing supervisor config...${NC}"
    ssh "${SERVER_ALIAS}" "sudo tee ${SUPERVISOR_CONF} > /dev/null" << SUPERVISOR_EOF
[program:equiva_green]
command=${GREEN_DIR}/venv/bin/gunicorn wsgi:app -b 127.0.0.1:${GREEN_PORT} -w 1 --timeout 120 --max-requests 1000 --max-requests-jitter 50 --worker-tmp-dir /dev/shm
directory=${GREEN_DIR}
user=${SERVER_USER}
autostart=true
autorestart=true
stopasgroup=true
stderr_logfile=${LOG_DIR}/green-error.log
stdout_logfile=${LOG_DIR}/green-access.log

[program:equiva_blue]
command=${BLUE_DIR}/venv/bin/gunicorn wsgi:app -b 127.0.0.1:${BLUE_PORT} -w 1 --timeout 120 --max-requests 1000 --max-requests-jitter 50 --worker-tmp-dir /dev/shm
directory=${BLUE_DIR}
user=${SERVER_USER}
autostart=false
autorestart=true
stopasgroup=true
stderr_logfile=${LOG_DIR}/blue-error.log
stdout_logfile=${LOG_DIR}/blue-access.log

[group:equiva]
programs=equiva_green,equiva_blue
SUPERVISOR_EOF

    # 8: Write nginx upstream
    echo -e "${BLUE}Writing nginx upstream...${NC}"
    ssh "${SERVER_ALIAS}" "echo 'upstream equiva_backend { server 127.0.0.1:${GREEN_PORT}; }' | sudo tee ${NGINX_UPSTREAM} > /dev/null"
    flip_static "${GREEN_DIR}"

    # 9: Run migrations (fresh DB)
    echo -e "${BLUE}Running initial database setup...${NC}"
    dir_cmd "${GREEN_DIR}" "SKIP_AUTO_TABLES=1 flask db upgrade" || {
        echo -e "${YELLOW}⚠ Migration failed — will be retried on first app start${NC}"
    }

    # 10: Init deploy state in both
    local init_rev=$(ssh "${SERVER_ALIAS}" "cd ${GREEN_DIR} && git rev-parse --short HEAD" 2>/dev/null || echo "unknown")
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    ssh "${SERVER_ALIAS}" "cat > ${DEPLOY_STATE_GREEN}" << STATE_EOF
{"active":"green","ports":{"green":${GREEN_PORT},"blue":${BLUE_PORT}},"green_revision":"${init_rev}","blue_revision":"","last_deploy":"${ts}","previous_active":"blue"}
STATE_EOF
    ssh "${SERVER_ALIAS}" "cp ${DEPLOY_STATE_GREEN} ${DEPLOY_STATE_BLUE}"

    # 11: Reload supervisor and start green
    echo -e "${BLUE}Starting app...${NC}"
    ssh "${SERVER_ALIAS}" "sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start ${SUPERVISOR_GREEN}"
    sleep 4

    # 12: Health check
    health_check "${GREEN_PORT}" || {
        echo -e "${RED}✗ App failed to start. Check: sudo supervisorctl tail ${SUPERVISOR_GREEN} stderr${NC}"
        return 1
    }

    echo ""
    echo -e "${GREEN}✓ Init complete — green active on port ${GREEN_PORT}${NC}"
    echo -e "${BLUE}Run './deployment.sh update' for subsequent deploys.${NC}"
}

cmd_update() {
    local run_migrations=false
    [[ "$1" == "-m" ]] && run_migrations=true

    echo -e "${BLUE}=== Blue-Green Deploy to ${SERVER_ALIAS} ===${NC}"
    echo ""

    local idle_name=$(get_idle_name)
    local idle_port=$(get_idle_port)
    local active_name=$(get_active_name)
    local active_port=$(get_active_port)
    local idle_dir=$(get_idle_dir)
    local active_dir=$(get_active_dir)
    local idle_supervisor=$(get_idle_supervisor)
    local active_supervisor=$(get_active_supervisor)

    echo -e "${BLUE}Active: ${active_name} (port ${active_port}) — ${active_dir}${NC}"
    echo -e "${BLUE}Idle:   ${idle_name} (port ${idle_port}) — ${idle_dir}${NC}"
    echo ""

    # 1: Push to GitHub
    push_to_server || return 1
    echo ""

    # 2: Pull new code into IDLE directory (active dir stays frozen)
    pull_in_dir "${idle_dir}" || return 1

    # 3: Install deps in idle
    echo -e "${BLUE}Installing dependencies in ${idle_name}...${NC}"
    dir_cmd "${idle_dir}" "pip install -r requirements.txt" || {
        echo -e "${RED}✗ pip install failed${NC}"
        return 1
    }

    # 4: Pre-deploy DB backup + migrations
    backup_db || {
        echo -e "${RED}✗ DB backup failed — aborting${NC}"
        return 1
    }
    if $run_migrations; then
        echo -e "${BLUE}Running database migrations...${NC}"
        if dir_cmd "${idle_dir}" "SKIP_AUTO_TABLES=1 flask db upgrade"; then
            echo -e "${GREEN}✓ Migrations complete${NC}"
        else
            echo -e "${RED}✗ Migrations failed. Restoring DB from backup...${NC}"
            restore_db
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Migrations skipped. Use './deployment.sh update -m' if schema changed.${NC}"
    fi

    echo ""

    # 5: Rewrite supervisor config (catches gunicorn flag changes)
    echo -e "${BLUE}Updating supervisor config...${NC}"
    ssh "${SERVER_ALIAS}" "sudo tee ${SUPERVISOR_CONF} > /dev/null" << SUPERVISOR_EOF
[program:equiva_green]
command=${GREEN_DIR}/venv/bin/gunicorn wsgi:app -b 127.0.0.1:${GREEN_PORT} -w 1 --timeout 120 --max-requests 1000 --max-requests-jitter 50 --worker-tmp-dir /dev/shm
directory=${GREEN_DIR}
user=${SERVER_USER}
autostart=true
autorestart=true
stopasgroup=true
stderr_logfile=${LOG_DIR}/green-error.log
stdout_logfile=${LOG_DIR}/green-access.log

[program:equiva_blue]
command=${BLUE_DIR}/venv/bin/gunicorn wsgi:app -b 127.0.0.1:${BLUE_PORT} -w 1 --timeout 120 --max-requests 1000 --max-requests-jitter 50 --worker-tmp-dir /dev/shm
directory=${BLUE_DIR}
user=${SERVER_USER}
autostart=false
autorestart=true
stopasgroup=true
stderr_logfile=${LOG_DIR}/blue-error.log
stdout_logfile=${LOG_DIR}/blue-access.log

[group:equiva]
programs=equiva_green,equiva_blue
SUPERVISOR_EOF
    ssh "${SERVER_ALIAS}" "sudo supervisorctl reread && sudo supervisorctl update"
    echo -e "${GREEN}✓ Supervisor config updated${NC}"

    # 6: Restart idle instance (loads new code from idle dir)
    echo -e "${BLUE}Restarting ${idle_name} instance (port ${idle_port})...${NC}"
    ssh "${SERVER_ALIAS}" "sudo supervisorctl start ${idle_supervisor}"
    sleep 3

    # 7: Health check
    health_check "${idle_port}" || {
        echo -e "${RED}✗ ${idle_name} failed health check. Rolling back...${NC}"
        ssh "${SERVER_ALIAS}" "sudo supervisorctl stop ${idle_supervisor}"
        restore_db || true
        return 1
    }

    # 8: Switch static symlink to new dir
    flip_static "${idle_dir}"

    # 9: Switch nginx to idle port
    flip_nginx "${idle_port}"

    # 10: Update deploy state
    flip_active

    # 11: STOP the old instance (now idle, kept frozen on disk)
    echo -e "${BLUE}Stopping old ${active_name} instance...${NC}"
    ssh "${SERVER_ALIAS}" "sudo supervisorctl stop ${active_supervisor}"

    echo ""
    echo -e "${GREEN}✓ Deploy complete — ${idle_name} active on port ${idle_port}${NC}"
    echo -e "${BLUE}Rollback available via './deployment.sh rollback' (old code untouched in ${active_dir})${NC}"
}

cmd_rollback() {
    echo -e "${BLUE}=== Rollback on ${SERVER_ALIAS} ===${NC}"
    echo ""

    local idle_name=$(get_idle_name)
    local idle_port=$(get_idle_port)
    local idle_dir=$(get_idle_dir)
    local idle_supervisor=$(get_idle_supervisor)
    local active_port=$(get_active_port)

    echo -e "${BLUE}Rollback target: ${idle_name} (port ${idle_port}) — ${idle_dir}${NC}"
    echo -e "${YELLOW}This instance has NOT been touched by the last deploy.${NC}"
    echo ""

    # 1: Start old instance from frozen directory
    echo -e "${BLUE}Starting ${idle_name} instance...${NC}"
    ssh "${SERVER_ALIAS}" "sudo supervisorctl start ${idle_supervisor}"
    sleep 3

    # 2: Health check
    health_check "${idle_port}" || {
        echo -e "${RED}✗ Rollback target unhealthy — old code may have issues${NC}"
        ssh "${SERVER_ALIAS}" "sudo supervisorctl stop ${idle_supervisor}"
        return 1
    }

    # 3: Switch static symlink
    flip_static "${idle_dir}"

    # 4: Switch nginx
    flip_nginx "${idle_port}"

    # 5: Update deploy state
    flip_active

    # 6: Stop the other instance
    local old_name=$( [ "$idle_name" = "green" ] && echo "blue" || echo "green" )
    local old_supervisor=$( [ "$old_name" = "green" ] && echo "${SUPERVISOR_GREEN}" || echo "${SUPERVISOR_BLUE}" )
    echo -e "${BLUE}Stopping ${old_name} instance...${NC}"
    ssh "${SERVER_ALIAS}" "sudo supervisorctl stop ${old_supervisor}"

    # 7: Restore DB if pre-deploy backup exists
    if ssh "${SERVER_ALIAS}" "[ -f ${DB_BACKUP_PATH} ]"; then
        echo -e "${YELLOW}Pre-deploy DB backup found.${NC}"
        restore_db || true
    fi

    echo ""
    echo -e "${GREEN}✓ Rolled back to ${idle_name} (port ${idle_port})${NC}"
}

cmd_sync() {
    echo -e "${BLUE}=== Sync Idle Directory ===${NC}"
    echo ""

    local idle_name=$(get_idle_name)
    local idle_dir=$(get_idle_dir)
    local active_name=$(get_active_name)

    echo -e "${BLUE}Catching up ${idle_name} directory (${idle_dir}) to latest...${NC}"
    echo -e "${YELLOW}Active (${active_name}) is NOT affected.${NC}"
    echo ""

    # 1: Pull
    pull_in_dir "${idle_dir}" || return 1

    # 2: Install deps
    echo -e "${BLUE}Installing dependencies...${NC}"
    dir_cmd "${idle_dir}" "pip install -r requirements.txt" || return 1

    echo ""
    echo -e "${GREEN}✓ ${idle_name} synced to latest — next deploy will target it with no extra work${NC}"
}

cmd_status() {
    local branch=$(git rev-parse --abbrev-ref HEAD)
    echo -e "${BLUE}Status — ${SERVER_ALIAS} — branch: ${branch}${NC}"
    echo ""

    # Git sync
    git fetch production 2>/dev/null
    local ahead=$(git rev-list production/"${branch}".."${branch}" --count 2>/dev/null)
    local behind=$(git rev-list "${branch}"..production/"${branch}" --count 2>/dev/null)
    echo -e "${YELLOW}Git sync:${NC}"
    echo -e "  Local ahead:  ${GREEN}${ahead:-0}${NC}"
    echo -e "  Remote ahead: ${RED}${behind:-0}${NC}"
    echo ""

    # Both directories
    echo -e "${YELLOW}Directories:${NC}"
    for dir_name in "green" "blue"; do
        if [ "$dir_name" = "green" ]; then dir="${GREEN_DIR}"; port="${GREEN_PORT}"; else dir="${BLUE_DIR}"; port="${BLUE_PORT}"; fi
        local info=$(ssh "${SERVER_ALIAS}" "cd ${dir} 2>/dev/null && echo \"\$(git rev-parse --abbrev-ref HEAD) \$(git log --oneline -1)\" || echo 'NOT FOUND'" 2>/dev/null)
        echo -e "  ${dir_name} (port ${port}): ${info}"
    done
    echo ""

    # Blue-green state
    echo -e "${YELLOW}Blue-green:${NC}"
    local state=$(ssh "${SERVER_ALIAS}" "cat ${DEPLOY_STATE_GREEN}" 2>/dev/null)
    if [ -n "$state" ]; then
        echo "$state" | python3 -c "
import sys, json
s = json.load(sys.stdin)
print(f\"  Active:   {s['active']} (port {s['ports'][s['active']]})\")
print(f\"  Idle:     {'blue' if s['active']=='green' else 'green'} (port {s['ports']['blue' if s['active']=='green' else 'green']})\")
print(f\"  Green rev: {s.get('green_revision','—')}\")
print(f\"  Blue rev:  {s.get('blue_revision','—')}\")
print(f\"  Previous:  {s.get('previous_active','—')}\")
print(f\"  Deployed:  {s.get('last_deploy','—')}\")
"
    else
        echo -e "  ${RED}No deploy state found${NC}"
    fi
    echo ""

    # Static symlink
    local static_target=$(ssh "${SERVER_ALIAS}" "readlink ${STATIC_LINK}" 2>/dev/null)
    echo -e "${YELLOW}Static:${NC} ${static_target:-${RED}broken${NC}}"
    echo ""

    # DB
    local db_size=$(ssh "${SERVER_ALIAS}" "ls -lh ${DB_PATH} 2>/dev/null | awk '{print \$5}'" 2>/dev/null)
    local has_backup=$(ssh "${SERVER_ALIAS}" "[ -f ${DB_BACKUP_PATH} ] && echo 'yes' || echo 'no'" 2>/dev/null)
    echo -e "${YELLOW}Database:${NC} ${db_size:-NOT FOUND}  (pre-deploy backup: ${has_backup})"
    echo ""

    # Supervisor status
    echo -e "${YELLOW}Supervisor:${NC}"
    local sup=$(ssh "${SERVER_ALIAS}" "sudo supervisorctl status ${SUPERVISOR_GREEN} ${SUPERVISOR_BLUE}" 2>/dev/null)
    if [ -n "$sup" ]; then
        echo "$sup"
    else
        echo -e "  ${RED}supervisor not running${NC}"
    fi
}

ssh_to_server() {
    echo -e "${BLUE}Connecting to ${SERVER_ALIAS}...${NC}"
    ssh "${SERVER_ALIAS}"
}

# ═══════════════════════════════════════════════════════
#  Help
# ═══════════════════════════════════════════════════════

show_help() {
    cat << EOF
${GREEN}deployment.sh${NC} — Two-directory blue-green deploy for ${SERVER_ALIAS}

${YELLOW}USAGE:${NC}
    ./deployment.sh [command]

${YELLOW}COMMANDS:${NC}
    ${GREEN}setup${NC}       Configure git remote (GitHub)
    ${GREEN}push${NC}        Push current branch to GitHub
    ${GREEN}pull${NC}        Pull changes into working dir on server
    ${GREEN}deploy${NC}      push + pull in one step (git only, no restart)

    ${GREEN}init${NC}        First-time: both dirs, venvs, supervisor, nginx, start
    ${GREEN}update${NC}      Deploy to idle dir → health check → switch
    ${GREEN}update -m${NC}   Same + DB backup + 'flask db upgrade' before switch
    ${GREEN}rollback${NC}    Start old (frozen) dir → switch back → restore DB
    ${GREEN}sync${NC}        Catch up idle dir (no traffic impact, no switch)
    ${GREEN}status${NC}      Git sync + both dirs + blue-green state + supervisor
    ${GREEN}ssh${NC}         Open SSH session
    ${GREEN}help${NC}        This message

${YELLOW}DIRECTORIES:${NC}
    ${GREEN_DIR}           Active (when green)
    ${BLUE_DIR}            Active (when blue)
    ${DATA_DIR}/equiva.db   Shared database (symlinked into both)
    ${DATA_DIR}/equiva.db.pre-deploy  Pre-upgrade snapshot

${YELLOW}ENVIRONMENT:${NC}
    .env lives in ${DATA_DIR}/.env and is symlinked into both dirs.
    Create it on the server before first start:
      echo 'SECRET_KEY=...' > ${ENV_PATH}
      echo 'ADMIN_PASSWORD=...' >> ${ENV_PATH}
      echo 'FLASK_ENV=production' >> ${ENV_PATH}
      echo 'DATABASE_URL=sqlite:///instance/equiva.db' >> ${ENV_PATH}

${YELLOW}MIGRATIONS:${NC}
    After model changes, generate a migration locally:
      flask db migrate -m "description"
      git add migrations/ && git commit -m "add migration"
    Then deploy with:
      ./deployment.sh update -m

${YELLOW}ROLLBACK SAFETY:${NC}
    The inactive directory is NEVER git-pulled until the NEXT update targets it.
    So during a deploy, the inactive dir is frozen at the old revision
    — complete with old venv, old code.
    ./deployment.sh rollback starts that frozen instance and switches traffic back.

${YELLOW}FLOW:${NC}
    # Manually add SSH config (see error message if missing)
    ./deployment.sh setup              # Once: configure git remote
    ./deployment.sh init               # Once: full two-dir setup on server
    ./deployment.sh update             # Every deploy (no migrations)
    ./deployment.sh update -m          # Deploy + run migrations (auto DB backup)
    ./deployment.sh rollback           # Full code + DB rollback
    ./deployment.sh sync               # Sync idle dir to latest (optional)

${YELLOW}CONFIG:${NC}
    Server: ${SERVER_ALIAS} (${SERVER_USER}@${SERVER_IP})
    Ports:  green=${GREEN_PORT}  blue=${BLUE_PORT}
    SSH:    ${SSH_IDENTITY}
    Repo:   ${REPO_URL}
EOF
}

# ═══════════════════════════════════════════════════════
#  Main Dispatch
# ═══════════════════════════════════════════════════════

main() {
    case "$1" in
        setup|push|deploy|status|update|init|sync)
            if ! git rev-parse --git-dir > /dev/null 2>&1; then
                echo -e "${RED}Error: Not in a git repository${NC}"
                exit 1
            fi
            ;;
    esac

    case "$1" in
        setup)
            check_ssh_connection && setup_remote
            ;;
        push)
            push_to_server
            ;;
        pull)
            check_ssh_connection && pull_in_dir "$2"
            ;;
        deploy)
            check_ssh_connection && { push_to_server && echo "" && pull_in_dir; }
            ;;
        init)
            check_ssh_connection && cmd_init
            ;;
        update)
            check_ssh_connection && cmd_update "$2"
            ;;
        rollback)
            check_ssh_connection && cmd_rollback
            ;;
        sync)
            check_ssh_connection && cmd_sync
            ;;
        status)
            cmd_status
            ;;
        ssh)
            ssh_to_server
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

main "$@"
