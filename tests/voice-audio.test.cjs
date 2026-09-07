const test=require('node:test');
const assert=require('node:assert/strict');
const Meter=require('../pilot/voice-audio.js');
function setup(){
  const created=[];
  class Context {
    constructor(){this.state='running';this.nodes=[];this.destination={speaker:true};created.push(this);}
    resume(){this.state='running';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    createMediaStreamSource(stream){const node={stream,connections:[],disconnected:false,connect(target){this.connections.push(target);},disconnect(){this.disconnected=true;}};this.nodes.push(node);return node;}
    createAnalyser(){const node={fftSize:0,disconnected:false,getByteTimeDomainData(data){data.fill(this.sample??128);},disconnect(){this.disconnected=true;}};this.nodes.push(node);return node;}
  }
  const track={enabled:true,readyState:'live',stopped:false,stop(){this.stopped=true;}};
  const stream={getAudioTracks:()=>[track]};return{meter:new Meter(Context),created,track,stream};
}
test('a meter creates no audio resources until explicitly started',()=>{const f=setup();assert.equal(f.created.length,0);assert.equal(f.meter.sample('input'),0);f.meter.close();assert.equal(f.created.length,0);});
test('microphone and remote audio use one context and never connect to speakers',()=>{const f=setup();f.meter.attach('input',f.stream);f.meter.attach('output',f.stream);assert.equal(f.created.length,1);const context=f.created[0];for(const source of context.nodes.filter(n=>n.connections)){assert.equal(source.connections.length,1);assert.notEqual(source.connections[0],context.destination);}assert.equal(f.meter.inputs.size,2);});
test('silence stays still; audible samples have bounded energy',()=>{const f=setup();f.meter.attach('input',f.stream);const analyser=f.meter.inputs.get('input').analyser;assert.equal(f.meter.sample('input'),0);analyser.sample=140;assert.ok(f.meter.sample('input')>0);analyser.sample=255;assert.equal(f.meter.sample('input'),1);});
test('muted or ended tracks cannot drive the microphone animation',()=>{const f=setup();f.meter.attach('input',f.stream);f.meter.inputs.get('input').analyser.sample=180;f.track.enabled=false;assert.equal(f.meter.sample('input'),0);f.track.enabled=true;f.track.readyState='ended';assert.equal(f.meter.sample('input'),0);});
test('replacing an audio stream releases the previous graph',()=>{const f=setup();f.meter.attach('output',f.stream);const before=f.meter.inputs.get('output');f.meter.attach('output',f.stream);assert.equal(before.source.disconnected,true);assert.equal(before.analyser.disconnected,true);assert.equal(f.meter.inputs.size,1);});
test('closing releases every analyser and context while transport keeps stream ownership',()=>{const f=setup();f.meter.attach('input',f.stream);f.meter.attach('output',f.stream);const context=f.created[0];f.meter.close();assert.equal(context.state,'closed');assert.ok(context.nodes.every(n=>n.disconnected));assert.equal(f.meter.inputs.size,0);assert.equal(f.track.stopped,false);f.meter.close();f.meter.start();assert.equal(f.created.length,2);});
test('unavailable audio analysis never prevents the conversation',()=>{class Unavailable{constructor(){throw Error('unavailable');}}const meter=new Meter(Unavailable);assert.doesNotThrow(()=>meter.attach('input',{}));assert.equal(meter.sample('input'),0);assert.doesNotThrow(()=>meter.close());});
