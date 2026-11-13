const app = document.getElementById('app');
const STORAGE = 'ma_soi_25d_session_v1';
const SOUND = 'ma_soi_sound';
const ROLE_ORDER = ['villager', 'wolf', 'seer', 'guard', 'hunter', 'witch'];
const ROLES = {
  villager: { name: 'Dân Làng', icon: '🏡', hint: 'Tìm Sói bằng suy luận và lá phiếu.', color: '#8bd0ff', team:'Dân làng' },
  wolf: { name: 'Ma Sói', icon: '🐺', hint: 'Phối hợp đồng đội để cắn một người mỗi đêm.', color: '#f07879', team:'Ma Sói' },
  seer: { name: 'Tiên Tri', icon: '🔮', hint: 'Soi một người mỗi đêm để biết họ thuộc phe nào.', color: '#c28aff', team:'Dân làng' },
  guard: { name: 'Bảo Vệ', icon: '🛡️', hint: 'Bảo vệ một người; không được trùng hai đêm liền.', color: '#95baff', team:'Dân làng' },
  hunter: { name: 'Thợ Săn', icon: '🏹', hint: 'Nếu bị Sói cắn hoặc bị treo, được bắn phát cuối.', color: '#9bdba1', team:'Dân làng' },
  witch: { name: 'Phù Thủy', icon: '🧪', hint: 'Một bình cứu và một bình độc cho cả trận.', color: '#ffd47b', team:'Dân làng' },
};
const PAL = [
  ['#456fa4','#1c294b','#e4bda1'], ['#8b487b','#302342','#eec2ac'],
  ['#4a8a84','#1d4045','#d9a884'], ['#b16b40','#4d2928','#f2ceaf'],
  ['#6875ae','#292b52','#dfb9a1'], ['#8a5362','#402136','#efc6a8'],
  ['#6e8462','#323a30','#dab69f'], ['#916892','#353057','#f1ccaf']
];
let session = null, view = null, stream = null, meta = null, audioCtx = null, serverDelta = 0;
let lastPhaseKey = '', ui = {
  modal: null, sidebar: 'players', selected: null, roleHidden: false, chatDraft: '',
  sound: localStorage.getItem(SOUND) === 'on', toast: '', toastId: 0,
  roomCode: '', name: localStorage.getItem('masoi_name') || '', mobilePanel: false,
};
const H = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (ms) => { const t = Math.max(0,Math.ceil(ms/1000)); return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; };
const nameOf = id => view?.players?.find(p=>p.id===id)?.name || 'người chơi';
const isDay = () => ['discussion','voting','interlude','ended'].includes(view?.phase);
const me = () => view?.players?.find(p => p.id === view.playerId);
const roomPhaseKey = () => `${view?.phase}|${view?.game?.night}|${view?.game?.nightStep}`;

function icon(key, size = 18) {
  const paths = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="m19.4 15 1 1.7-2.1 2.1-1.7-1a8 8 0 0 1-2.1.9l-.5 2.1h-3l-.5-2.1a8 8 0 0 1-2.1-.9l-1.7 1-2.1-2.1 1-1.7a8 8 0 0 1-.9-2.1L2.5 12v-3l2.1-.5a8 8 0 0 1 .9-2.1l-1-1.7 2.1-2.1 1.7 1a8 8 0 0 1 2.1-.9l.5-2.1h3l.5 2.1a8 8 0 0 1 2.1.9l1.7-1 2.1 2.1-1 1.7a8 8 0 0 1 .9 2.1l2.1.5v3l-2.1.5a8 8 0 0 1-.9 2.1z" transform="translate(0 1) scale(.95)"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    home: '<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4zM15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6m0-6 6 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M9.8 5.2A12 12 0 0 1 12 5c6 0 10 7 10 7a15 15 0 0 1-3.5 4.2M6 6.5C3.5 8.2 2 12 2 12s4 7 10 7c1 0 2-.2 3-.5"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    refresh: '<path d="M3 11a9 9 0 0 1 15-6l3 3m0-6v6h-6M21 13a9 9 0 0 1-15 6l-3-3m0 6v-6h6"/>',
    crown: '<path d="m2 8 5 4 5-8 5 8 5-4-2 12H4z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.shield}</svg>`;
}
function logo(small = false) { return `<div class="brand ${small?'brand-small':''}"><span class="brand-beast">🐺</span><span class="brand-word">MA SÓI<i>///</i><small>ONLINE</small></span></div>`; }

function characterSvg(p) {
  const [cloak, dark, face] = PAL[p.avatar % PAL.length];
  const id = `p${p.id}`;
  return `<svg class="character-svg" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="coat${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${cloak}"/><stop offset=".56" stop-color="${dark}"/><stop offset="1" stop-color="#11172a"/></linearGradient>
    <linearGradient id="skin${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe2c6"/><stop offset="1" stop-color="${face}"/></linearGradient>
    <linearGradient id="metal${id}"><stop stop-color="#d1b887"/><stop offset="1" stop-color="#3c3946"/></linearGradient>
  </defs>
  <ellipse cx="61" cy="139" rx="34" ry="8" fill="#0a0d18" opacity=".55"/>
  <g class="actor-stool"><path d="M31 117 L82 117 L88 125 L28 125 Z" fill="#5d4634" stroke="#241823" stroke-width="3"/><path d="M37 125v15m42-15v15" stroke="#241b24" stroke-width="8"/></g>
  <g class="actor-legs"><path d="M45 107q-24 9-15 22l17 2 13-17M71 109q25 8 16 20l-17 3-12-17" fill="${dark}" stroke="#121321" stroke-width="3"/><path d="M29 128l-9 8 27 3 4-11M83 126l9 9-25 4-3-12" fill="#262a35" stroke="#0d1423" stroke-width="3"/></g>
  <g class="actor-torso"><path d="M30 70Q38 57 59 57Q84 60 91 75L84 113Q59 125 37 112Z" fill="url(#coat${id})" stroke="#16182b" stroke-width="3"/><path d="M56 60L61 115" stroke="#a4a4ad" stroke-width="2" opacity=".33"/><path d="M41 69L29 97 38 112M79 68l13 29-9 16" fill="none" stroke="#c3a77c" stroke-width="3" opacity=".7"/><path d="M37 100Q62 110 83 101" stroke="#e0c07c" stroke-width="5" fill="none"/></g>
  <g class="actor-arm-left"><path d="M34 75Q17 88 25 107L39 109L49 98 43 88" fill="url(#coat${id})" stroke="#1b1b2d" stroke-width="3"/><ellipse cx="42" cy="104" rx="8" ry="6" fill="url(#skin${id})"/></g>
  <g class="actor-arm-right"><path d="M85 73Q102 88 92 105L77 107 72 97 79 83" fill="url(#coat${id})" stroke="#16172b" stroke-width="3"/><ellipse cx="79" cy="104" rx="8" ry="6" fill="url(#skin${id})"/></g>
  <g class="actor-head"><path d="M39 52Q37 28 59 22Q83 26 80 52L76 66Q59 76 43 63Z" fill="url(#skin${id})" stroke="#241c25" stroke-width="2.5"/>
  <path d="M37 48Q29 27 44 18Q57 9 71 18Q91 25 82 52L75 37Q58 42 44 34Z" fill="${dark}" stroke="#201c29" stroke-width="2"/>
  <path d="M37 45Q60 28 82 44" stroke="${cloak}" stroke-width="6" opacity=".85" fill="none"/>
  <path d="M49 49l6 1m12 0 6-1" stroke="#2c2730" stroke-width="2.3" stroke-linecap="round"/><path d="M57 61q4 3 8 0" fill="none" stroke="#81534a" stroke-width="1.4" stroke-linecap="round"/>
  </g>
  <path d="M39 25L29 47l12-7M81 25l10 22-10-8" fill="${cloak}" opacity=".68"/>
  </svg>`;
}
function seatPosition(i,n) {
  if(n<=4) {const positions=[[[50,74]],[[33,74],[67,74]],[[22,73],[50,80],[78,73]],[[21,73],[42,79],[59,79],[80,73]]];const [x,y]=positions[n-1][i];return {x,y,scale:1,angle:0};}
  let count=n, index=i, inner=false;
  if (n>17) { if (i>=18) { index=i-18; count=n-18; inner=true; } else count=18; }
  const angle = -Math.PI / 2 + index*2*Math.PI/count;
  const rx = inner?23:41, ry=inner?18:34;
  const x = 50 + rx*Math.cos(angle), y = 52 + ry*Math.sin(angle);
  const scale = n>22 ? (inner?.60:.71) : n>15 ? .79 : n>11 ? .89 : 1;
  return {x,y,scale,angle};
}
function sceneSeats(players, phase, game) {
  return players.map((p,i) => {
    const pos = seatPosition(i,players.length);
    const sleeping = phase==='night';
    const passed = !p.alive;
    const isMe = p.id === view.playerId;
    const vote = game?.yourVote === p.id;
    const selected = ui.selected === p.id;
    const canTarget = !passed && (game?.ability?.canAct || phase === 'voting') && p.id!==view.playerId;
    const point = phase==='voting' && p.id===view.playerId && game?.yourVote!==undefined;
    const recentChat=phase==='discussion'&&view.chat.slice(-5).reverse().find(c=>c.userId===p.id&&Date.now()-c.at<12000);
    const cls = `seat ${sleeping?'sleeping':''} ${passed?'eliminated':''} ${isMe?'my-seat':''} ${selected?'selected':''} ${vote?'voted-target':''} ${point?'pointing':''} ${phase==='ended'?'celebrating':''} ${canTarget?'can-target':''}`;
    return `<button class="${cls}" style="left:${pos.x}%;top:${pos.y}%;--seat-scale:${pos.scale};--seat-depth:${Math.round(pos.y)}" data-act="seat" data-id="${H(p.id)}" aria-label="Chọn ${H(p.name)}" ${!canTarget?'tabindex="-1"':''}>
      <div class="seat-character">${characterSvg(p)}${sleeping&&!passed?'<span class="zzz">Z<span>z</span>z</span>':''}
      ${phase==='ended'&&!passed?'<span class="victory-spark">✦</span>':''}</div>${recentChat?`<div class="seat-speech">${H(recentChat.text)}</div>`:''}
      <div class="seat-name"><span class="seat-number">${p.seat}</span>${H(p.name)}${isMe?'<b> • Bạn</b>':''}</div>
      ${p.isBot?'<span class="bot-marker">BOT</span>':''}
      ${passed?'<span class="dead-marker">✕ ĐÃ LOẠI</span>':''}
    </button>`;
  }).join('');
}
function voteArrow() {
  if(view.phase!=='voting'||!view.game?.yourVote) return '';
  const fromIndex=view.players.findIndex(p=>p.id===view.playerId),toIndex=view.players.findIndex(p=>p.id===view.game.yourVote);
  if(fromIndex<0||toIndex<0) return '';
  const a=seatPosition(fromIndex,view.players.length),b=seatPosition(toIndex,view.players.length);
  const x1=a.x*10,y1=a.y*10,x2=b.x*10,y2=b.y*10;
  return `<svg class="vote-arrows" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow-tip" markerWidth="13" markerHeight="13" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#ffc766" stroke-width="2.2"/></marker></defs><path d="M ${x1} ${y1} Q ${(x1+x2)/2} ${Math.min(y1,y2)-80} ${x2} ${y2}" stroke="#ffdb7f" stroke-width="6" fill="none" marker-end="url(#arrow-tip)"/></svg>`;
}
function phaseName(phase) {
  return ({lobby:'PHÒNG CHỜ',night:'ĐÊM ĐẾN',discussion:'THẢO LUẬN',voting:'BỎ PHIẾU',interlude:'CHUYỂN GIAO',hunter:'THỢ SĂN',ended:'KẾT QUẢ'})[phase] || 'MA SÓI';
}
function phaseIcon(phase) { return ({night:'🌙',discussion:'💬',voting:'🎯',hunter:'🏹',interlude:'🌘',ended:'🏆',lobby:'🔥'})[phase] || '🐺'; }
function phaseSub() {
  const {phase,game} = view;
  if (phase==='lobby') return 'Cùng nhau chờ bên đống lửa trước khi bước vào ngôi làng.';
  if (phase==='night') return `Đêm ${game.night} • Mọi người ngủ say, chỉ người có kỹ năng được hành động.`;
  if (phase==='discussion') return `Ngày ${game.day} • Ai đang che giấu thân phận Ma Sói?`;
  if (phase==='voting') return 'Chọn người bạn nghi ngờ nhất. Mỗi người có một phiếu.';
  if (phase==='hunter') return 'Thợ Săn có thể bắn hạ một người trước khi rời trận.';
  if (phase==='interlude') return 'Một ngày khép lại. Hãy chuẩn bị cho bóng tối.';
  return 'Màn đêm đã có câu trả lời.';
}
function progress() {
  const phases=['night','discussion','voting','interlude'];
  const current=phases.indexOf(view.phase);
  return `<div class="steps-indicator">${phases.map((phase,i)=>`<div class="step-item ${i===current?'current':''} ${current>i?'completed':''}">${phaseIcon(phase)} <span>${phase==='night'?`Đêm ${view.game?.night||1}`:phase==='interlude'?'Đêm tiếp':phaseName(phase).toLowerCase()}</span></div>`).join('<span class="step-line"></span>')}</div>`;
}
function toast(msg) {
  ui.toast = msg;
  const n = ++ui.toastId;
  const el = document.getElementById('toast');
  if(el) { el.textContent = msg; el.classList.add('visible'); }
  else { render(); }
  setTimeout(() => { if(ui.toastId!==n) return; ui.toast=''; document.getElementById('toast')?.classList.remove('visible'); },3500);
}
function modalContent() {
  if(!ui.modal) return '';
  let content = '';
  if(ui.modal==='create' || ui.modal==='join') {
    const create=ui.modal==='create';
    content=`<form class="modal-form" data-form="${create?'create':'join'}">
      <p class="modal-brief">${create?'Tạo một ngôi làng mới và mời bạn bè bằng mã phòng.':'Nhập mã phòng được bạn bè gửi để tham gia.'}</p>
      <label>TÊN NHÂN VẬT <input name="name" id="modal-name" maxlength="24" minlength="2" placeholder="Ví dụ: Khánh Vân" value="${H(ui.name)}" required autofocus autocomplete="nickname"></label>
      ${!create?`<label>MÃ PHÒNG <input name="code" id="modal-code" maxlength="6" minlength="5" placeholder="AB1234" value="${H(ui.roomCode)}" required autocomplete="off" spellcheck="false" style="text-transform:uppercase"></label>`:''}
      <button type="submit" class="btn btn-primary full">${create?'🔥 TẠO PHÒNG NGAY':'🔑 VÀO PHÒNG CHƠI'}</button>
      <small>Chơi miễn phí • Tối đa 30 người/phòng • Không cần đăng ký</small>
    </form>`;
  } else if(ui.modal==='guide') {
    content=`<div class="guide-content"><p><b>Ma Sói</b> là trò chơi suy luận xã hội gồm hai phe: <b>Dân làng</b> và <b>Ma Sói</b>.</p>
      <div class="guide-steps"><div><b>01 • Phòng chờ</b><span>Chủ phòng chọn bộ bài, mọi người nhấn Sẵn sàng.</span></div>
      <div><b>02 • Đêm đến</b><span>Bảo Vệ → Ma Sói → Tiên Tri → Phù Thủy sử dụng kỹ năng theo lượt.</span></div>
      <div><b>03 • Thảo luận</b><span>Cả làng trao đổi để tìm ra kẻ nói dối.</span></div>
      <div><b>04 • Bỏ phiếu</b><span>Mỗi người chọn một người bị nghi ngờ; người nhiều phiếu nhất bị loại.</span></div>
      <div><b>05 • Kết thúc</b><span>Dân thắng khi không còn Sói; Sói thắng khi bằng hoặc nhiều hơn số người thuộc phe Dân.</span></div></div>
      <p class="muted">Thẻ vai trò là bí mật cho đến hết trận. Tin nhắn được đồng bộ theo phòng; phiên bản này chưa truyền giọng nói trực tiếp.</p></div>`;
  } else if(ui.modal==='roles') {
    content=`<div class="role-guide-grid">${ROLE_ORDER.map(role=>`<div class="role-guide"><span class="role-big">${ROLES[role].icon}</span><strong>${ROLES[role].name}</strong><small>${ROLES[role].team}</small><p>${ROLES[role].hint}</p></div>`).join('')}</div>`;
  }
  const titles={create:'TẠO PHÒNG MỚI',join:'THAM GIA PHÒNG',guide:'LUẬT CHƠI MA SÓI',roles:'BỘ THẺ NHÂN VẬT'};
  return `<div class="modal-backdrop" data-act="closeModal"><section class="modal-card" role="dialog" aria-modal="true" aria-label="${titles[ui.modal]}"><button class="modal-x" data-act="closeModal" aria-label="Đóng">${icon('x',20)}</button><div class="modal-mark">✦ HUYỀN THOẠI ĐÊM TRĂNG ✦</div><h2>${titles[ui.modal]}</h2>${content}</section></div>`;
}
function home() {
  return `<div class="home">
    <div class="home-image"></div><div class="home-vignette"></div><div class="floating-embers" aria-hidden="true"></div>
    <header class="home-header">${logo(true)}<nav><button class="nav-link" data-act="roles">${icon('book')} Vai trò</button><button class="nav-link" data-act="guide">${icon('book')} Hướng dẫn</button><button class="nav-link" data-act="sound">${icon(ui.sound?'volume':'mute')} Âm thanh</button></nav></header>
    <div class="home-content"><div class="home-tag">✧ GAME SUY LUẬN XÃ HỘI TRỰC TUYẾN ✧</div>
      <div class="moon-crown" aria-hidden="true"><span>☾</span><b>🐺</b></div>
      <h1 class="hero-title">MA <em>SÓI</em><i>///</i></h1>
      <div class="hero-ribbon">HUYỀN THOẠI ĐÊM TRĂNG</div>
      <p class="hero-copy">Màn đêm che giấu thân phận. Ánh lửa soi rõ sự thật.<br>Ai là người? Ai là sói? <strong>Ngôi làng chờ bạn phán xét.</strong></p>
      <div class="home-actions"><button class="btn btn-primary btn-huge" data-act="create">${icon('users',25)} TẠO PHÒNG</button><button class="btn btn-purple btn-huge" data-act="join">${icon('copy',23)} THAM GIA PHÒNG</button><button class="btn btn-brown btn-huge" data-act="guide">${icon('book',23)} HƯỚNG DẪN</button></div>
      ${session?`<button class="btn btn-ghost resume-btn" data-act="continue">↩ TRỞ LẠI PHÒNG #${H(session.code)}</button>`:''}
    </div>
    <footer class="home-footer"><span>${icon('users')} Tối đa <b>30 người/phòng</b></span><i></i><span>⚡ Chơi online, đồng bộ thời gian thực</span><i></i><span>${icon('shield')} Miễn phí • Không cần cài đặt</span></footer>
    <div class="bottom-credit">MA SÓI 2.5D • DESIGN PREVIEW / BẢN CHƠI THỬ HOÀN CHỈNH</div>
    ${modalContent()}<div id="toast" class="toast ${ui.toast?'visible':''}">${H(ui.toast)}</div>
  </div>`;
}
function roomHeader() {
  const ph=view.phase;
  return `<header class="game-header">${logo(true)}<div class="room-code-bar"><span class="room-chip">Phòng <b>#${H(view.code)}</b> <button data-act="copy" title="Sao chép mã phòng">${icon('copy',15)}</button></span><span class="room-chip"><b>◉</b> ${view.players.length}/30 người</span><span class="room-chip desktop-only">${icon('settings',14)} ${H(view.settings.preset==='advanced'?'Đầy đủ':view.settings.preset==='mystic'?'Huyền bí':'Cơ bản')}</span></div>
    ${ph==='lobby'?'<div class="header-headline">✦ PHÒNG CHỜ ✦</div>':progress()}
    <div class="header-controls"><span class="phase-chip ${ph==='night'?'chip-night':''}">${phaseIcon(ph)} ${ph==='night'?`Đêm ${view.game.night}`:phaseName(ph)}</span><button class="icon-btn mobile-panel-button" data-act="mobilePanel" aria-label="Mở bảng trò chơi">${icon('users')}</button><button class="icon-btn" data-act="sound" title="Bật/tắt âm thanh">${icon(ui.sound?'volume':'mute')}</button><button class="icon-btn" data-act="guide" title="Luật chơi">${icon('book')}</button><button class="icon-btn" data-act="leave" title="Trở lại trang chủ">${icon('home')}</button></div>
    </header>`;
}
function gameTopBanner() {
  if (view.phase==='lobby') return `<div class="top-banner lobby-banner"><span>✧</span><h2>CHÀO MỪNG ĐẾN VỚI NGÔI LÀNG</h2><small>Chuẩn bị bên đống lửa • Chủ phòng chọn vai • Mọi người nhấn Sẵn sàng</small></div>`;
  return `<div class="top-banner ${view.phase==='night'?'purple-banner':''}"><div class="top-badge">${phaseIcon(view.phase)}</div><h2>${phaseName(view.phase)}</h2><small>${phaseSub()}</small></div>`;
}
function campfireScene() {
  const ph=view.phase;
  return `<section class="scene scene-${ph} ${ph==='night'?'scene-is-night':''}">
    <div class="scene-bg"></div><div class="night-stars"></div><div class="scene-vignette"></div>
    ${ph==='night'?'<div class="night-moon">☾</div>':''}
    <div class="scene-light"></div><div class="fire-ring"><div class="fire-log one"></div><div class="fire-log two"></div><div class="flame f1"></div><div class="flame f2"></div><div class="flame f3"></div><div class="fire-sparks">✦ ✧ ✦</div></div>
    ${gameTopBanner()}
    <div class="seats-container">${sceneSeats(view.players,ph,view.game)}</div>${voteArrow()}
    ${view.game&&ph!=='ended'?`<div class="center-counter ${ph==='night'?'night-counter':''}"><small>${ph==='night'?'THỜI GIAN DÙNG KỸ NĂNG':ph==='voting'?'THỜI GIAN BỎ PHIẾU':ph==='discussion'?'THỜI GIAN THẢO LUẬN':ph==='hunter'?'PHÁT BẮN CUỐI':'SẮP SANG ĐÊM'}</small><strong data-countdown>${fmt((view.game.phaseEndsAt||0)-(Date.now()+serverDelta))}</strong></div>`:''}
    ${ph==='ended'?`<div class="victory-banner"><div class="victory-laurel">🏆</div><strong>${view.game.winner==='village'?'PHE DÂN LÀNG':'PHE MA SÓI'}<br>CHIẾN THẮNG!</strong><span>✦ DANH DỰ • MƯU TRÍ • NIỀM TIN ✦</span></div>`:''}
    ${view.game?.lastAnnouncement&&ph!=='night'&&ph!=='lobby'&&ph!=='ended'?`<div class="scene-announcement ${ph==='ended'?'win':''}">${H(view.game.lastAnnouncement)}</div>`:''}
    ${ph==='lobby'?lobbyBottom():gameBottom()}
    </section>`;
}
function lobbyBottom() {
  const bots=view.players.filter(p=>p.isBot).length;
  const ready=view.players.filter(p=>p.ready||p.isHost).length;
  return `<div class="lobby-footer"><div class="lobby-status">${icon('users',20)} <b>${ready}/${view.players.length}</b> đã sẵn sàng ${bots?`<small>• ${bots} bot thử</small>`:''}</div>
    ${!view.isHost?`<button class="btn btn-gold ${me()?.ready?'is-ready':''}" data-act="ready">${icon('check')} ${me()?.ready?'ĐÃ SẴN SÀNG':'SẴN SÀNG'}</button>`:
      `<button class="btn btn-gold" data-act="sidebar" data-tab="deck">${icon('settings')} CHỌN BỘ BÀI</button>
      <button class="btn btn-primary" data-act="start">▶ BẮT ĐẦU</button>`}
    </div>`;
}
function gameBottom() {
  const ph=view.phase, g=view.game;
  if (ph==='discussion') return `<div class="game-bottom"><span class="hint-bottom">💬 Lắng nghe, quan sát và tìm người nói dối!</span>${view.isHost?'<button class="btn btn-primary" data-act="forceVote">🎯 BẮT ĐẦU BỎ PHIẾU</button>':''}</div>`;
  if (ph==='voting') return `<div class="game-bottom"><span class="hint-bottom">🗳️ Đã bỏ phiếu: <b>${g.votesReceived}/${g.voteTotal}</b></span><span class="hint-bottom">Chọn nhân vật trên sân hoặc trong danh sách bên phải.</span></div>`;
  if (ph==='night') return `<div class="game-bottom"><span class="hint-bottom">🌙 Thế giới đang ngủ • <b>${g.aliveCount}</b> người còn sống</span><span class="hint-bottom">${g.ability.canAct?'✦ Đến lượt bạn! Hãy sử dụng kỹ năng ở bảng bên phải.':'✧ Giữ bí mật vai trò của mình.'}</span></div>`;
  if (ph==='interlude') return `<div class="game-bottom"><span class="hint-bottom">🌘 ${H(g.lastAnnouncement||'Vòng chơi đang chuyển tiếp...')}</span>${view.isHost?'<button class="btn btn-primary" data-act="forceNext">SANG ĐÊM TIẾP ▶</button>':''}</div>`;
  if (ph==='hunter') return `<div class="game-bottom"><span class="hint-bottom">🏹 Thợ Săn có thể trả đũa trước khi bị loại.</span></div>`;
  return '';
}
function playerRows() {
  return `<div class="player-list">${view.players.map((p)=>{
    const actor=view.playerId===p.id;
    const selected=ui.selected===p.id;
    return `<button class="player-row ${selected?'selected':''} ${!p.alive?'dead':''}" data-act="seat" data-id="${H(p.id)}" title="${H(p.name)}"><span class="player-idx">${p.seat}</span><span class="player-face" style="--avatar:${PAL[p.avatar%PAL.length][0]}">◕</span><span class="player-name">${H(p.name)} ${actor?'<span class="you-label">(Bạn)</span>':''}${p.isBot?'<small> BOT</small>':''}</span>${!p.alive?'<span class="tag-dead">✕</span>':p.ready&&view.phase==='lobby'?'<span class="tag-ready">✓</span>':`<span class="player-dot ${p.connected?'online':''}"></span>`}${view.isHost&&view.phase==='lobby'&&!p.isHost?`<span class="kick" title="Mời người chơi ra phòng" data-act="kick" data-id="${H(p.id)}">×</span>`:''}</button>`;
  }).join('')}</div>`;
}
function lobbySettings() {
  const sum=view.settings.deckTotal, actual=view.players.length, valid=sum===actual;
  return `<div class="deck-panel"><div class="deck-title">⚙ CẤU HÌNH BỘ BÀI</div><p>Chủ phòng chọn số lượng thẻ vai cho ván chơi.</p>
    <div class="preset-strip">${[['basic','Cơ bản'],['mystic','Huyền bí'],['advanced','Đầy đủ']].map(([code,label])=>`<button data-act="preset" data-preset="${code}" class="${view.settings.preset===code&&view.settings.automatic?'active':''}" ${!view.isHost?'disabled':''}>${label}</button>`).join('')}</div>
    <div class="deck-list">${ROLE_ORDER.map(role=>`<div class="deck-row"><span class="deck-icon">${ROLES[role].icon}</span><span class="deck-role">${ROLES[role].name}</span><span class="deck-counter"><button data-act="deckChange" data-role="${role}" data-delta="-1" ${!view.isHost?'disabled':''}>−</button><strong>${view.settings.deck[role]||0}</strong><button data-act="deckChange" data-role="${role}" data-delta="1" ${!view.isHost?'disabled':''}>+</button></span></div>`).join('')}</div>
    <div class="deck-total ${valid?'good':'bad'}">Tổng thẻ: <b>${sum}</b> / ${actual} người ${valid?'✓':'⚠'}</div>
    ${view.isHost?`<div class="demo-controls"><div class="demo-title">🧪 CHẾ ĐỘ THỬ GAME</div><p>Chưa đủ người? Thêm bot để thử toàn bộ diễn biến.</p>
      <div class="demo-buttons"><button class="btn btn-small btn-purple" data-act="addBots">+ THÊM 9 BOT</button><button class="btn btn-small btn-ghost" data-act="removeBots">XÓA BOT</button></div>
      <label>Thử vai của chủ phòng<select id="demoRole">${ROLE_ORDER.map(role=>`<option value="${role}" ${view.demoRole===role?'selected':''}>${ROLES[role].name}</option>`).join('')}</select></label>
      <small>Chế độ chọn vai chỉ có tác dụng nếu phòng có bot và chỉ một người thật.</small></div>`:''}</div>`;
}
function chatPanel() {
  const canChat=view.phase==='lobby'||(['discussion','voting','interlude'].includes(view.phase)&&view.game?.alive);
  return `<section class="chat-panel"><div class="chat-title">${icon('message')} TRÒ CHUYỆN <small>${view.chat.length?view.chat.length+' tin nhắn':''}</small></div>
    <div class="chat-history" id="chat-history">${view.chat.length?view.chat.slice(-35).map(c=>`<div class="chat-msg ${c.userId===view.playerId?'mine':''}"><span>${H(c.name)}</span> ${H(c.text)}</div>`).join(''):'<div class="chat-placeholder">Thảo luận và kết nối với những người trong làng...</div>'}</div>
    <form class="chat-input-bar" data-form="chat"><input aria-label="Tin nhắn" name="chat" id="chat-input" data-focus="chat" placeholder="${canChat?'Nhập tin nhắn...':'Chỉ trò chuyện khi được phép'}" value="${H(ui.chatDraft)}" maxlength="200" ${!canChat?'disabled':''}><button type="submit" ${!canChat?'disabled':''} aria-label="Gửi tin">${icon('send')}</button></form>
    </section>`;
}
function abilityPanel() {
  const g=view.game, ability=g.ability;
  const role=ROLES[g.role]||ROLES.villager;
  const phase=view.phase;
  const potential=phase==='voting' ? view.players.filter(p=>p.alive&&p.id!==view.playerId).map(p=>({id:p.id,name:p.name})) : ability.targets;
  const ready=phase==='voting'&&g.yourVote!==undefined;
  const canChoose=phase==='voting'&&g.alive || ability.canAct;
  const abilityIcon=phase==='voting'?'🎯':phase==='discussion'?'💬':phase==='interlude'?'🌘':phase==='hunter'?'🏹':phase==='night'?role.icon:'🏆';
  const title=phase==='night'&&ability.canAct?ability.label:phase==='voting'?'BỎ PHIẾU':phase==='discussion'?'HỘI ĐỒNG LÀNG':phase==='hunter'?'THỢ SĂN':phase==='interlude'?'CHỜ ĐÊM MỚI':'VAI TRÒ BÍ MẬT';
  const subtitle=phase==='voting'?'Chọn một người bạn tin là Ma Sói.':phase==='discussion'?'Thảo luận với mọi người để tìm ra sự thật.':phase==='night'&&!ability.canAct?'Ngủ say cho đến lượt kỹ năng của bạn.':ability.subtitle;
  return `<div class="skill-card">
    <div class="skill-head"><div class="skill-portrait">${abilityIcon}</div><div><b>${H(title)}</b><span>${H(subtitle||'')}</span></div></div>
    ${phase==='night'&&g.role==='seer'&&g.seerResult?`<div class="seer-result">🔮 Đêm ${g.seerResult.night}, <b>${H(g.seerResult.name)}</b> ${g.seerResult.wolf?'LÀ MA SÓI! 🐺':'KHÔNG PHẢI MA SÓI. ✓'}</div>`:''}
    ${phase==='night'&&g.role==='wolf'?`<div class="wolf-ally">🐺 Đồng đội: ${g.wolves.map(nameOf).map(H).join(' • ')}</div>`:''}
    ${phase==='night'&&g.role==='witch'&&ability.canAct?`<div class="potion-info">🌿 Bình cứu: ${ability.healAvailable?'Còn':'Đã dùng'} &nbsp; ☠ Bình độc: ${ability.poisonAvailable?'Còn':'Đã dùng'}</div>${ability.wolfVictim?`<div class="seer-result">🐾 Sói đang nhắm vào <b>${H(ability.wolfVictim.name)}</b>.</div>`:''}`:''}
    ${canChoose&&potential?.length?`<div class="skill-select-title">CHỌN NGƯỜI CHƠI</div><div class="target-grid">${potential.map((p,i)=>`<button data-act="target" data-id="${H(p.id)}" class="target-choice ${ui.selected===p.id?'active':''}"><span>●</span>${H(p.name)}</button>`).join('')}</div>`:''}
    ${phase==='voting'&&g.alive?`<div class="skill-buttons">${ready?`<div class="vote-confirmed">✓ Bạn đã bỏ phiếu ${g.yourVote?`cho ${H(nameOf(g.yourVote))}`:'trắng'}</div>`:''}
      <button class="btn btn-primary full" data-act="castVote" ${!ui.selected?'disabled':''}>🎯 ${ready?'ĐỔI LÁ PHIẾU':'BỎ PHIẾU'}</button><button class="btn btn-ghost full" data-act="skipVote">BỎ PHIẾU TRẮNG</button></div>`:''}
    ${phase==='night'&&ability.canAct?`<div class="skill-buttons">${ability.kind==='witch'?`<button class="btn btn-gold full" data-act="nightHeal" ${!ability.healAvailable||!ability.wolfVictim?'disabled':''}>🌿 SỬ DỤNG BÌNH CỨU</button><button class="btn btn-primary full" data-act="nightPoison" ${!ability.poisonAvailable||!ui.selected?'disabled':''}>☠ SỬ DỤNG BÌNH ĐỘC</button>`:
      `<button class="btn ${ability.kind==='wolf'?'btn-primary':'btn-gold'} full" data-act="useSkill" ${!ui.selected?'disabled':''}>${ability.kind==='wolf'?'🐺 TẤN CÔNG':'✦ SỬ DỤNG KỸ NĂNG'}</button>`}<button class="btn btn-ghost full" data-act="skipSkill">BỎ QUA LƯỢT</button></div>`:''}
    ${phase==='hunter'&&ability.canAct?`<div class="skill-buttons"><button class="btn btn-primary full" data-act="hunterShoot" ${!ui.selected?'disabled':''}>🏹 BẮN MỤC TIÊU</button><button class="btn btn-ghost full" data-act="hunterSkip">BỎ QUA</button></div>`:''}
    ${phase==='night'&&!ability.canAct?`<div class="sleep-note">${icon('moon',22)} Cả làng đang chìm trong giấc ngủ... <span>z Z z</span></div>`:''}
    ${phase==='discussion'?`<div class="discussion-tip">💡 Quan sát lời nói, kiểm tra lời buộc tội, và thảo luận trước khi biểu quyết.</div>`:''}
    ${phase==='interlude'?`<div class="discussion-tip">⌛ Giai đoạn kế tiếp sẽ tự động bắt đầu khi hết thời gian.</div>`:''}
    ${!g.alive?`<div class="spectator-note">👻 Bạn đã bị loại và đang theo dõi ván đấu.</div>`:''}
  </div>`;
}
function roleCard() {
  if(!view.game || view.phase==='ended') return '';
  const role=ROLES[view.game.role];
  return `<div class="my-role"><div class="role-title"><span>THẺ BÍ MẬT CỦA BẠN</span><button class="icon-btn" data-act="toggleRole" title="Ẩn/hiện vai">${icon(ui.roleHidden?'eye':'eyeoff',17)}</button></div>
    <div class="role-main" style="--role-color:${role.color}"><span>${ui.roleHidden?'🂠':role.icon}</span><div><strong>${ui.roleHidden?'VAI TRÒ ĐÃ ẨN':role.name.toUpperCase()}</strong><small>${ui.roleHidden?'Nhấn biểu tượng mắt để xem vai':role.hint}</small></div></div></div>`;
}
function gameEvents() {
  if(!view.game) return '';
  return `<div class="events-panel"><div class="events-heading">📜 DIỄN BIẾN NGÔI LÀNG</div>${view.game.events.slice(0,4).map(e=>`<div class="event-item ${e.style}">${H(e.message)}</div>`).join('')}</div>`;
}
function sidebar() {
  if(view.phase==='lobby') return `<aside class="sidebar ${ui.mobilePanel?'mobile-open':''}"><div class="sidebar-switch"><button class="${ui.sidebar==='players'?'active':''}" data-act="sidebar" data-tab="players">${icon('users')} Người chơi</button><button class="${ui.sidebar==='deck'?'active':''}" data-act="sidebar" data-tab="deck">${icon('book')} Bộ bài</button></div>
      <div class="sidebar-scroll">${ui.sidebar==='players'?`<div class="sidebar-heading">DANH SÁCH NGƯỜI CHƠI (${view.players.length})</div>${playerRows()}`:lobbySettings()}</div>
      ${chatPanel()}</aside>`;
  if(view.phase==='ended') return `<aside class="sidebar ${ui.mobilePanel?'mobile-open':''}">${endSidebar()}</aside>`;
  return `<aside class="sidebar ${ui.mobilePanel?'mobile-open':''}">${roleCard()}<div class="sidebar-scroll"><div class="sidebar-phase-title">${phaseIcon(view.phase)} ${phaseName(view.phase)} <small>${view.game?.aliveCount||0} người còn sống</small></div>${abilityPanel()}<div class="sidebar-heading">${view.phase==='night'?'DANH SÁCH NGƯỜI CHƠI (ẨN VAI)':'DANH SÁCH NGƯỜI CHƠI'}</div>${playerRows()}${gameEvents()}</div>${chatPanel()}</aside>`;
}
function endSidebar() {
  const winners=view.game.winner==='village';
  return `<div class="end-side"><div class="end-crown">🏆</div><h2>${winners?'DÂN LÀNG':'MA SÓI'} CHIẾN THẮNG</h2><p>Trận đấu đã khép lại. Cùng khám phá các thân phận thật!</p><div class="final-roster">${view.players.map(p=>`<div><span>${H(p.name)}</span><b>${ROLES[p.role]?.icon} ${ROLES[p.role]?.name}</b></div>`).join('')}</div>
    ${view.isHost?'<button class="btn btn-primary full" data-act="replay">↻ CHƠI LẠI</button>':'<div class="ready-to-replay">Đợi chủ phòng mở ván mới...</div>'}<button class="btn btn-brown full" data-act="leave">⌂ VỀ TRANG CHỦ</button></div>`;
}
function gameRoom() {
  const ended=view.phase==='ended';
  return `<div class="game-shell phase-${view.phase}">${roomHeader()}<div class="game-grid">${campfireScene()}${sidebar()}</div>
    ${ended?`<div class="victory-overlay" aria-hidden="true"><div class="confetti">${Array.from({length:35}, (_,i)=>`<i style="--c:${i};--left:${(i*37)%100}%;--delay:${(i%11)*-.31}s"></i>`).join('')}</div></div>`:''}
    ${modalContent()}<div id="toast" class="toast ${ui.toast?'visible':''}">${H(ui.toast)}</div></div>`;
}
function render() {
  const focus = document.activeElement;
  const focusKey = focus?.dataset?.focus;
  const position = focus?.selectionStart;
  const chatScroll = document.getElementById('chat-history');
  const wasBottom = chatScroll ? chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 48 : true;
  app.innerHTML = view ? gameRoom() : home();
  if(focusKey) {
    const el = document.querySelector(`[data-focus="${focusKey}"]`);
    if(el) { el.focus({preventScroll:true}); try { el.setSelectionRange(position,position); } catch {} }
  }
  const newChat = document.getElementById('chat-history');
  if(newChat && wasBottom) newChat.scrollTop = newChat.scrollHeight;
  updateClock();
}
function updateClock() {
  const g=view?.game;
  const el=document.querySelector('[data-countdown]');
  if(el && g?.phaseEndsAt) {
    const left = g.phaseEndsAt - (Date.now()+serverDelta);
    el.textContent = fmt(left);
    el.classList.toggle('urgent',left<10000);
  }
}
function beep(kind='stage') {
  if(!ui.sound) return;
  try {
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type=kind==='night'?'triangle':'sine';
    osc.frequency.setValueAtTime(kind==='night'?210:540,audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(kind==='night'?115:760,audioCtx.currentTime+.2);
    gain.gain.setValueAtTime(.055,audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.24);
    osc.start(); osc.stop(audioCtx.currentTime+.25);
  } catch {}
}
async function api(path,body) {
  const res=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  let data;
  try{ data=await res.json(); } catch { throw Error('Máy chủ không phản hồi đúng định dạng.'); }
  if(!res.ok) throw Error(data.error||'Yêu cầu thất bại.');
  return data;
}
async function action(act,data={}) {
  if(!session) return toast('Hãy tạo hoặc tham gia phòng trước.');
  try { await api('action',{...session,action:act,data}); }
  catch(e) { toast(e.message); }
}
function subscribe() {
  stream?.close();
  if(!session) return;
  const q=new URLSearchParams({code:session.code,id:session.id,token:session.token});
  stream=new EventSource('/api/stream?'+q.toString());
  stream.addEventListener('state',event=>{
    try {
      const next=JSON.parse(event.data);
      serverDelta=(next.serverNow||Date.now())-Date.now();
      const prev=lastPhaseKey;
      view=next;
      const current=roomPhaseKey();
      if(prev&&prev!==current) {
        ui.selected=null;
        if(!['lobby','ended'].includes(next.phase)) beep(next.phase==='night'?'night':'stage');
      }
      lastPhaseKey=current;
      render();
    } catch(e) { console.error('Invalid game event',e); }
  });
  stream.onerror=()=>{ if(stream?.readyState===EventSource.CLOSED) toast('Mất kết nối. Hãy tải lại trang.'); };
}
function setSession(record) {
  session={code:record.code,id:record.id,token:record.token};
  localStorage.setItem(STORAGE,JSON.stringify(session));
  view=record.view||null;
  lastPhaseKey=roomPhaseKey();
  ui.modal=null; ui.selected=null; ui.mobilePanel=false;ui.sidebar='players';
  render(); subscribe();
}
function parkRoom() {
  stream?.close(); stream=null; view=null; ui.modal=null; ui.mobilePanel=false; render();
}
function exitRoom() {
  stream?.close(); stream=null;
  localStorage.removeItem(STORAGE);
  session=null; view=null; lastPhaseKey=''; ui.modal=null;
  render();
}
async function resume() {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(!saved?.code||!saved?.token) return render();
    const qs=new URLSearchParams(saved);
    const res=await fetch('/api/view?'+qs.toString());
    if(!res.ok) { localStorage.removeItem(STORAGE); return render(); }
    const next=await res.json();
    setSession({...saved,view:next});
  } catch { localStorage.removeItem(STORAGE); render(); }
}
function selectTarget(id) {
  if(!view?.game) return;
  const g=view.game;
  const valid=view.phase==='voting'?g.alive&&id!==view.playerId&&view.players.some(p=>p.id===id&&p.alive):g.ability.canAct&&g.ability.targets.some(p=>p.id===id);
  if(!valid) return;
  ui.selected=id;render();
}
async function handleClick(button,event) {
  const act=button.dataset.act;
  if(!act) return;
  const id=button.dataset.id;
  if(act==='closeModal') { if((button.classList.contains('modal-backdrop')&&event?.target===button)||button.closest('.modal-x')) { ui.modal=null; render(); } return; }
  if(act==='create'||act==='join'||act==='guide'||act==='roles') { ui.modal=act; render(); return; }
  if(act==='sound') { ui.sound=!ui.sound;localStorage.setItem(SOUND,ui.sound?'on':'off');beep();render();return; }
  if(act==='leave') {
    if(view?.phase==='lobby') { await action('leave'); exitRoom(); }
    else if(view?.phase==='ended') exitRoom();
    else parkRoom();
    return;
  }
  if(act==='continue') { await resume(); return; }
  if(act==='copy') { try{ await navigator.clipboard.writeText(view.code);toast('Đã sao chép mã phòng '+view.code); }catch{ toast('Mã phòng: '+view.code); }return; }
  if(act==='mobilePanel') { ui.mobilePanel=!ui.mobilePanel;render();return; }
  if(act==='sidebar') { ui.sidebar=button.dataset.tab||'deck';ui.mobilePanel=true;render();return; }
  if(act==='ready') return action('ready');
  if(act==='start') return action('start');
  if(act==='preset') { ui.sidebar='deck';return action('setPreset',{preset:button.dataset.preset}); }
  if(act==='deckChange') {
    const deck={...view.settings.deck}, role=button.dataset.role;
    deck[role]=Math.max(0,Math.min(30,deck[role]+Number(button.dataset.delta)));
    return action('setDeck',{deck});
  }
  if(act==='addBots') return action('addBots',{count:9});
  if(act==='removeBots') return action('removeBots');
  if(act==='kick') { if(confirm('Mời '+nameOf(id)+' ra khỏi phòng?'))return action('kick',{target:id});return; }
  if(act==='seat'||act==='target') return selectTarget(id);
  if(act==='toggleRole') {ui.roleHidden=!ui.roleHidden;render();return;}
  if(act==='useSkill') { if(!ui.selected)return;return action('nightAction',{choice:view.game.ability.kind,target:ui.selected}); }
  if(act==='skipSkill') return action('nightAction',{choice:'skip'});
  if(act==='nightHeal') return action('nightAction',{choice:'heal'});
  if(act==='nightPoison') {if(!ui.selected)return;return action('nightAction',{choice:'poison',target:ui.selected});}
  if(act==='castVote') {if(!ui.selected)return;return action('vote',{target:ui.selected});}
  if(act==='skipVote') return action('vote',{target:'skip'});
  if(act==='hunterShoot') {if(!ui.selected)return;return action('hunterShoot',{target:ui.selected});}
  if(act==='hunterSkip') return action('hunterShoot',{target:null});
  if(act==='forceVote') return action('forceVote');
  if(act==='forceNext') return action('forceNext');
  if(act==='replay') return action('replay');
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-act]');
  if(button) { if(button.disabled)return; handleClick(button,e).catch?.(err=>toast(err.message)); }
});
document.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-form]'); if(!f)return;
  e.preventDefault();
  const type=f.dataset.form;
  if(type==='chat') {
    const text=ui.chatDraft.trim();if(!text)return;
    ui.chatDraft='';
    const el=document.getElementById('chat-input');if(el)el.value='';
    return action('chat',{text});
  }
  if(type==='create'||type==='join') {
    const btn=f.querySelector('button[type="submit"]');
    btn.disabled=true;btn.textContent='ĐANG KẾT NỐI...';
    const data=new FormData(f);
    const name=String(data.get('name')||'').trim(),code=String(data.get('code')||'').trim().toUpperCase();
    ui.name=name;ui.roomCode=code;localStorage.setItem('masoi_name',name);
    try {
      const response=await api(type==='create'?'create':'join',type==='create'?{name}:{name,code});
      setSession(response);
    }catch(err){toast(err.message);btn.disabled=false;btn.textContent=type==='create'?'🔥 TẠO PHÒNG NGAY':'🔑 VÀO PHÒNG CHƠI';}
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='chat-input')ui.chatDraft=e.target.value;
  if(e.target.id==='modal-name')ui.name=e.target.value;
  if(e.target.id==='modal-code')ui.roomCode=e.target.value;
});
document.addEventListener('change',e=>{if(e.target.id==='demoRole') action('demoRole',{role:e.target.value});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal){ui.modal=null;render();}});
window.addEventListener('beforeunload',()=>stream?.close());
setInterval(updateClock,180);
resume();
