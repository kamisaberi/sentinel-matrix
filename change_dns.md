# 1. Create or update /etc/docker/daemon.json with reliable DNS servers
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1", "178.22.122.100"]
}
EOF

# 2. Restart Docker to apply the DNS settings
sudo systemctl restart docker