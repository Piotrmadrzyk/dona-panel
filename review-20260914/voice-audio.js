/* Analysis only: this module never requests a microphone, plays audio or uploads it. */
(function (root) {
  'use strict';
  class DonaVoiceMeter {
    constructor(Context) { this.Context=Context; this.context=null; this.inputs=new Map(); }
    start() {
      if (!this.context && this.Context) { try { this.context=new this.Context(); } catch {} }
      if (this.context?.state==='suspended') this.context.resume().catch(()=>{});
    }
    attach(kind, stream) {
      this.detach(kind);this.start();if(!this.context||!stream)return;
      let source,analyser;
      try {
        source=this.context.createMediaStreamSource(stream);analyser=this.context.createAnalyser();
        analyser.fftSize=512;analyser.smoothingTimeConstant=.75;
        source.connect(analyser); // Intentionally no connection to destination: no echo/duplicate playback.
        this.inputs.set(kind,{source,analyser,stream,data:new Uint8Array(analyser.fftSize)});
      } catch { try{source?.disconnect();analyser?.disconnect();}catch{} }
    }
    detach(kind) {
      const input=this.inputs.get(kind);if(!input)return;
      try{input.source.disconnect();input.analyser.disconnect();}catch{}
      this.inputs.delete(kind);
    }
    sample(kind) {
      const input=this.inputs.get(kind);if(!input||this.context?.state!=='running')return 0;
      if(!input.stream.getAudioTracks().some(t=>t.enabled&&t.readyState!=='ended'))return 0;
      try {
        input.analyser.getByteTimeDomainData(input.data);
        let squares=0;for(const byte of input.data){const x=(byte-128)/128;squares+=x*x;}
        return Math.min(1,Math.max(0,Math.sqrt(squares/input.data.length)-.009)*7.5);
      }catch{return 0;}
    }
    close() {
      for(const kind of Array.from(this.inputs.keys()))this.detach(kind);
      const context=this.context;this.context=null;
      if(context&&context.state!=='closed')context.close().catch(()=>{});
      // Stream ownership belongs to the existing Realtime transport, which stops its tracks.
    }
  }
  if(typeof module==='object'&&module.exports)module.exports=DonaVoiceMeter;
  else root.DonaVoiceMeter=DonaVoiceMeter;
})(typeof window==='object'?window:{});
