#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  TARGET_USER="${SUDO_USER:-ubuntu}"
else
  TARGET_USER="${USER}"
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg ufw

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "${TARGET_USER}"

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw --force enable

sudo mkdir -p /opt/kbkb-affiliatie
sudo chown "${TARGET_USER}:${TARGET_USER}" /opt/kbkb-affiliatie

printf '\nInstallatie voltooid. Meld opnieuw aan via SSH zodat de Docker-groepsrechten actief worden.\n'
printf 'Open in Oracle Cloud ook ingress TCP 80 en 443 voor de VM-subnet/security list.\n'
