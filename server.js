import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import {
  MAX_PLAYERS, ROLES, PRESETS, GameError, sanitizeName, newRoom, joinRoom,
  doAction, getView, tickRoom,
} from './game/engine.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
const clients = new Map();
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{5,6}$/;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.json':'application/json; charset=utf-8' };
const sendJSON = (res, code, data) => {
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(data));
};
const error = (res, e) => sendJSON(res, e?.status || 500, { error: e instanceof GameError ? e.message : 'Có lỗi máy chủ. Hãy thử lại.' });
const readJSON = async req => {
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString('utf8');
    if (text.length > 20_000) throw new GameError('Dữ liệu yêu cầu quá lớn.', 413);
  }
  try { return JSON.parse(text || '{}'); } catch { throw new GameError('JSON không hợp lệ.'); }
};
const newCode = () => {
  let code;
  do { code = Array.from({length: 6}, () => ROOM_CHARS[randomInt(ROOM_CHARS.length)]).join(''); }
  while (rooms.has(code));
  return code;
};
const roomByCode = code => {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) throw new GameError('Không tìm thấy phòng. Kiểm tra lại mã phòng.', 404);
  return room;
};
const auth = (code, id, token) => {
  const room = roomByCode(code);
  const player = room.players.find(p => p.id === id && p.token === token);
  if (!player) throw new GameError('Phiên đăng nhập hết hiệu lực. Vui lòng vào lại phòng.', 401);
  player.lastSeen = Date.now();
  return { room, player };
};
const writeEvent = (res, name, data) => {
  if (res.destroyed || res.writableEnded) return;
  try { res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* disconnected */ }
};
const broadcast = room => {
  const byPlayer = clients.get(room.code);
  if (!byPlayer) return;
  for (const [id, connections] of byPlayer) {
    const player = room.players.find(p => p.id === id);
    if (!player) { for (const r of connections) r.end(); continue; }
    const data = getView(room, id);
    for (const res of connections) writeEvent(res, 'state', data);
  }
};
const broadcastAll = room => broadcast(room);

async function serveStatic(req, res, pathname) {
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  let decoded;
  try { decoded = decodeURIComponent(requestPath); } catch { res.writeHead(400); return res.end('Invalid URL'); }
  const absolute = resolve(PUBLIC, `.${decoded}`);
  if (!(absolute === PUBLIC || absolute.startsWith(PUBLIC + sep))) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    const data = await readFile(absolute);
    await stat(absolute);
    res.writeHead(200, {
      'Content-Type': mime[extname(absolute).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': extname(absolute) === '.html' ? 'no-cache' : 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(data);
  } catch { res.writeHead(404); res.end('Không tìm thấy tệp'); }
}

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    if (req.method === 'GET' && path === '/api/health') return sendJSON(res, 200, { ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()) });
    if (req.method === 'GET' && path === '/api/meta') return sendJSON(res, 200, { maxPlayers: MAX_PLAYERS, roles: ROLES, presets: PRESETS });
    if (req.method === 'POST' && path === '/api/create') {
      const b = await readJSON(req);
      const room = newRoom(sanitizeName(b.name), newCode());
      rooms.set(room.code, room);
      const host = room.players[0];
      return sendJSON(res, 201, { code: room.code, id: host.id, token: host.token, view: getView(room, host.id) });
    }
    if (req.method === 'POST' && path === '/api/join') {
      const b = await readJSON(req);
      const room = roomByCode(b.code);
      const player = joinRoom(room, b.name);
      broadcastAll(room);
      return sendJSON(res, 200, { code: room.code, id: player.id, token: player.token, view: getView(room, player.id) });
    }
    if (req.method === 'GET' && path === '/api/view') {
      const { room, player } = auth(url.searchParams.get('code'), url.searchParams.get('id'), url.searchParams.get('token'));
      return sendJSON(res, 200, getView(room, player.id));
    }
    if (req.method === 'POST' && path === '/api/action') {
      const b = await readJSON(req);
      const { room, player } = auth(b.code, b.id, b.token);
      doAction(room, player.id, b.action, b.data || {});
      if (room.empty) { rooms.delete(room.code); clients.delete(room.code); }
      else broadcastAll(room);
      return sendJSON(res, 200, { ok: true, phase: room.game?.phase || 'lobby' });
    }
    if (req.method === 'GET' && path === '/api/stream') {
      const { room, player } = auth(url.searchParams.get('code'), url.searchParams.get('id'), url.searchParams.get('token'));
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      if (!clients.has(room.code)) clients.set(room.code, new Map());
      const map = clients.get(room.code);
      if (!map.has(player.id)) map.set(player.id, new Set());
      map.get(player.id).add(res);
      player.connected = true;
      writeEvent(res, 'state', getView(room, player.id));
      broadcastAll(room);
      const heartbeat = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 16000);
      res.on('close', () => {
        clearInterval(heartbeat);
        const current = map.get(player.id);
        current?.delete(res);
        if (!current?.size) {
          map.delete(player.id);
          if (!player.isBot) player.connected = false;
        }
        if (!map.size) clients.delete(room.code);
        else broadcastAll(room);
      });
      return;
    }
    if (req.method === 'GET') return serveStatic(req, res, path);
    return sendJSON(res, 404, { error: 'Đường dẫn không tồn tại.' });
  } catch (e) {
    if (!(e instanceof GameError)) console.error(e);
    if (!res.headersSent) error(res, e);
    else if (!res.writableEnded) res.end();
  }
});

const interval = setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    try {
      if (tickRoom(room, now)) broadcastAll(room);
      if (now - room.activityAt > 8 * 3600 * 1000 && !clients.get(room.code)?.size) {
        rooms.delete(room.code); clients.delete(room.code);
      }
    } catch (e) { console.error('Tick room', room.code, e); }
  }
}, 900);
interval.unref?.();
if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '0.0.0.0', () => console.log(`🐺 Ma Sói 2.5D: http://localhost:${PORT}`));
}
