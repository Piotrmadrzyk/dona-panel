const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Simulate replacing the view while real feature code awaits a deferred response.
// Detached elements remain distinct objects, as they do after a DOM rerender.
function panel() {
  const nodes = new Map(), listeners = new Map(), requests = [], timers = [];
  const element = () => ({value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},setAttribute(){},close(){this.open=false;},showModal(){this.open=true;}});
  const root = element();
  Object.defineProperty(root,'innerHTML',{set(html){
    nodes.clear();nodes.set('viewContent',root);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    for(const id of ids)nodes.set(id,element());
    for(const id of ['youtubeForm','driveForm'])if(nodes.has(id)){const button=element();nodes.get(id).querySelector=()=>button;}
  }});
  nodes.set('viewContent',root);
  const on=(type,callback)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);};
  const window={addEventListener:on,dispatchEvent(event){for(const callback of listeners.get(event.type)||[])callback(event);},Dona:{request(endpoint,body){return new Promise((resolve,reject)=>requests.push({endpoint,body,resolve,reject}));}}};
  const document={body:{appendChild(){}},createElement:element,getElementById:id=>nodes.get(id)||null,addEventListener:on};
  const context=vm.createContext({window,document,URL,TypeError,console,setTimeout:callback=>{timers.push(callback);},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../pilot/features.js'),'utf8'),context);
  const render=view=>window.DonaFeatures.render(view,{mediaAnalyses:[]},false);
  const input=(id,value)=>{const target=nodes.get(id);target.value=value;for(const callback of listeners.get('input')||[])callback({target:{id,value}});};
  const submit=async id=>{for(const callback of listeners.get('submit')||[])callback({target:{id},preventDefault(){}});await Promise.resolve();};
  const flush=async()=>{await Promise.resolve();await Promise.resolve();};
  return {nodes,window,requests,timers,render,input,submit,flush};
}

const result={ok:true,status:'SUCCESS',title:'Gotowa analiza',folderUrl:'https://drive.google.com/drive/folders/example',files:[],stages:{summary:true},processedAt:'2026-09-08T10:00:00Z',reused:true};

test('YouTube keeps its request, URL and result across navigation and refresh',async()=>{
  const p=panel();p.render('youtube');p.input('youtubeUrl','https://youtu.be/Dr3Q-Ju_c3U');
  await p.submit('youtubeForm');const oldStatus=p.nodes.get('youtubeStatus');
  p.render('marketing');p.render('youtube');
  assert.notEqual(p.nodes.get('youtubeStatus'),oldStatus);
  assert.match(p.nodes.get('youtubeStatus').textContent,/Czekam na wynik/);
  assert.equal(p.nodes.get('youtubeUrl').value,'https://youtu.be/Dr3Q-Ju_c3U');
  assert.equal(p.nodes.get('youtubeForm').querySelector().disabled,true);
  await p.submit('youtubeForm');assert.equal(p.requests.length,1);
  p.requests[0].resolve(result);await p.flush();
  assert.match(p.nodes.get('youtubeResults').innerHTML,/Gotowa analiza/);
  assert.equal(p.nodes.get('youtubeForm').querySelector().disabled,false);
  p.render('youtube');assert.match(p.nodes.get('youtubeResults').innerHTML,/Gotowa analiza/);
  assert.match(p.nodes.get('youtubeResults').innerHTML,/2026/);
});

test('Drive search works while YouTube is pending and keeps results when returning',async()=>{
  const p=panel();p.render('youtube');p.input('youtubeUrl','https://youtu.be/Dr3Q-Ju_c3U');await p.submit('youtubeForm');
  p.render('drive');p.input('driveQuery','Raport');await p.submit('driveForm');
  assert.equal(p.requests.length,2);assert.equal(p.requests[1].body.operation,'drive_search');
  p.render('marketing');
  p.requests[1].resolve({ok:true,results:[{id:'folder123456',name:'Raporty',type:'application/vnd.google-apps.folder',url:'https://drive.google.com/drive/folders/folder123456'}]});
  await p.flush();p.render('drive');
  assert.match(p.nodes.get('driveResults').innerHTML,/Raporty/);
  assert.doesNotMatch(p.nodes.get('driveResults').innerHTML,/data-drive-read/);
  assert.equal(p.nodes.get('driveQuery').value,'Raport');
  p.requests[0].resolve(result);await p.flush();
});

test('errors survive view replacement without silently retrying analysis',async()=>{
  const p=panel();p.render('youtube');p.input('youtubeUrl','https://youtu.be/Dr3Q-Ju_c3U');await p.submit('youtubeForm');
  p.render('marketing');p.requests[0].reject(Object.assign(new Error('timeout'),{name:'AbortError'}));await p.flush();
  p.render('youtube');assert.match(p.nodes.get('youtubeStatus').textContent,/zapisane foldery/);
  assert.equal(p.nodes.get('youtubeForm').querySelector().disabled,false);assert.equal(p.requests.length,1);
});

test('logout invalidates pending replies and removes private tool data',async()=>{
  const p=panel();p.render('youtube');p.input('youtubeUrl','https://youtu.be/Dr3Q-Ju_c3U');await p.submit('youtubeForm');
  p.window.dispatchEvent({type:'dona:auth',detail:{authenticated:false}});
  p.requests[0].resolve(result);await p.flush();p.render('youtube');
  assert.equal(p.nodes.get('youtubeResults').innerHTML,'');assert.equal(p.nodes.get('youtubeUrl').value,'');assert.equal(p.timers.length,0);
  p.input('youtubeUrl','https://youtu.be/Dr3Q-Ju_c3U');await p.submit('youtubeForm');assert.equal(p.requests.length,2);
  p.requests[1].resolve(result);await p.flush();
});

test('Drive errors are actionable and never crash after leaving the view',async()=>{
  const p=panel();p.render('drive');p.input('driveQuery','Raport');await p.submit('driveForm');p.render('marketing');
  p.requests[0].reject({code:'service_rate_limited'});await p.flush();p.render('drive');
  assert.match(p.nodes.get('driveStatus').textContent,/chwilowy limit/);
  assert.equal(p.nodes.get('driveForm').querySelector().disabled,false);
});
