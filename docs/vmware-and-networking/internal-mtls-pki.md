# Internal Mesh mTLS PKI Generation (`scripts/gen_matrix_pki.sh`)

All communication between the simulated edge nodes (`sentinel-node-01` through `node-03`) and the central command hub (`sentinel-nexus`) is authenticated via **Mutual TLS 1.3**.

---

## 1. PKI Generation Workflow

`make init` runs `gen_matrix_pki.sh` to generate the testing Certificate Authority and signed node keys:

```bash
#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="/opt/sentinel-matrix/shared/certs"
mkdir -p "${CERT_DIR}"

echo "[*] Provisioning internal mTLS PKI for 10.240.0.0/24 simulation mesh..."

# 1. Generate Root CA
openssl req -x509 -new -nodes -newkey rsa:2048 -days 365 \
    -keyout "${CERT_DIR}/ca.key" \
    -out "${CERT_DIR}/ca.crt" \
    -subj "/C=DE/O=Aryorithm/CN=Matrix-Internal-CA"

# 2. Generate Server Certificate for Nexus Hub (10.240.0.10)
openssl req -new -nodes -newkey rsa:2048 \
    -keyout "${CERT_DIR}/nexus_server.key" \
    -out "${CERT_DIR}/nexus_server.csr" \
    -subj "/C=DE/O=Aryorithm/CN=sentinel-nexus"

cat <<EOF > /tmp/nexus_ext.cnf
subjectAltName = DNS:sentinel-nexus,IP:10.240.0.10,IP:127.0.0.1
EOF

openssl x509 -req -days 365 \
    -in "${CERT_DIR}/nexus_server.csr" \
    -CA "${CERT_DIR}/ca.crt" \
    -CAkey "${CERT_DIR}/ca.key" \
    -CAcreateserial \
    -out "${CERT_DIR}/nexus_server.crt" \
    -extfile /tmp/nexus_ext.cnf

# 3. Generate Edge Appliance Node Client Certificate
openssl req -new -nodes -newkey rsa:2048 \
    -keyout "${CERT_DIR}/node_client.key" \
    -out "${CERT_DIR}/node_client.csr" \
    -subj "/C=DE/O=Aryorithm/CN=matrix-edge-node"

openssl x509 -req -days 365 \
    -in "${CERT_DIR}/node_client.csr" \
    -CA "${CERT_DIR}/ca.crt" \
    -CAkey "${CERT_DIR}/ca.key" \
    -CAcreateserial \
    -out "${CERT_DIR}/node_client.crt"

echo "[+] Internal PKI generated successfully in ${CERT_DIR}."
```

---

## 2. Invariants

* **Shared Mount:** Mounted read-only (`:ro`) across all containers.
* **Strict Validation:** If a node attempts connection with an invalid or expired certificate, `sentinel-nexus` rejects the gRPC handshake with code `UNAUTHENTICATED (16)`.

