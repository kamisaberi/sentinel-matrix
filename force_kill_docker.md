# 1. Kill the background host sentinel-nexus process holding port 9443
sudo pkill -9 -f sentinel-nexus || true
sudo fuser -k 9443/tcp 2>/dev/null || true

# 2. Restart the Docker daemon to clear the stuck containerd shims & AppArmor locks
sudo systemctl restart docker

# 3. Force-remove any leftover stuck matrix containers
sudo docker rm -f $(docker ps -aq --filter "name=matrix-") 2>/dev/null || true



# 1. Stop and disable the host systemd service so it stops respawning
sudo systemctl stop sentinel-nexus.service
sudo systemctl disable sentinel-nexus.service

# 2. Force-kill anything still clinging to port 9443
sudo fuser -k 9443/tcp 2>/dev/null || true

# 3. Confirm port 9443 is completely free (this should return nothing)
sudo ss -tulpn | grep 9443 || echo "[+] Port 9443 is 100% FREE!"

# 4. Now start the nexus container in Docker
# cd /home/kami/sentinel-matrix
# docker compose up -d nexus



# 1. Unload stale/unknown AppArmor profiles locking the containers
sudo aa-remove-unknown

# 2. Restart containerd and docker to flush all locked container shims
sudo systemctl restart containerd
sudo systemctl restart docker

# 3. Force-remove any remaining matrix containers
docker rm -f $(docker ps -aq --filter "name=matrix-") 2>/dev/null || true