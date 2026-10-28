# 1. Kill the background host sentinel-nexus process holding port 9443
sudo pkill -9 -f sentinel-nexus || true
sudo fuser -k 9443/tcp 2>/dev/null || true

# 2. Restart the Docker daemon to clear the stuck containerd shims & AppArmor locks
sudo systemctl restart docker

# 3. Force-remove any leftover stuck matrix containers
sudo docker rm -f $(docker ps -aq --filter "name=matrix-") 2>/dev/null || true