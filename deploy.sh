#!/usr/bin/env bash
# ==============================================================================
# CNIP Network Manager - One-Command Server Deployment Script
# Supports: Ubuntu, Debian, CentOS, AlmaLinux, RHEL, Amazon Linux 2023
# ==============================================================================

set -e

echo "========================================================"
echo "      CNIP Network Manager - Server Deployment          "
echo "========================================================"

# Step 1: Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[-] Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable --now docker
    rm -f get-docker.sh
    echo "[+] Docker installed successfully."
fi

# Step 2: Ensure .env exists
if [ ! -f .env ]; then
    echo "[*] Creating production .env from .env.example..."
    cp .env.example .env
    # Generate random strong JWT Secret
    RANDOM_JWT=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=${RANDOM_JWT}|g" .env
    echo "[+] Generated secure JWT_SECRET in .env."
fi

# Step 3: Build and start containers
echo "[*] Starting CNIP Network Manager via Docker Compose..."
docker compose down --remove-orphans || true
docker compose up -d --build

# Step 4: Health Check verification
echo "[*] Waiting for services to initialize..."
sleep 15

BACKEND_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' cnip-backend 2>/dev/null || echo "\"running\"")
POSTGRES_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' cnip-postgres 2>/dev/null || echo "\"running\"")

echo "========================================================"
echo "             DEPLOYMENT COMPLETED!                      "
echo "========================================================"
echo "  Web UI Console:       http://$(curl -s ifconfig.me || echo "localhost")"
echo "  Backend REST API:     http://$(curl -s ifconfig.me || echo "localhost"):8080/api"
echo "  OpenAPI / Swagger:    http://$(curl -s ifconfig.me || echo "localhost"):8080/swagger-ui.html"
echo ""
echo "  Default Logins:"
echo "    • Admin:    admin / Admin123!"
echo "    • Operator: operator / Operator123!"
echo "    • Viewer:   viewer / Viewer123!"
echo "========================================================"
