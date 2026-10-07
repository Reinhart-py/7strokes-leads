const http = require('http');
const net = require('net');

function startDnsBridge(port = 8888) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed: 7strokes DNS Bridge expects HTTP CONNECT');
    });

    server.on('connect', (req, clientSocket, head) => {
      const [host, rawPort] = req.url.split(':');
      const targetPort = parseInt(rawPort, 10) || 443;

      const serverSocket = net.connect(targetPort, host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head && head.length > 0) {
          serverSocket.write(head);
        }
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      serverSocket.on('error', () => {
        try { clientSocket.end(); } catch (_) {}
      });
      clientSocket.on('error', () => {
        try { serverSocket.end(); } catch (_) {}
      });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ server: null, port, alreadyRunning: true });
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      resolve({ server, port, alreadyRunning: false });
    });
  });
}

if (require.main === module) {
  startDnsBridge(8888)
    .then(({ port, alreadyRunning }) => {
      if (alreadyRunning) {
        console.log(`[✓] 7strokes DNS Bridge is already active on 127.0.0.1:${port}`);
      } else {
        console.log(`[✓] 7strokes DNS Bridge started on 127.0.0.1:${port} (Android Libc Resolver)`);
        console.log(`[*] Ngrok flag to use: --proxy-url=http://127.0.0.1:${port}`);
      }
    })
    .catch((err) => {
      console.error('[!] Failed to start DNS bridge:', err.message);
      process.exit(1);
    });
}

module.exports = { startDnsBridge };
