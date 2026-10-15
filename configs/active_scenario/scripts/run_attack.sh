#!/usr/bin/env bash
echo "[*] Triggering Industroyer2 breaker disconnect attack from 10.240.0.99..."
tcpreplay -i eth0 -t /etc/sentinel/pcaps/industroyer2_substation.pcap
