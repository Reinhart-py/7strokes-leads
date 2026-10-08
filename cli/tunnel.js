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

function ensureNgrokConfig(token = '') {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    if (!homeDir) return;

    let ymlDir = path.join(homeDir, '.config/ngrok');
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
      ymlDir = path.join(process.env.LOCALAPPDATA, 'ngrok');
    }
    fs.mkdirSync(ymlDir, { recursive: true });
    const ymlPath = path.join(ymlDir, 'ngrok.yml');

    let yml = 'version: "3"\nagent:\n  crl_noverify: true\n  dns_resolver_ips:\n    - 8.8.8.8\n    - 1.1.1.1\n';
    if (token) {
      yml += `  authtoken: ${token}\n`;
    }
    fs.writeFileSync(ymlPath, yml, 'utf8');
  } catch (err) {
    console.warn('[!] Note writing ngrok.yml:', err.message);
  }
}

function findCloudflaredBinary() {
  const localToolsPath = path.join(__dirname, '../tools/cloudflared.exe');
  if (fs.existsSync(localToolsPath)) return localToolsPath;

  const localToolsUnix = path.join(__dirname, '../tools/cloudflared');
  if (fs.existsSync(localToolsUnix)) return localToolsUnix;

  try {
    const whichCmd = process.platform === 'win32' ? 'where cloudflared' : 'which cloudflared';
    const found = execSync(whichCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (found) return found;
  } catch (_) {}

  return null;
}

function findNgrokBinary() {
  const localToolsPath = path.join(__dirname, '../tools/ngrok.exe');
  if (fs.existsSync(localToolsPath)) return localToolsPath;

  const localToolsUnix = path.join(__dirname, '../tools/ngrok');
  if (fs.existsSync(localToolsUnix)) return localToolsUnix;

  try {
    const whichCmd = process.platform === 'win32' ? 'where ngrok' : 'which ngrok';
    const found = execSync(whichCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (found) return found;
  } catch (_) {}

  return null;
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

  ensureNgrokConfig(authtoken);

  const ngrokBin = findNgrokBinary();
  const cfBin = findCloudflaredBinary();

  if (tunnelType === 'ngrok' || (ngrokBin && !cfBin) || (authtoken && domain)) {
    if (!ngrokBin) {
      console.warn('[!] ngrok binary not found. Falling back to Cloudflare tunnel.');
    } else {
      if (authtoken) {
        try {
          execSync(`"${ngrokBin}" config add-authtoken ${authtoken}`, { stdio: 'ignore' });
        } catch (_) {}
      }

      const args = ['http', String(port), '--log=stdout'];

      if (domain) {
        args.push(`--url=${domain}`);
      }

      console.log(`[*] Launching ngrok: ${ngrokBin} ${args.join(' ')}`);
      const proc = spawn(ngrokBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      activeTunnelProcess = proc;

      let lastError = '';
      proc.stdout.on('data', (d) => {
        const text = d.toString();
        if (text.includes('ERR_') || text.includes('error')) {
          lastError += text;
        }
      });
      proc.stderr.on('data', (d) => {
        lastError += d.toString();
      });

      proc.on('error', (err) => {
        console.warn('[!] ngrok process error:', err.message);
      });

      const url = await pollNgrokUrl(25, 1000);
      if (url) {
        currentPublicUrl = url;
        return { type: 'ngrok', url, process: proc };
      } else if (lastError) {
        console.warn('[!] ngrok output note:', lastError.trim());
      }
    }
  }

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
  currentPublicUrl = null;
}

function getPublicUrl() {
  return currentPublicUrl;
}

module.exports = {
  startTunnel,
  stopTunnel,
  getPublicUrl,
  isAndroidOrTermux,
  ensureNgrokConfig
};
