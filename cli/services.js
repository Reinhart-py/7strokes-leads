const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const { loadConfig } = require('./config');
const { startTunnel, stopTunnel, getPublicUrl } = require('./tunnel');
const { startDnsBridge } = require('./bridge');

let backendProc = null;
let frontendProc = null;
let bridgeInstance = null;

function pingHttp(port, pathName = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${pathName}`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkBackendBuilt() {
  const distIndexPath = path.join(__dirname, '../backend/dist/index.js');
  if (!fs.existsSync(distIndexPath)) {
    console.log('[*] Compiling backend code...');
    execSync('npm run build', { cwd: path.join(__dirname, '../backend'), stdio: 'inherit' });
  }
}

async function isBackendRunning(port = 4000) {
  if (backendProc && !backendProc.killed) return true;
  return await pingHttp(port, '/health');
}

async function isFrontendRunning(port = 3000) {
  if (frontendProc && !frontendProc.killed) return true;
  return await pingHttp(port, '/');
}

function isTunnelRunning() {
  return Boolean(getPublicUrl());
}

function isBridgeRunning() {
  return Boolean(bridgeInstance && bridgeInstance.server && bridgeInstance.server.listening);
}

async function startBackendService(portOverride = null) {
  const config = loadConfig();
  const port = portOverride || config.backendPort || 4000;

  const alreadyRunning = await isBackendRunning(port);
  if (alreadyRunning) {
    return { ok: true, message: `Backend is already running on port ${port}`, port };
  }

  checkBackendBuilt();

  const proc = spawn('node', ['dist/index.js'], {
    cwd: path.join(__dirname, '../backend'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) }
  });

  backendProc = proc;

  proc.on('error', (err) => {
    console.error('[!] Backend process error:', err.message);
  });

  proc.on('exit', () => {
    backendProc = null;
  });

  let running = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    running = await pingHttp(port, '/health');
    if (running) break;
  }

  if (running) {
    return { ok: true, message: `Backend started successfully on port ${port}`, port };
  } else {
    return { ok: false, message: `Backend process started but port ${port} did not respond` };
  }
}

function stopBackendService() {
  if (backendProc) {
    try {
      backendProc.kill();
    } catch (_) {}
    backendProc = null;
    return { ok: true, message: 'Backend service stopped' };
  }
  return { ok: true, message: 'Backend was not running' };
}

async function startFrontendService(port = 3000) {
  const alreadyRunning = await isFrontendRunning(port);
  if (alreadyRunning) {
    return { ok: true, message: `Frontend is already running on http://localhost:${port}`, port };
  }

  const frontendDir = path.join(__dirname, '../frontend');
  const nextBin = path.join(frontendDir, 'node_modules/next/dist/bin/next');

  if (!fs.existsSync(nextBin)) {
    return { ok: false, message: 'Next.js dependencies not found in frontend directory' };
  }

  const proc = spawn('node', [nextBin, 'dev', '-p', String(port)], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  frontendProc = proc;

  proc.on('error', (err) => {
    console.error('[!] Frontend process error:', err.message);
  });

  proc.on('exit', () => {
    frontendProc = null;
  });

  let running = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 600));
    running = await pingHttp(port, '/');
    if (running) break;
  }

  if (running) {
    return { ok: true, message: `Frontend started on http://localhost:${port}`, port };
  } else {
    return { ok: true, message: `Frontend process launched on port ${port}` };
  }
}

function stopFrontendService() {
  if (frontendProc) {
    try {
      frontendProc.kill();
    } catch (_) {}
    frontendProc = null;
    return { ok: true, message: 'Frontend service stopped' };
  }
  return { ok: true, message: 'Frontend was not running' };
}

async function startTunnelService(portOverride = null) {
  const config = loadConfig();
  const port = portOverride || config.backendPort || 4000;

  if (isTunnelRunning()) {
    return { ok: true, message: `Tunnel is already active: ${getPublicUrl()}`, url: getPublicUrl() };
  }

  try {
    const res = await startTunnel(port, config);
    if (res && res.url) {
      return { ok: true, message: `Tunnel connected: ${res.url}`, url: res.url };
    }
    return { ok: false, message: 'Tunnel failed to establish public URL' };
  } catch (err) {
    return { ok: false, message: `Tunnel error: ${err.message}` };
  }
}

function stopTunnelService() {
  stopTunnel();
  return { ok: true, message: 'Tunnel disconnected' };
}

async function startBridgeService(port = 8888) {
  if (isBridgeRunning()) {
    return { ok: true, message: `DNS Bridge is already running on port ${bridgeInstance.port}` };
  }
  try {
    const b = await startDnsBridge(port);
    bridgeInstance = b;
    return { ok: true, message: `DNS Bridge started on 127.0.0.1:${b.port}`, port: b.port };
  } catch (err) {
    return { ok: false, message: `DNS Bridge error: ${err.message}` };
  }
}

function stopBridgeService() {
  if (bridgeInstance && bridgeInstance.server) {
    try {
      bridgeInstance.server.close();
    } catch (_) {}
    bridgeInstance = null;
    return { ok: true, message: 'DNS Bridge stopped' };
  }
  return { ok: true, message: 'DNS Bridge was not active' };
}

async function startAllServices() {
  const config = loadConfig();
  const port = config.backendPort || 4000;

  const backendRes = await startBackendService(port);
  const tunnelRes = await startTunnelService(port);
  const frontendRes = await startFrontendService(3000);

  return {
    backend: backendRes,
    tunnel: tunnelRes,
    frontend: frontendRes
  };
}

function stopAllServices() {
  const b = stopBackendService();
  const t = stopTunnelService();
  const f = stopFrontendService();
  const d = stopBridgeService();

  return {
    backend: b,
    tunnel: t,
    frontend: f,
    bridge: d
  };
}

async function getServicesStatus() {
  const config = loadConfig();
  const port = config.backendPort || 4000;

  const backend = await isBackendRunning(port);
  const frontend = await isFrontendRunning(3000);
  const tunnel = isTunnelRunning();
  const tunnelUrl = getPublicUrl();
  const bridge = isBridgeRunning();

  return {
    backend,
    backendPort: port,
    frontend,
    frontendPort: 3000,
    tunnel,
    tunnelUrl,
    bridge
  };
}

async function restartAllServices() {
  stopAllServices();
  await new Promise((r) => setTimeout(r, 1200));
  return await startAllServices();
}

module.exports = {
  isBackendRunning,
  isFrontendRunning,
  isTunnelRunning,
  isBridgeRunning,
  startBackendService,
  stopBackendService,
  startFrontendService,
  stopFrontendService,
  startTunnelService,
  stopTunnelService,
  startBridgeService,
  stopBridgeService,
  startAllServices,
  stopAllServices,
  restartAllServices,
  getServicesStatus
};
