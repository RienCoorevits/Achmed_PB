import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createStoryState } from '../shared/story-engine.js';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SHARED_DIR = path.join(ROOT_DIR, 'shared');

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function getAccessibleHost(host) {
  if (host !== '0.0.0.0' && host !== '::') {
    return host;
  }

  const networkInterfaces = os.networkInterfaces();

  for (const entries of Object.values(networkInterfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }

  return '127.0.0.1';
}

async function serveStaticFile(pathname, res) {
  const routes = new Map([
    ['/', path.join(PUBLIC_DIR, 'control.html')],
    ['/control', path.join(PUBLIC_DIR, 'control.html')],
    ['/output', path.join(PUBLIC_DIR, 'output.html')],
    ['/styles.css', path.join(PUBLIC_DIR, 'styles.css')],
    ['/control.js', path.join(PUBLIC_DIR, 'control.js')],
    ['/output.js', path.join(PUBLIC_DIR, 'output.js')],
    ['/shared/story-engine.js', path.join(SHARED_DIR, 'story-engine.js')]
  ]);

  const filePath = routes.get(pathname);

  if (!filePath) {
    return false;
  }

  const contents = await readFile(filePath);
  const contentType = CONTENT_TYPES[path.extname(filePath)] ?? 'text/plain; charset=utf-8';

  res.writeHead(200, {
    'Content-Type': contentType
  });
  res.end(contents);
  return true;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      resolve(body);
    });

    req.on('error', reject);
  });
}

function broadcastState(clients, state) {
  const payload = `event: state\ndata: ${JSON.stringify(state)}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}

export async function startServer({ host = '127.0.0.1', port = 3030, ndiController = null } = {}) {
  const clients = new Set();
  let state = createStoryState();
  let outputConfig = {
    height: 720,
    width: 1280
  };

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && requestUrl.pathname === '/api/state') {
      return json(res, 200, state);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/config') {
      const address = server.address();
      const boundPort = typeof address === 'object' && address ? address.port : port;
      const accessibleHost = getAccessibleHost(host);

      return json(res, 200, {
        host,
        port: boundPort,
        controlUrl: `http://127.0.0.1:${boundPort}/control`,
        localOutputUrl: `http://127.0.0.1:${boundPort}/output`,
        outputUrl: `http://${accessibleHost}:${boundPort}/output`,
        ndiAvailable: Boolean(ndiController),
        outputConfig
      });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/output-config') {
      return json(res, 200, outputConfig);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/output-config') {
      try {
        const rawBody = await readRequestBody(req);
        const nextConfig = JSON.parse(rawBody);
        const width = Number(nextConfig.width);
        const height = Number(nextConfig.height);

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
          return json(res, 400, {
            error: 'Invalid output dimensions.'
          });
        }

        outputConfig = {
          width,
          height
        };

        if (ndiController) {
          await ndiController.applyOutputConfig(outputConfig);
        }

        return json(res, 200, outputConfig);
      } catch {
        return json(res, 400, {
          error: 'Expected valid JSON.'
        });
      }
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/ndi/status') {
      if (!ndiController) {
        return json(res, 200, {
          available: false,
          lastError: 'NDI is only available from the Electron control app.',
          reason: 'unavailable',
          running: false
        });
      }

      return json(res, 200, ndiController.getStatus());
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/ndi/start') {
      if (!ndiController) {
        return json(res, 400, {
          error: 'NDI is only available from the Electron control app.'
        });
      }

      try {
        const rawBody = await readRequestBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        const nextStatus = await ndiController.start({
          ...payload,
          height: outputConfig.height,
          width: outputConfig.width
        });
        return json(res, 200, nextStatus);
      } catch (error) {
        return json(res, 500, {
          error: error instanceof Error ? error.message : 'Unable to start NDI stream.'
        });
      }
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/ndi/stop') {
      if (!ndiController) {
        return json(res, 400, {
          error: 'NDI is only available from the Electron control app.'
        });
      }

      const nextStatus = await ndiController.stop();
      return json(res, 200, nextStatus);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/state') {
      const rawBody = await readRequestBody(req);

      try {
        const nextState = JSON.parse(rawBody);

        if (!Array.isArray(nextState.scenes) || typeof nextState.currentIndex !== 'number') {
          return json(res, 400, {
            error: 'Invalid story state payload.'
          });
        }

        state = nextState;
        broadcastState(clients, state);
        return json(res, 200, {
          ok: true
        });
      } catch {
        return json(res, 400, {
          error: 'Expected valid JSON.'
        });
      }
    }

    if (req.method === 'GET' && requestUrl.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });

      res.write('retry: 1000\n');
      res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);

      clients.add(res);

      req.on('close', () => {
        clients.delete(res);
      });

      return;
    }

    try {
      const served = await serveStaticFile(requestUrl.pathname, res);

      if (served) {
        return;
      }
    } catch {
      return json(res, 500, {
        error: 'Unable to read requested file.'
      });
    }

    return json(res, 404, {
      error: 'Not found.'
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  const accessibleHost = getAccessibleHost(host);

  return {
    host,
    port: boundPort,
    controlUrl: `http://127.0.0.1:${boundPort}/control`,
    localOutputUrl: `http://127.0.0.1:${boundPort}/output`,
    outputUrl: `http://${accessibleHost}:${boundPort}/output`,
    async close() {
      for (const client of clients) {
        client.end();
      }

      await new Promise((resolve) => server.close(resolve));
    }
  };
}
