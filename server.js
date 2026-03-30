#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, 'dist');
const DATA_FILE = path.join(ROOT, 'data.json');
const START_PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_PORT = START_PORT + 100;
const API_PREFIX = '/port/5000/api';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getCacheControl(filePath) {
  if (filePath.includes(path.sep + 'assets' + path.sep)) {
    return 'public, max-age=31536000, immutable';
  }
  if (filePath.endsWith('.html')) {
    return 'no-cache';
  }
  return 'public, max-age=86400';
}

function serveFile(res, reqPath) {
  const ext = path.extname(reqPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(reqPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(STATIC_ROOT, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          });
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(reqPath),
    });
    res.end(data);
  });
}

// --- API helpers ---

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    req.on('data', (c) => {
      totalSize += c.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function resolveApiPath(pathname) {
  if (pathname.startsWith(API_PREFIX + '/')) {
    return pathname.slice(API_PREFIX.length);
  }
  if (pathname === API_PREFIX) {
    return '/';
  }
  if (pathname.startsWith('/api/')) {
    return pathname.slice(4);
  }
  if (pathname === '/api') {
    return '/';
  }
  return null;
}

// --- Server ---

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // API routing
  const apiPath = resolveApiPath(pathname);

  if (apiPath === '/usage') {
    if (req.method === 'GET') {
      const data = readData();
      return json(res, 200, data || { daily: [], totals: {} });
    }
    if (req.method === 'DELETE') {
      try { fs.unlinkSync(DATA_FILE); } catch {}
      return json(res, 200, { success: true });
    }
    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/upload') {
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        writeData(body);
        const days = body.daily ? body.daily.length : 0;
        const totalCost = body.daily
          ? body.daily.reduce((s, d) => s + (d.totalCost || 0), 0)
          : 0;
        return json(res, 200, { days, totalCost });
      } catch (e) {
        const status = e.message === 'Payload too large' ? 413 : 400;
        const message = e.message === 'Payload too large'
          ? 'Datei zu gross (max. 10 MB)'
          : 'Ungültiges JSON';
        return json(res, status, { message });
      }
    }
    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath !== null) {
    return json(res, 404, { message: 'API-Endpunkt nicht gefunden' });
  }

  // Static file serving
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(STATIC_ROOT, safePath);

  if (safePath === '/' || safePath === path.sep) {
    filePath = path.join(STATIC_ROOT, 'index.html');
  }

  serveFile(res, filePath);
});

function tryListen(port) {
  if (port > MAX_PORT) {
    console.error(`Kein freier Port gefunden (${START_PORT}-${MAX_PORT})`);
    process.exit(1);
  }

  server.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} belegt, versuche ${port + 1}...`);
      tryListen(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

tryListen(START_PORT);
