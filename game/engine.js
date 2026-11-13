import { randomBytes } from 'node:crypto';

export const MAX_PLAYERS = 30;
export const ROLES = {
  villager: { name: 'Dân Làng', icon: '🏡', side: 'village', description: 'Tìm ra Ma Sói bằng thảo luận và bỏ phiếu ban ngày.', accent: '#78bdf1' },
  wolf: { name: 'Ma Sói', icon: '🐺', side: 'wolves', description: 'Cùng đồng đội chọn một nạn nhân mỗi đêm; tránh bị dân làng phát hiện.', accent: '#ed6264' },
  seer: { name: 'Tiên Tri', icon: '🔮', side: 'village', description: 'Mỗi đêm soi một người để biết họ thuộc phe Sói hay không.', accent: '#be8eff' },
  guard: { name: 'Bảo Vệ', icon: '🛡️', side: 'village', description: 'Mỗi đêm bảo vệ một người khỏi Sói; không bảo vệ cùng người hai đêm liền.', accent: '#76bdfb' },
  witch: { name: 'Phù Thủy', icon: '🧪', side: 'village', description: 'Có một bình cứu và một bình độc, mỗi bình dùng tối đa một lần.', accent: '#e4b46c' },
  hunter: { name: 'Thợ Săn', icon: '🏹', side: 'village', description: 'Nếu bị Sói cắn hoặc bị treo cổ, có thể bắn hạ một người trước khi chết.', accent: '#91ddb4' },
};
export const ROLE_KEYS = Object.keys(ROLES);
export const PRESETS = {
  basic: { label: 'Cơ bản', description: 'Dân làng & Ma Sói' },
  mystic: { label: 'Huyền bí', description: 'Thêm Tiên Tri, Bảo Vệ, Phù Thủy' },
  advanced: { label: 'Đầy đủ', description: 'Tất cả 6 loại vai' },
};
export const NIGHT_STEPS = ['guard', 'wolf', 'seer', 'witch'];
export const CONFIG = { nightStepMs: 28000, discussionMs: 140000, votingMs: 55000, hunterMs: 30000, interludeMs: 12000 };
const BOT_NAMES = [
  'SơnN', 'HuyP', 'MinhK', 'LanAnh', 'QuangH', 'ThuTrang', 'HoàngD', 'MaiLinh', 'ĐứcT', 'TuấnV',
  'NgọcHà', 'BìnhAn', 'KiềuMy', 'HảiĐăng', 'NhưQuỳnh', 'ThảoNhi', 'TrọngTín', 'HàVy', 'KhánhLinh',
  'BảoLong', 'AnNhiên', 'PhươngAnh', 'HoàiNam', 'ĐứcMinh', 'ThùyChi', 'HuyềnTrang', 'GiaHưng', 'MaiChi', 'QuỳnhAnh'
];

export class GameError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const fail = (msg, status) => { throw new GameError(msg, status); };
const rand = len => randomBytes(len).toString('hex');
const time = () => Date.now();
const pick = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const roleDeckSum = deck => ROLE_KEYS.reduce((s, r) => s + (deck[r] || 0), 0);
const aliveIds = (room) => room.players.filter(p => room.game?.alive.includes(p.id)).map(p => p.id);
const byId = (room, id) => room.players.find(p => p.id === id);
const isWolf = (g, id) => g.roles[id] === 'wolf';
const say = (room, message, style = 'info') => {
  if (!room.game) return;
  room.game.events.unshift({ id: rand(4), message, style, at: time() });
  room.game.events.splice(40);
};

export function sanitizeName(name) {
  if (typeof name !== 'string') fail('Vui lòng nhập tên người chơi.');
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (cleaned.length < 2) fail('Tên cần có ít nhất 2 ký tự.');
  if (/[<>\x00-\x1f]/.test(cleaned)) fail('Tên chứa ký tự không hợp lệ.');
  return cleaned;
}
export function newPlayer(name, isBot = false) {
  return { id: rand(6), token: rand(20), name: sanitizeName(name), ready: !!isBot,
    isBot, connected: true, lastSeen: time(), joinedAt: time(), avatar: Math.floor(Math.random() * 8) };
}
export function defaultDeck(n, preset = 'advanced') {
  n = Math.max(5, Math.min(30, n));
  const deck = { villager: 0, wolf: Math.max(1, Math.floor(n / 4.5)), seer: 0, guard: 0, witch: 0, hunter: 0 };
  if (preset !== 'basic') {
    if (n >= 6) deck.seer = 1;
    if (n >= 7) deck.guard = 1;
    if (n >= 8) deck.witch = 1;
    if (preset === 'advanced' && n >= 9) deck.hunter = 1;
  }
  deck.villager = n - roleDeckSum(deck);
  return deck;
}
export function newRoom(hostName, code) {
  const host = newPlayer(hostName);
  host.ready = true;
  return { code, hostId: host.id, createdAt: time(), activityAt: time(), players: [host],
    settings: { preset: 'advanced', automatic: true, deck: defaultDeck(5), maxPlayers: MAX_PLAYERS },
    demoRole: 'seer', chat: [], game: null };
}
export function joinRoom(room, name) {
  if (room.game) fail('Ván đã bắt đầu. Hãy đợi kết thúc để tham gia ván tiếp theo.');
  if (room.players.length >= MAX_PLAYERS) fail('Phòng đã đủ 30 người.');
  const clean = sanitizeName(name);
  if (room.players.some(p => p.name.toLowerCase() === clean.toLowerCase())) fail('Tên này đã có trong phòng.');
  const player = newPlayer(clean);
  room.players.push(player);
  syncDeck(room);
  return player;
}
function syncDeck(room) {
  if (room.settings.automatic) room.settings.deck = defaultDeck(Math.max(5, room.players.length), room.settings.preset);
}
function requireHost(room, actorId) { if (room.hostId !== actorId) fail('Chỉ chủ phòng mới thực hiện được thao tác này.', 403); }
function requireLobby(room) { if (room.game) fail('Không thể thay đổi khi ván đã bắt đầu.'); }
function requireAlive(room, actorId) { if (!room.game.alive.includes(actorId)) fail('Bạn đã bị loại, không thể thực hiện thao tác này.'); }
function validTarget(room, target, allowSelf = true) {
  if (!target || !room.game.alive.includes(target)) fail('Hãy chọn một người chơi còn sống.');
  return target;
}
function setPhase(game, phase, duration) { game.phase = phase; game.phaseStartedAt = time(); game.phaseEndsAt = time() + duration; }

export function startGame(room, actorId, config = CONFIG) {
  requireHost(room, actorId); requireLobby(room);
  if (room.players.length < 5) fail('Cần tối thiểu 5 người để bắt đầu. Có thể dùng “Thêm Bot thử game”.');
  if (!room.players.every(p => p.ready || p.id === room.hostId)) fail('Vẫn còn người chơi chưa sẵn sàng.');
  const deck = room.settings.deck;
  if (roleDeckSum(deck) !== room.players.length) fail(`Bộ bài có ${roleDeckSum(deck)} lá; phòng hiện có ${room.players.length} người. Hãy chỉnh cho khớp.`);
  if (!deck.wolf || deck.wolf >= room.players.length / 2) fail('Bộ bài cần ít nhất 1 Sói và số Sói phải ít hơn một nửa tổng người chơi.');
  if (deck.villager < 1) fail('Cần ít nhất một lá Dân Làng.');
  const cards = shuffle(ROLE_KEYS.flatMap(role => Array(deck[role] || 0).fill(role)));
  const roles = Object.fromEntries(room.players.map((p, i) => [p.id, cards[i]]));
  if (room.players.some(p => p.isBot) && room.players.filter(p => !p.isBot).length === 1 && room.demoRole) {
    const hostRole = roles[room.hostId];
    const want = room.demoRole;
    if (hostRole !== want) {
      const swap = room.players.find(p => p.id !== room.hostId && roles[p.id] === want);
      if (swap) { roles[room.hostId] = want; roles[swap.id] = hostRole; }
    }
  }
  room.game = { phase: 'night', phaseEndsAt: 0, phaseStartedAt: 0, night: 0, day: 0, nightStep: null,
    roles, alive: room.players.map(p => p.id), voteMap: {}, wolfVotes: {}, guardTarget: null, guardLast: null,
    wolvesTarget: null, seerTarget: null, seerResults: {}, witchChoice: null, witchPoisonTarget: null,
    witchResources: { heal: true, poison: true }, acted: {}, events: [], winner: null,
    lastAnnouncement: '', lastDeaths: [], lastVoted: null, hunterAfter: null, hunterId: null,
    config: { ...CONFIG, ...config }, startedAt: time(),
  };
  say(room, 'Trò chơi bắt đầu. Mỗi người đã nhận một lá vai trò bí mật.', 'special');
  enterNight(room);
}

function activeActor(room, role) {
  return room.players.find(p => room.game.roles[p.id] === role && room.game.alive.includes(p.id)) || null;
}
function isActiveStep(room, step) {
  const g = room.game;
  if (step === 'wolf') return g.alive.some(id => isWolf(g, id));
  if (step === 'witch') {
    return !!activeActor(room, 'witch') && (g.witchResources.heal || g.witchResources.poison);
  }
  return !!activeActor(room, step);
}
function enterNight(room) {
  const g = room.game;
  g.night++;
  g.nightStep = null;
  g.wolfVotes = {}; g.guardTarget = null; g.wolvesTarget = null; g.seerTarget = null;
  g.acted = {}; g.witchChoice = null; g.witchPoisonTarget = null; g.voteMap = {};
  setPhase(g, 'night', g.config.nightStepMs);
  say(room, `Đêm ${g.night} buông xuống. Cả làng chìm vào giấc ngủ.`, 'night');
  nextNightStep(room);
}
function chooseWolfTarget(room) {
  const votes = Object.values(room.game.wolfVotes).filter(Boolean);
  if (!votes.length) return null;
  const counts = {};
  votes.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const best = Math.max(...Object.values(counts));
  return pick(Object.keys(counts).filter(id => counts[id] === best));
}
function nextNightStep(room) {
  const g = room.game;
  const idx = g.nightStep === null ? -1 : NIGHT_STEPS.indexOf(g.nightStep);
  if (g.nightStep === 'wolf') g.wolvesTarget = chooseWolfTarget(room);
  for (let i = idx + 1; i < NIGHT_STEPS.length; i++) {
    if (isActiveStep(room, NIGHT_STEPS[i])) {
      g.nightStep = NIGHT_STEPS[i];
      g.acted = {};
      setPhase(g, 'night', g.config.nightStepMs);
      return;
    }
  }
  resolveNight(room);
}
function maybeAdvanceNight(room) {
  const g = room.game;
  if (g.nightStep === 'wolf') {
    const wolves = g.alive.filter(id => isWolf(g, id));
    if (wolves.every(id => Object.hasOwn(g.wolfVotes, id))) nextNightStep(room);
  } else {
    const actor = activeActor(room, g.nightStep);
    if (actor && g.acted[actor.id]) nextNightStep(room);
  }
}
function markDead(room, id) { if (!id || !room.game.alive.includes(id)) return false; room.game.alive = room.game.alive.filter(x => x !== id); return true; }
function checkWinner(room) {
  const g = room.game;
  const wolves = g.alive.filter(id => isWolf(g, id)).length;
  const villagers = g.alive.length - wolves;
  if (wolves === 0) { finishGame(room, 'village'); return true; }
  if (wolves >= villagers) { finishGame(room, 'wolves'); return true; }
  return false;
}
function finishGame(room, side) {
  const g = room.game;
  g.winner = side;
  setPhase(g, 'ended', 0);
  g.phaseEndsAt = 0;
  g.lastAnnouncement = side === 'village' ? 'PHE DÂN LÀNG CHIẾN THẮNG!' : 'PHE MA SÓI CHIẾN THẮNG!';
  say(room, g.lastAnnouncement, 'win');
}
function startHunter(room, id, after) {
  const g = room.game;
  g.hunterId = id;
  g.hunterAfter = after;
  setPhase(g, 'hunter', g.config.hunterMs);
  say(room, `${byId(room, id)?.name || 'Thợ Săn'} có quyền bắn một phát cuối cùng!`, 'danger');
}
function enterDiscussion(room) {
  const g = room.game;
  g.day = g.night;
  g.botChatterCount = 0; g.lastBotChat = 0;
  setPhase(g, 'discussion', g.config.discussionMs);
  say(room, `Ngày ${g.day}: thảo luận để tìm ra Ma Sói.`, 'day');
}
function enterInterlude(room) {
  const g = room.game;
  setPhase(g, 'interlude', g.config.interludeMs);
}
function continueAfterDeath(room, after, hunterId = null) {
  const g = room.game;
  if (hunterId && g.roles[hunterId] === 'hunter') return startHunter(room, hunterId, after);
  if (checkWinner(room)) return;
  if (after === 'discussion') enterDiscussion(room);
  else enterInterlude(room);
}
function resolveNight(room) {
  const g = room.game;
  const dead = [];
  const wolfKilled = g.wolvesTarget && g.wolvesTarget !== g.guardTarget && g.witchChoice !== 'heal' ? g.wolvesTarget : null;
  if (wolfKilled && markDead(room, wolfKilled)) dead.push(wolfKilled);
  if (g.witchPoisonTarget && markDead(room, g.witchPoisonTarget)) dead.push(g.witchPoisonTarget);
  g.lastDeaths = dead;
  g.lastAnnouncement = dead.length ? `Trời sáng! ${dead.map(id => byId(room, id)?.name).join(', ')} đã không qua khỏi đêm nay.` : 'Trời sáng! Đêm qua cả làng đều bình an.';
  say(room, g.lastAnnouncement, dead.length ? 'danger' : 'day');
  const hunterKilledByWolf = dead.find(id => g.roles[id] === 'hunter' && id === wolfKilled);
  continueAfterDeath(room, 'discussion', hunterKilledByWolf);
}
function beginVoting(room) {
  const g = room.game;
  if (g.phase !== 'discussion') return fail('Chưa đến giai đoạn bỏ phiếu.');
  g.voteMap = {};
  setPhase(g, 'voting', g.config.votingMs);
  say(room, 'Bắt đầu bỏ phiếu! Chọn người bạn nghi là Ma Sói.', 'day');
}
function resolveVoting(room) {
  const g = room.game;
  if (g.phase !== 'voting') return;
  const counts = {};
  Object.values(g.voteMap).filter(Boolean).forEach(id => counts[id] = (counts[id] || 0) + 1);
  const top = Object.values(counts).length ? Math.max(...Object.values(counts)) : 0;
  const leaders = Object.keys(counts).filter(id => counts[id] === top);
  const eliminated = leaders.length === 1 ? leaders[0] : null;
  g.lastVoted = eliminated;
  if (eliminated) {
    markDead(room, eliminated);
    g.lastAnnouncement = `${byId(room, eliminated)?.name} nhận nhiều phiếu nhất và bị loại khỏi làng.`;
  } else g.lastAnnouncement = 'Phiếu hòa hoặc không có phiếu hợp lệ. Không ai bị loại.';
  say(room, g.lastAnnouncement, eliminated ? 'danger' : 'info');
  continueAfterDeath(room, 'interlude', eliminated);
}
function resolveHunter(room, target) {
  const g = room.game;
  if (target) {
    markDead(room, target);
    say(room, `Thợ Săn đã bắn hạ ${byId(room, target)?.name}.`, 'danger');
  } else say(room, 'Thợ Săn đã bỏ qua phát bắn cuối.', 'info');
  const after = g.hunterAfter;
  g.hunterId = null;
  g.hunterAfter = null;
  continueAfterDeath(room, after);
}
function eligibleAbility(room, actorId) {
  const g = room.game;
  return (g.phase === 'night' && g.alive.includes(actorId) && (g.roles[actorId] === g.nightStep ||
    (g.nightStep === 'wolf' && isWolf(g, actorId))));
}
function performNightAction(room, actorId, data) {
  const g = room.game;
  if (!eligibleAbility(room, actorId)) fail('Chưa tới lượt sử dụng kỹ năng của bạn.');
  const step = g.nightStep, choice = data.choice, target = data.target;
  if (step === 'guard') {
    if (choice === 'skip') { g.guardTarget = null; }
    else {
      validTarget(room, target);
      if (g.guardLast === target) fail('Bảo Vệ không được bảo vệ cùng người hai đêm liên tiếp.');
      g.guardTarget = target; g.guardLast = target;
    }
  } else if (step === 'wolf') {
    if (choice !== 'skip') {
      validTarget(room, target);
      if (isWolf(g, target)) fail('Ma Sói không thể tấn công đồng đội.');
    }
    g.wolfVotes[actorId] = choice === 'skip' ? null : target;
  } else if (step === 'seer') {
    if (choice !== 'skip') {
      validTarget(room, target);
      if (target === actorId) fail('Tiên Tri không thể tự soi mình.');
      const wolf = isWolf(g, target);
      g.seerTarget = target;
      g.seerResults[actorId] = { night: g.night, name: byId(room, target)?.name, wolf, target };
    }
  } else if (step === 'witch') {
    if (choice === 'heal') {
      if (!g.witchResources.heal) fail('Bình cứu đã được sử dụng.');
      if (!g.wolvesTarget) fail('Đêm nay Sói không chọn nạn nhân để cứu.');
      g.witchResources.heal = false;
      g.witchChoice = 'heal';
    } else if (choice === 'poison') {
      if (!g.witchResources.poison) fail('Bình độc đã được sử dụng.');
      validTarget(room, target);
      g.witchResources.poison = false;
      g.witchChoice = 'poison'; g.witchPoisonTarget = target;
    } else if (choice !== 'skip') fail('Lựa chọn kỹ năng không hợp lệ.');
  }
  g.acted[actorId] = true;
  maybeAdvanceNight(room);
}

export function doAction(room, actorId, action, data = {}) {
  const player = byId(room, actorId);
  if (!player) fail('Người chơi không tồn tại.', 404);
  player.lastSeen = time(); room.activityAt = time();
  if (action === 'chat') {
    if (!['lobby', 'discussion', 'voting', 'interlude'].includes(room.game?.phase || 'lobby')) fail('Không thể trò chuyện trong giai đoạn này.');
    if (room.game && !room.game.alive.includes(actorId)) fail('Người chơi đã bị loại không thể gửi tin cho người còn sống.');
    const content = typeof data.text === 'string' ? data.text.trim().slice(0, 200) : '';
    if (!content || /[\x00-\x08\x0b-\x1f]/.test(content)) fail('Tin nhắn không hợp lệ.');
    if (player.lastChat && time() - player.lastChat < 1100) fail('Vui lòng gửi tin chậm hơn.');
    player.lastChat = time();
    room.chat.push({ id: rand(5), userId: actorId, name: player.name, text: content, at: time() });
    room.chat.splice(0, Math.max(0, room.chat.length - 80));
    return;
  }
  if (action === 'leave') {
    if (room.game) fail('Đang trong ván. Có thể thoát trang và vào lại bằng tên/phiên cũ.');
    room.players = room.players.filter(p => p.id !== actorId);
    if (!room.players.length) room.empty = true;
    else if (room.hostId === actorId) { room.hostId = room.players[0].id; room.players[0].ready = true; }
    syncDeck(room);
    return;
  }
  if (action === 'ready') {
    requireLobby(room);
    player.ready = actorId === room.hostId ? true : !player.ready;
    return;
  }
  if (action === 'setPreset') {
    requireHost(room, actorId); requireLobby(room);
    if (!PRESETS[data.preset]) fail('Bộ bài không hợp lệ.');
    room.settings.preset = data.preset; room.settings.automatic = true; syncDeck(room);
    return;
  }
  if (action === 'setDeck') {
    requireHost(room, actorId); requireLobby(room);
    if (!data.deck || typeof data.deck !== 'object') fail('Bộ bài không hợp lệ.');
    const deck = {};
    ROLE_KEYS.forEach(role => {
      const v = data.deck[role];
      if (!Number.isInteger(v) || v < 0 || v > MAX_PLAYERS) fail('Số lá phải là số nguyên từ 0 đến 30.');
      deck[role] = v;
    });
    if (roleDeckSum(deck) > MAX_PLAYERS) fail('Không thể có hơn 30 lá.');
    room.settings.deck = deck; room.settings.automatic = false;
    return;
  }
  if (action === 'demoRole') {
    requireHost(room, actorId); requireLobby(room);
    if (!ROLES[data.role]) fail('Vai trò không tồn tại.');
    room.demoRole = data.role;
    return;
  }
  if (action === 'addBots') {
    requireHost(room, actorId); requireLobby(room);
    const count = Math.min(MAX_PLAYERS - room.players.length, Math.max(1, Math.min(29, Number(data.count) || 9)));
    for (let i = 0; i < count; i++) {
      const namesUsed = new Set(room.players.map(p => p.name));
      const name = BOT_NAMES.find(n => !namesUsed.has(n)) || `Bot ${room.players.length + 1}`;
      room.players.push(newPlayer(name, true));
    }
    syncDeck(room);
    return;
  }
  if (action === 'removeBots') {
    requireHost(room, actorId); requireLobby(room);
    room.players = room.players.filter(p => !p.isBot);
    syncDeck(room);
    return;
  }
  if (action === 'kick') {
    requireHost(room, actorId); requireLobby(room);
    if (data.target === room.hostId) fail('Không thể mời chủ phòng ra ngoài.');
    room.players = room.players.filter(p => p.id !== data.target);
    syncDeck(room);
    return;
  }
  if (action === 'start') return startGame(room, actorId);
  if (!room.game) fail('Ván chưa bắt đầu.');
  const g = room.game;
  if (action === 'nightAction') return performNightAction(room, actorId, data);
  if (action === 'forceVote') {
    requireHost(room, actorId);
    return beginVoting(room);
  }
  if (action === 'vote') {
    if (g.phase !== 'voting') fail('Hiện chưa phải thời gian bỏ phiếu.');
    requireAlive(room, actorId);
    if (data.target !== null && data.target !== 'skip') {
      validTarget(room, data.target);
      if (data.target === actorId) fail('Bạn không thể bỏ phiếu cho chính mình.');
    }
    g.voteMap[actorId] = data.target === 'skip' ? null : data.target;
    if (g.alive.every(id => Object.hasOwn(g.voteMap, id))) resolveVoting(room);
    return;
  }
  if (action === 'hunterShoot') {
    if (g.phase !== 'hunter' || g.hunterId !== actorId) fail('Bạn không có quyền bắn ở lượt này.');
    if (data.target) validTarget(room, data.target);
    return resolveHunter(room, data.target || null);
  }
  if (action === 'forceNext') {
    requireHost(room, actorId);
    if (g.phase !== 'interlude') fail('Chưa đến giai đoạn tiếp tục.');
    enterNight(room); return;
  }
  if (action === 'replay') {
    requireHost(room, actorId);
    if (g.phase !== 'ended') fail('Chưa kết thúc ván.');
    room.game = null;
    room.players.forEach(p => p.ready = p.isBot || p.id === room.hostId);
    syncDeck(room);
    return;
  }
  fail('Thao tác không được hỗ trợ.');
}

function botTick(room) {
  const g = room.game;
  if (!g || g.phase === 'ended' || time() - g.phaseStartedAt < 2400) return false;
  const bots = room.players.filter(p => p.isBot);
  if (g.phase === 'discussion' && bots.some(p => g.alive.includes(p.id))) {
    if ((g.botChatterCount || 0) < 4 && time() - g.phaseStartedAt > 5000 && time() - (g.lastBotChat || 0) > 11000) {
      const speaker = pick(bots.filter(p => g.alive.includes(p.id)));
      const lines = [
        'Mình thấy số 7 khá đáng nghi đấy!',
        'Ai có manh mối gì từ đêm qua không?',
        'Đừng vội kết luận, chúng ta cần thêm bằng chứng.',
        'Mình vẫn đang cân nhắc nên bỏ phiếu cho ai.',
        'Tôi nghi có Ma Sói đang đánh lạc hướng cả làng!',
      ];
      room.chat.push({ id: rand(5), userId: speaker.id, name: speaker.name,
        text: lines[g.botChatterCount % lines.length], at: time() });
      room.chat.splice(0, Math.max(0, room.chat.length - 80));
      g.lastBotChat = time(); g.botChatterCount++;
      return true;
    }
  }
  if (g.phase === 'night') {
    if (g.nightStep === 'wolf') {
      const bot = bots.find(p => g.alive.includes(p.id) && isWolf(g, p.id) && !Object.hasOwn(g.wolfVotes, p.id));
      if (bot) {
        const choices = g.alive.filter(id => !isWolf(g, id));
        performNightAction(room, bot.id, { choice: 'wolf', target: pick(choices) });
        return true;
      }
    } else {
      const bot = bots.find(p => g.alive.includes(p.id) && g.roles[p.id] === g.nightStep && !g.acted[p.id]);
      if (bot) {
        const choices = g.alive.filter(id => id !== bot.id);
        if (g.nightStep === 'guard') performNightAction(room, bot.id, { choice: 'guard', target: pick(g.alive.filter(id => id !== g.guardLast)) });
        if (g.nightStep === 'seer') performNightAction(room, bot.id, { choice: 'seer', target: pick(choices) });
        if (g.nightStep === 'witch') {
          if (g.wolvesTarget && g.witchResources.heal && Math.random() < .3) performNightAction(room, bot.id, { choice: 'heal' });
          else if (g.witchResources.poison && Math.random() < .16) performNightAction(room, bot.id, { choice: 'poison', target: pick(choices) });
          else performNightAction(room, bot.id, { choice: 'skip' });
        }
        return true;
      }
    }
  }
  if (g.phase === 'voting') {
    const bot = bots.find(p => g.alive.includes(p.id) && !Object.hasOwn(g.voteMap, p.id));
    if (bot) {
      const targets = g.alive.filter(id => id !== bot.id);
      const target = Math.random() < .13 ? 'skip' : pick(targets);
      doAction(room, bot.id, 'vote', { target });
      return true;
    }
  }
  if (g.phase === 'hunter' && bots.some(p => p.id === g.hunterId)) {
    resolveHunter(room, pick(g.alive)); return true;
  }
  return false;
}
export function tickRoom(room, now = time()) {
  if (!room.game || room.game.phase === 'ended') return false;
  let changed = botTick(room);
  const g = room.game;
  if (g.phaseEndsAt && now >= g.phaseEndsAt) {
    if (g.phase === 'night') nextNightStep(room);
    else if (g.phase === 'discussion') beginVoting(room);
    else if (g.phase === 'voting') resolveVoting(room);
    else if (g.phase === 'hunter') resolveHunter(room, null);
    else if (g.phase === 'interlude') enterNight(room);
    changed = true;
  }
  return changed;
}
export function getView(room, playerId) {
  const player = byId(room, playerId);
  if (!player) fail('Bạn không còn trong phòng.', 403);
  const isHost = room.hostId === playerId;
  const g = room.game;
  const base = {
    code: room.code, hostId: room.hostId, playerId, isHost,
    players: room.players.map((p, i) => ({ id: p.id, name: p.name, seat: i + 1,
      isHost: p.id === room.hostId, ready: p.ready, connected: p.connected, isBot: p.isBot,
      avatar: p.avatar, alive: !g || g.alive.includes(p.id), role: g?.phase === 'ended' ? g.roles[p.id] : undefined })),
    settings: { ...room.settings, deckTotal: roleDeckSum(room.settings.deck) },
    demoRole: room.demoRole,
    chat: room.chat.slice(-45),
    serverNow: time(),
    phase: g?.phase || 'lobby',
  };
  if (!g) return base;
  const role = g.roles[playerId];
  const alive = g.alive.includes(playerId);
  const isHunterTurn = g.phase === 'hunter' && g.hunterId === playerId;
  const ability = { kind: 'sleep', label: 'Cả làng đang ngủ', subtitle: 'Hãy chờ tới lượt kỹ năng của bạn.', targets: [], canAct: false };
  const targets = g.alive.filter(id => id !== playerId).map(id => ({ id, name: byId(room, id)?.name }));
  if (g.phase === 'night' && alive && (role === g.nightStep || (role === 'wolf' && g.nightStep === 'wolf'))) {
    ability.kind = g.nightStep; ability.canAct = role === 'wolf' ? !Object.hasOwn(g.wolfVotes, playerId) : !g.acted[playerId];
    ability.targets = targets;
    if (role === 'guard') {
      ability.label = 'Bảo Vệ'; ability.subtitle = 'Chọn một người để bảo vệ khỏi Ma Sói.';
      ability.targets = g.alive.filter(id => id !== g.guardLast).map(id => ({ id, name: byId(room,id)?.name }));
    }
    if (role === 'wolf') {
      ability.label = 'Ma Sói'; ability.subtitle = 'Cả đàn cùng chọn một người để cắn.';
      ability.targets = targets.filter(p => !isWolf(g, p.id));
    }
    if (role === 'seer') { ability.label = 'Tiên Tri'; ability.subtitle = 'Chọn một người để biết họ có phải Ma Sói.'; }
    if (role === 'witch') {
      ability.label = 'Phù Thủy'; ability.subtitle = 'Bạn có thể cứu một người hoặc dùng bình độc.';
      ability.healAvailable = g.witchResources.heal; ability.poisonAvailable = g.witchResources.poison;
      ability.wolfVictim = g.wolvesTarget ? { id: g.wolvesTarget, name: byId(room,g.wolvesTarget)?.name } : null;
    }
  }
  if (isHunterTurn) { ability.kind = 'hunter'; ability.canAct = true; ability.label = 'Phát bắn cuối'; ability.subtitle = 'Chọn một người để bắn trước khi rời trận!'; ability.targets = g.alive.map(id => ({ id, name: byId(room, id)?.name })); }
  return {
    ...base,
    game: {
      night: g.night, day: g.day, nightStep: g.nightStep, phaseEndsAt: g.phaseEndsAt,
      phaseStartedAt: g.phaseStartedAt, aliveCount: g.alive.length, winner: g.winner,
      events: g.events.slice(0, 10), lastAnnouncement: g.lastAnnouncement,
      lastDeaths: g.lastDeaths, lastVoted: g.lastVoted, hunterId: g.hunterId,
      votesReceived: Object.keys(g.voteMap).length, voteTotal: g.alive.length,
      yourVote: Object.hasOwn(g.voteMap, playerId) ? g.voteMap[playerId] : undefined,
      wolves: role === 'wolf' ? g.alive.filter(id => isWolf(g, id)) : [],
      seerResult: g.seerResults[playerId] || null,
      witchResources: role === 'witch' ? g.witchResources : undefined,
      role, alive, ability,
    },
  };
}
export function stateForTests(room) { return room.game; }
