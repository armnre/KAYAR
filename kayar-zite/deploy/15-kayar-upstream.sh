#!/bin/sh
# Writes IPv4-only upstream servers for BACKEND_HOST (avoids IPv6 timeouts -> 502 on Liara)
F=/etc/nginx/kayar_upstream.conf
H="${BACKEND_HOST:-ma8nxe5agt.zite.so}"
IPS=$(getent ahostsv4 "$H" 2>/dev/null | awk '{print $1}' | sort -u)
[ -z "$IPS" ] && IPS=$(nslookup -type=A "$H" 2>/dev/null | awk '/^Address/ && $NF !~ /#/ {print $NF}' | grep -E '^[0-9.]+$' | sort -u)
: > "$F"
for ip in $IPS; do echo "server $ip:443 max_fails=0;" >> "$F"; done
[ -s "$F" ] || echo "server $H:443;" > "$F"
echo "kayar upstream:"; cat "$F"
