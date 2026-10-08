#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Setting up 7strokes on Android (Termux)..."

if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
  cat << EOF > "$PREFIX/bin/kiki"
#!/usr/bin/env bash
exec node "$DIR/kiki.js" "\$@"
EOF
  chmod +x "$PREFIX/bin/kiki"

  cat << EOF > "$PREFIX/bin/kiwi"
#!/usr/bin/env bash
exec node "$DIR/kiki.js" "\$@"
EOF
  chmod +x "$PREFIX/bin/kiwi"

  echo "[+] Registered 'kiki' and 'kiwi' globally in $PREFIX/bin"
fi

mkdir -p "$HOME/.config/ngrok"
cat << 'EOF' > "$HOME/.config/ngrok/ngrok.yml"
version: "3"
agent:
  crl_noverify: true
  dns_resolver_ips:
    - 8.8.8.8
    - 1.1.1.1
EOF
echo "[+] Configured native Android DNS resolver for Ngrok in ~/.config/ngrok/ngrok.yml"

npm link 2>/dev/null || true
echo "[+] Setup complete! You can now run 'kiki' or 'kiwi' from any directory."
