import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest', '.txt']);
const gzCache = new Map();

function getGzipped(file, etag) {
  const key = `${file}:${etag}`;
  if (gzCache.has(key)) return gzCache.get(key);
  const gz = zlib.gzipSync(fs.readFileSync(file), { level: 6 });
  if (gzCache.size >= 64) gzCache.delete(gzCache.keys().next().value);
  gzCache.set(key, gz);
  return gz;
}

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function send(res, status, body, extraHeaders = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(json);
}

/** Parse small/large JSON request body safely with byte-limit protection. */
export function readJSON(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      if (tooBig) return;
      size += c.length;
      if (size > limit) {
        tooBig = true;
        chunks.length = 0;
        reject(new HttpError(413, "So'rov juda katta."));
        req.pause();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) return;
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, "JSON noto'g'ri."));
      }
    });
    req.on('error', reject);
  });
}

/** Strict Origin check that treats invalid/null Origin headers as 403 Forbidden rather than 500. */
export function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host !== req.headers.host) {
      throw new HttpError(403, "Ruxsat yo'q.");
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(403, "Ruxsat yo'q.");
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function streamFile(req, res, filePath, opts = {}) {
  const stream = fs.createReadStream(filePath, opts);
  const cleanup = () => {
    if (!stream.destroyed) stream.destroy();
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
  stream.on('error', (err) => {
    cleanup();
    if (!res.headersSent) {
      res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    if (!res.writableEnded) res.end();
  });
  stream.pipe(res);
}

/** Hardened static file server with traversal guard, Range 206/416 support, ETag 304, and FD-safe streaming. */
export function serveStatic(req, res, pathname, staticDir) {
  if (!fs.existsSync(staticDir)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Frontend topilmadi. Avval frontend papkasida "npm run build" ni ishga tushiring.');
  }
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    return res.end("Noto'g'ri manzil");
  }
  if (rel.includes('\0')) {
    res.writeHead(400);
    return res.end("Noto'g'ri manzil");
  }

  // Compare with trailing path separator so "../dist-secret" never matches "dist".
  const root = path.resolve(staticDir);
  let file = path.resolve(root, `.${rel.startsWith('/') || rel.startsWith('\\') ? '' : path.sep}${rel}`);
  const inside = file === root || file.startsWith(root + path.sep);
  const hidden = path.relative(root, file).split(path.sep).some((seg) => seg.startsWith('.'));
  if (!inside || hidden) {
    res.writeHead(404);
    return res.end('Topilmadi');
  }

  let st;
  try {
    st = fs.statSync(file);
  } catch {
    st = null;
  }
  if (!st || st.isDirectory() || !st.isFile()) {
    if (path.extname(rel)) {
      res.writeHead(404);
      return res.end('Topilmadi');
    }
    file = path.join(root, 'index.html');
    try {
      st = fs.statSync(file);
    } catch {
      res.writeHead(404);
      return res.end('Topilmadi');
    }
  }

  const ext = path.extname(file).toLowerCase();
  const immutable = file.includes(`${path.sep}assets${path.sep}`) || file.includes(`${path.sep}fonts${path.sep}`);
  const size = st.size;
  const etag = `W/"${size.toString(16)}-${Math.trunc(st.mtimeMs).toString(16)}"`;
  const baseHeaders = {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Last-Modified': st.mtime.toUTCString(),
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  };

  const range = req.headers.range;
  if (range && size > 0) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (!m[1] && !m[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    if (!m[1] && m[2]) end = size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    end = Math.min(end, size - 1);
    res.writeHead(206, { ...baseHeaders, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return streamFile(req, res, file, { start, end });
  }

  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch.split(',').map((s) => s.trim()).includes(etag)) {
    res.writeHead(304, { ...baseHeaders, Vary: 'Accept-Encoding' });
    return res.end();
  }

  const acceptGz = req.method === 'GET' && !range && size >= 1024 && COMPRESSIBLE.has(ext) && /\bgzip\b/i.test(req.headers['accept-encoding'] || '');
  if (acceptGz) {
    try {
      const gz = getGzipped(file, etag);
      res.writeHead(200, { ...baseHeaders, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', 'Content-Length': gz.length });
      return res.end(gz);
    } catch {
      // Fallback to raw streaming if compression read fails
    }
  }

  res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  return streamFile(req, res, file);
}
