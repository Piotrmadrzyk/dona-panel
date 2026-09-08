const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function setup(){
  const events=[],location={hash:''};
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const window={dispatchEvent:event=>events.push(event)};
  vm.runInNewContext(fs.readFileSync('pilot/panel-actions.js','utf8'),{window,location,CustomEvent,setTimeout:fn=>{fn();return 1;}});
  return{actions:window.DonaPanelActions,events,location};
}

test('voice commands navigate to calendar and Facebook views',()=>{
  const f=setup();
  assert.equal(f.actions.prepare('Dona, pokaż mi kalendarz',{source:'voice'}).view,'calendar');
  assert.equal(f.location.hash,'#calendar');
  assert.ok(f.events.some(e=>e.type==='dona:voice-panel-mode'&&e.detail.view==='calendar'));
  assert.equal(f.actions.prepare('Dona pokaż posty na FB',{source:'voice'}).view,'social');
  assert.equal(f.location.hash,'#social');
});

test('checking mail opens the mail view so the agent run stays visible',()=>{
  const f=setup(),result=f.actions.prepare('Dona, sprawdź pocztę',{source:'voice'});
  assert.equal(result.view,'mail');
  assert.equal(f.location.hash,'#mail');
  assert.ok(f.events.some(e=>e.type==='dona:voice-panel-mode'&&e.detail.view==='mail'));
});

test('editing a Facebook post opens the visible revision flow and keeps publishing blocked',()=>{
  const f=setup(),result=f.actions.prepare('Dona edytuj pierwszy post, skróć początek',{source:'voice'});
  assert.equal(result.view,'social');
  assert.match(result.backendText,/TRYB KOREKTY/);
  assert.match(result.backendText,/nie publikuj/i);
  assert.ok(f.events.some(e=>e.type==='dona:request-revision'&&e.detail.kind==='social'));
});

test('calendar mutations always return for approval before execution',()=>{
  const f=setup(),result=f.actions.prepare('Dona zablokuj piątek i przełóż spotkanie');
  assert.equal(result.view,null);
  assert.match(result.backendText,/TRYB BEZPIECZNEJ OPERACJI KALENDARZOWEJ/);
  assert.match(result.backendText,/bez jednoznacznego potwierdzenia Piotra/);
});

test('current weather uses device location only after an explicit weather question',()=>{
  const f=setup(),result=f.actions.prepare('Dona, jaka jest pogoda?',{source:'voice'});
  assert.equal(result.view,'weather');
  assert.equal(result.clientAction.type,'weather-current');
  assert.equal(f.location.hash,'#weather');
});

test('weekend weather asks for a place and treats the next short answer as that place',()=>{
  const f=setup(),question=f.actions.prepare('Jaka będzie pogoda na weekend?');
  assert.equal(question.clientAction.type,'weather-needs-place');
  assert.match(question.backendText,/Gdzie mam sprawdzić pogodę na weekend/);
  const answer=f.actions.prepare('Sopot');
  assert.deepEqual({...answer.clientAction},{type:'weather-place',place:'Sopot',period:'weekend'});
  assert.equal(answer.view,'weather');
});

test('explicit weekend place skips the follow-up question',()=>{
  const f=setup(),result=f.actions.prepare('Pogoda na weekend w Rzeszowie');
  assert.deepEqual({...result.clientAction},{type:'weather-place',place:'Rzeszowie',period:'weekend'});
});

test('map commands open maps while a mind map remains a YouTube feature',()=>{
  const f=setup(),map=f.actions.prepare('Dona pokaż trasę do Wawelu',{source:'voice'});
  assert.equal(map.view,'maps');
  assert.equal(map.clientAction.type,'map-query');
  assert.equal(map.clientAction.query,'Wawelu');
  const mind=f.actions.prepare('Dona pokaż mapę myśli filmu',{source:'voice'});
  assert.equal(mind.view,'youtube');
});
