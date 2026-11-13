import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server } from '../server.js';

test('API tạo phòng, 2 người kết nối, tin nhắn, kiểm tra token, SSE', async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=async (endpoint,body) => {
    const res=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:res.status,data:await res.json()};
  };
  const abort=new AbortController();
  try {
    const health=await fetch(base+'/api/health');
    assert.equal(health.status,200);
    const create=await post('/api/create',{name:'Người tạo'});
    assert.equal(create.status,201);
    const host=create.data;
    const join=await post('/api/join',{code:host.code,name:'Khách chơi'});
    assert.equal(join.status,200);
    const guest=join.data;
    const view=await fetch(base+`/api/view?${new URLSearchParams({code:host.code,id:host.id,token:host.token})}`);
    const state=await view.json();
    assert.equal(state.players.length,2);
    const denied=await fetch(base+`/api/view?${new URLSearchParams({code:host.code,id:host.id,token:'fake'})}`);
    assert.equal(denied.status,401);
    const stream=await fetch(base+`/api/stream?${new URLSearchParams({code:host.code,id:host.id,token:host.token})}`,{signal:abort.signal});
    assert.equal(stream.status,200);
    assert.match(stream.headers.get('content-type'),/text\/event-stream/);
    const chunk=await stream.body.getReader().read();
    assert.match(new TextDecoder().decode(chunk.value),/state|connected/);
    await post('/api/action',{code:guest.code,id:guest.id,token:guest.token,action:'chat',data:{text:'Xin chào ngôi làng!'}});
    const chatView=await (await fetch(base+`/api/view?${new URLSearchParams({code:host.code,id:host.id,token:host.token})}`)).json();
    assert.equal(chatView.chat.at(-1).text,'Xin chào ngôi làng!');
  } finally {
    abort.abort();
    await new Promise(resolve=>server.close(resolve));
  }
});
