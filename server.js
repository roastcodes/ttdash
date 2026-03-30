#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const START_PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_PORT = START_PORT + 100;
const API_PREFIX = '/port/5000/api';

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

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for missing files
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(ROOT, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
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
    req.on('data', (c) => chunks.push(c));
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

// --- Server ---

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // API routes
  if (pathname === `${API_PREFIX}/usage`) {
    if (req.method === 'GET') {
      const data = readData();
      return json(res, 200, data || { daily: [], totals: {} });
    }
    if (req.method === 'DELETE') {
      try { fs.unlinkSync(DATA_FILE); } catch {}
      return json(res, 200, { success: true });
    }
  }

  if (pathname === `${API_PREFIX}/upload` && req.method === 'POST') {
    try {
      const body = await readBody(req);
      writeData(body);
      const days = body.daily ? body.daily.length : 0;
      const totalCost = body.daily
        ? body.daily.reduce((s, d) => s + (d.totalCost || 0), 0)
        : 0;
      return json(res, 200, { days, totalCost });
    } catch (e) {
      return json(res, 400, { message: 'Ungültiges JSON' });
    }
  }

  // Static file serving
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(ROOT, safePath);

  if (safePath === '/' || safePath === path.sep) {
    filePath = path.join(ROOT, 'index.html');
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
