import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLAYERS, defaultDeck, newRoom, joinRoom, doAction, startGame, getView, GameError, tickRoom,
} from '../game/engine.js';
const total = deck => Object.values(deck).reduce((s,n)=>s+n,0);
function roomOf(n=5) {
  const room = newRoom('Chủ Phòng', 'AB1234');
  for(let i=1;i<n;i++) joinRoom(room,`Người ${i}`);
  room.players.forEach(p=>doAction(room,p.id,'ready'));
  return room;
}

test('Bộ vai mặc định khớp số người từ 5 đến 30', () => {
  for(const preset of ['basic','mystic','advanced']) for(let n=5;n<=30;n++) {
    const deck=defaultDeck(n,preset);
    assert.equal(total(deck),n);
    assert.ok(deck.wolf>=1 && deck.wolf<n/2);
    assert.ok(deck.villager>=1);
  }
});

test('Phòng tối đa 30 người; chỉ chủ phòng được chỉnh bộ bài', () => {
  const room=roomOf(30);
  assert.equal(room.players.length,MAX_PLAYERS);
  assert.throws(()=>joinRoom(room,'Người 31'),GameError);
  assert.throws(()=>doAction(room,room.players[1].id,'setPreset',{preset:'basic'}),GameError);
  doAction(room,room.hostId,'setPreset',{preset:'basic'});
  assert.equal(room.settings.deck.seer,0);
});

test('Giữ bí mật vai, bảo vệ, Sói, Tiên tri, Phù thủy theo thứ tự', () => {
  const room=roomOf(10);
  startGame(room,room.hostId);
  const g=room.game;
  assert.equal(g.phase,'night');
  assert.equal(g.nightStep,'guard');
  const roles=Object.entries(g.roles);
  const [guard]=roles.find(x=>x[1]==='guard');
  const [seer]=roles.find(x=>x[1]==='seer');
  const [witch]=roles.find(x=>x[1]==='witch');
  const wolves=roles.filter(x=>x[1]==='wolf').map(x=>x[0]);
  const villager=roles.find(x=>x[1]==='villager')[0];
  assert.equal(getView(room,villager).game.role,'villager');
  assert.equal(getView(room,villager).game.wolves.length,0);
  assert.equal(getView(room,villager).players.find(x=>x.id===wolves[0]).role,undefined);
  doAction(room,guard,'nightAction',{choice:'guard',target:villager});
  assert.equal(g.nightStep,'wolf');
  for(const wolf of wolves) doAction(room,wolf,'nightAction',{choice:'wolf',target:villager});
  assert.equal(g.nightStep,'seer');
  doAction(room,seer,'nightAction',{choice:'seer',target:wolves[0]});
  assert.equal(g.seerResults[seer].wolf,true);
  assert.equal(g.nightStep,'witch');
  doAction(room,witch,'nightAction',{choice:'skip'});
  assert.equal(g.phase,'discussion');
  assert.ok(g.alive.includes(villager),'Người được Bảo Vệ không bị Sói cắn');
});

test('Bỏ phiếu loại hết Sói: dân làng chiến thắng; lộ vai khi kết thúc', () => {
  const room=roomOf(5);
  startGame(room,room.hostId);
  const g=room.game;
  const wolf=Object.entries(g.roles).find(x=>x[1]==='wolf')[0];
  doAction(room,wolf,'nightAction',{choice:'skip'});
  assert.equal(g.phase,'discussion');
  doAction(room,room.hostId,'forceVote');
  assert.equal(g.phase,'voting');
  const voters=g.alive.filter(id=>id!==wolf);
  for(const id of voters) doAction(room,id,'vote',{target:wolf});
  doAction(room,wolf,'vote',{target:'skip'});
  assert.equal(g.phase,'ended');
  assert.equal(g.winner,'village');
  assert.equal(getView(room,room.hostId).players.find(x=>x.id===wolf).role,'wolf');
});

test('Bot thử game và buộc chuyển giai đoạn bằng đồng hồ', () => {
  const room=newRoom('Tôi Test','CD5678');
  doAction(room,room.hostId,'addBots',{count:9});
  assert.equal(room.players.length,10);
  assert.equal(room.players.filter(p=>p.isBot).length,9);
  doAction(room,room.hostId,'demoRole',{role:'seer'});
  startGame(room,room.hostId);
  assert.equal(room.game.roles[room.hostId],'seer');
  // Advance several night steps by simulating timeout (without waiting).
  for(let i=0;i<6 && room.game.phase==='night';i++) {
    room.game.phaseEndsAt=Date.now()-1;
    tickRoom(room,Date.now());
  }
  assert.ok(['discussion','ended','hunter'].includes(room.game.phase));
});

test('Không thể vote hoặc thực hiện kỹ năng ngoài lượt', () => {
  const room=roomOf(5); startGame(room,room.hostId);
  const villager=Object.entries(room.game.roles).find(x=>x[1]==='villager')[0];
  assert.throws(()=>doAction(room,villager,'vote',{target:room.hostId}),GameError);
  assert.throws(()=>doAction(room,villager,'nightAction',{choice:'seer',target:room.hostId}),GameError);
});
