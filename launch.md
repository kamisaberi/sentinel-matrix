cd /home/kami/sentinel-matrix

# 1. Reset AppArmor shims, restart docker, and clear stuck containers with 1 command
make fix-docker

# 2. Launch the entire mesh cleanly
make up

# 3. Check live running status
make status