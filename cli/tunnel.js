const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { startDnsBridge } = require('./bridge');

let activeTunnelProcess = null;
let currentPublicUrl = null;

function isAndroidOrTermux() {
  const isAndroid = process.platform === 'android';
  const isTermux = Boolean(process.env.PREFIX && process.env.PREFIX.includes('com.termux'));
  return isAndroid || isTermux;
}

function findCloudflaredBinary() {
  const localToolsPath = path.join(__dirname, '../tools/cloudflared.exe');
  if (fs.existsSync(localToolsPath)) return localToolsPath;

  try {
    const whichCmd = process.platform === 'win32' ? 'where cloudflared' : 'which cloudflared';
    const found = execSync(whichCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (found) return found;
  } catch (_) {}

  return null;
}

function findNgrokBinary() {
  try {
    const whichCmd = process.platform === 'win32' ? 'where ngrok' : 'which ngrok';
    const found = execSync(whichCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (found) return found;
  } catch (_) {}

  return 'ngrok';
}

function pollNgrokUrl(retries = 30, delayMs = 1000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const httpsTunnel = data.tunnels?.find((t) => t.proto === 'https') || data.tunnels?.[0];
            if (httpsTunnel && httpsTunnel.public_url) {
              clearInterval(interval);
              resolve(httpsTunnel.public_url);
            }
          } catch (_) {}
        });
      });

      req.on('error', () => {
        if (attempts >= retries) {
          clearInterval(interval);
          resolve(null);
        }
      });
    }, delayMs);
  });
}

async function startTunnel(port = 4000, config = {}) {
  const tunnelType = config.tunnel?.type || 'ngrok';
  const authtoken = config.tunnel?.authtoken;
  const domain = config.tunnel?.domain;
  const onAndroid = isAndroidOrTermux();

  let dnsBridgePort = 8888;
  if (onAndroid) {
    console.log('[*] Android / Termux environment detected!');
    console.log('[*] Starting native Node.js DNS Bridge on 127.0.0.1:8888...');
    const bridge = await startDnsBridge(8888);
    dnsBridgePort = bridge.port;
    console.log(`[✓] DNS Bridge active on 127.0.0.1:${dnsBridgePort}`);
  }

  if (tunnelType === 'ngrok' || authtoken || domain) {
    const ngrokBin = findNgrokBinary();

    if (authtoken) {
      try {
        execSync(`${ngrokBin} config add-authtoken ${authtoken}`, { stdio: 'ignore' });
      } catch (_) {}
    }

    const args = ['http', String(port)];

    if (domain) {
      args.push(`--domain=${domain}`);
    }

    if (onAndroid) {
      args.push(`--proxy-url=http://127.0.0.1:${dnsBridgePort}`);
    }

    console.log(`[*] Launching ngrok: ${ngrokBin} ${args.join(' ')}`);
    const proc = spawn(ngrokBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    activeTunnelProcess = proc;

    proc.on('error', (err) => {
      console.warn('[!] Ngrok process error:', err.message);
    });

    const url = await pollNgrokUrl(25, 1000);
    if (url) {
      currentPublicUrl = url;
      return { type: 'ngrok', url, process: proc };
    }
  }

  const cfBin = findCloudflaredBinary();
  if (cfBin) {
    console.log(`[*] Launching Cloudflare Tunnel via ${cfBin}...`);
    const proc = spawn(cfBin, ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    activeTunnelProcess = proc;

    return new Promise((resolve) => {
      let resolved = false;

      const extractUrl = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          currentPublicUrl = match[0];
          resolve({ type: 'cloudflared', url: match[0], process: proc });
        }
      };

      proc.stdout.on('data', extractUrl);
      proc.stderr.on('data', extractUrl);

      setTimeout(() => {
        if (!resolved) {
          resolve({ type: 'cloudflared', url: currentPublicUrl || `http://localhost:${port}`, process: proc });
        }
      }, 10000);
    });
  }

  return { type: 'none', url: `http://localhost:${port}`, process: null };
}

function stopTunnel() {
  if (activeTunnelProcess) {
    try {
      activeTunnelProcess.kill();
    } catch (_) {}
    activeTunnelProcess = null;
  }
}

function getPublicUrl() {
  return currentPublicUrl;
}

module.exports = {
  startTunnel,
  stopTunnel,
  getPublicUrl,
  isAndroidOrTermux
};
