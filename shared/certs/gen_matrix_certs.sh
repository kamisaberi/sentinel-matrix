#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Generating Sentinel Matrix Internal Container mTLS PKI ==="

# 1. Root Certificate Authority
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
    -subj "/C=US/ST=Defense/L=HQ/O=Sentinel-Matrix/CN=Matrix-Root-CA"

# 2. Nexus Server Certificate
openssl genrsa -out nexus.key 2048
openssl req -new -key nexus.key -out nexus.csr \
    -subj "/C=US/ST=Defense/L=HQ/O=Sentinel-Matrix/CN=nexus.matrix.internal"

cat > nexus.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = nexus.matrix.internal
DNS.2 = localhost
IP.1 = 10.240.0.10
IP.2 = 127.0.0.1
EOF

openssl x509 -req -in nexus.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out nexus.crt -days 1825 -sha256 -extfile nexus.ext

# 3. Node Wildcard Client Certificate
openssl genrsa -out node_client.key 2048
openssl req -new -key node_client.key -out node_client.csr \
    -subj "/C=US/ST=Defense/L=Edge/O=Sentinel-Matrix/CN=*.matrix.internal"

openssl x509 -req -in node_client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out node_client.crt -days 1825 -sha256

rm -f *.csr *.ext *.srl
echo "[+] Internal PKI ready for VMware container mesh."