(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const live=$('live'),canvas=$('voiceCanvas'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const meter=new window.DonaVoiceMeter(window.AudioContext||window.webkitAudioContext);
  const states={
    connect:{title:'Za chwilę porozmawiamy.',hint:'Przygotowuję połączenie głosowe.',kicker:'DONA LIVE',hue:218},
    listen:{title:'Słucham Cię.',hint:'Powiedz, co masz na myśli.',kicker:'JESTEM TUTAJ',hue:196},
    think:{title:'Daj mi chwilę.',hint:'Układam odpowiedź.',kicker:'MYŚLĘ',hue:245},
    work:{title:'Zajmuję się tym.',hint:'Czekam na wynik z systemu. Możesz dalej ze mną rozmawiać.',kicker:'DONA DZIAŁA',hue:241},
    speak:{title:'Porozmawiajmy.',hint:'Możesz mi przerwać w każdej chwili.',kicker:'ODPOWIADAM',hue:202},
    result:{title:'Mam odpowiedź.',hint:'Wynik pojawił się w rozmowie.',kicker:'ODPOWIEDŹ',hue:184},
    mute:{title:'Jestem tutaj.',hint:'Mikrofon jest wyciszony. Włącz go, kiedy chcesz mówić.',kicker:'CHWILA CISZY',hue:219},
    error:{title:'Sprawdźmy połączenie.',hint:'Potrzebna jest Twoja uwaga.',kicker:'POŁĄCZENIE',hue:331}
  };
  let visible=false,preview=false,phase='connect',energy=0,hue=218,frame=0,lastFrame=0;
  let startedAt=0,timer=0,previousFocus=null,captionOn=true,logicalSize=480;
  function caption(text,speaker){$('ltrans').textContent=text;$('captionSpeaker').textContent=speaker||'DONA';updateCaption();}
  function updateCaption(){const hasText=$('ltrans').textContent.trim().length>0;$('voiceCaption').classList.toggle('is-empty',!hasText);$('ltrans').scrollTop=$('ltrans').scrollHeight;}
  function state(next,raw){
    phase=states[next]?next:'connect';const s=states[phase];live.dataset.state=phase;
    $('voiceTitle').textContent=s.title;$('lhint').textContent=phase==='error'&&raw?raw:s.hint;
    $('voiceKicker').textContent=preview?'PODGLĄD WYGLĄDU · '+s.kicker:s.kicker;
    if(preview){$('voiceSessionLabel').textContent='Podgląd bez mikrofonu';$('voiceTimer').textContent='DEMO';}
    else $('voiceSessionLabel').textContent=startedAt?'Rozmowa na żywo':'Łączenie';
    live.querySelectorAll('[data-preview-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewState===phase)));
    if(reduced.matches)draw(2700);
  }
  function resize(){
    if(!visible||!ctx)return;logicalSize=canvas.getBoundingClientRect().width||480;
    const pixelRatio=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(logicalSize*pixelRatio);canvas.height=canvas.width;
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);if(reduced.matches)draw(2700);
  }
  function trace(radius,time,layer,power){
    const center=logicalSize/2,steps=132;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const a=i/steps*Math.PI*2,drift=layer*.2;
      const ripple=Math.sin(a*3+time*.48+drift)*.038+Math.cos(a*5-time*.33-drift*.6)*.019;
      const pulse=power*(Math.sin(a*4-time*1.7+drift)*.068+Math.cos(a*2+time)*.035);
      const r=radius*(1+ripple+pulse);
      const x=center+Math.cos(a)*r,y=center+Math.sin(a)*r*(.968+.025*Math.cos(time*.25+drift));
      if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }
  function draw(timestamp){
    if(!ctx||!visible)return;
    const time=reduced.matches?2.7:timestamp*.001;
    let target=0;
    if(preview&&phase!=='mute'&&phase!=='connect')target=phase==='speak'?(Math.sin(time*3.1)*.5+.5)*(.24+Math.sin(time*7.3)*.12):phase==='listen'?(Math.sin(time*1.6)*.5+.5)*.1:0;
    else if(!preview)target=Math.max(phase==='mute'?0:meter.sample('input'),meter.sample('output'));
    if(reduced.matches)target=0;
    energy+=(target-energy)*.19;hue+=(states[phase].hue-hue)*.035;
    live.style.setProperty('--voice-energy',energy.toFixed(3));
    window.drawDonaPresence(ctx,logicalSize,time,energy,hue,reduced.matches);
    live.classList.add('voice-canvas-ready');
  }
  function animate(time){
    if(!visible||document.hidden||reduced.matches){frame=0;return;}
    if(time-lastFrame>=32){lastFrame=time;draw(time);}frame=requestAnimationFrame(animate);
  }
  function run(){if(frame)cancelAnimationFrame(frame);frame=0;if(visible&&!document.hidden){if(reduced.matches)draw(2700);else frame=requestAnimationFrame(animate);}}
  function tick(){if(!visible||preview)return;const seconds=startedAt?Math.max(0,Math.floor((Date.now()-startedAt)/1000)):0;$('voiceTimer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
  function open(isPreview){
    if(visible)return;visible=true;preview=isPreview;startedAt=0;energy=0;previousFocus=document.activeElement;
    live.classList.add('show');live.dataset.preview=String(preview);live.dataset.connected='false';$('app').inert=true;
    $('voicePreviewControls').hidden=!preview;$('muteLive').disabled=preview;$('voiceEndLabel').textContent=preview?'Wróć do panelu':'Zakończ rozmowę';
    $('voiceTip').textContent=preview?'Podgląd animacji. Mikrofon i płatna rozmowa są wyłączone.':'Możesz przerwać odpowiedź, zaczynając mówić. Rozmowa rozliczana według użycia.';
    $('voiceCaption').hidden=!captionOn;$('captionToggle').setAttribute('aria-pressed',String(captionOn));
    if(preview){caption('Tu pojawią się słowa z Twojej rozmowy z DONĄ.','NAPISY');state('listen');}else{caption('','DONA');meter.start();state('connect');}
    resize();run();tick();clearInterval(timer);timer=setInterval(tick,1000);$('lclose').focus();
  }
  function close(){
    if(!visible)return;visible=false;live.classList.remove('show');cancelAnimationFrame(frame);frame=0;clearInterval(timer);timer=0;meter.close();
    $('app').inert=!(window.Dona.isAuthenticated()||window.Dona.isDemo);$('muteLive').disabled=false;
    if(previousFocus?.isConnected&&!$('app').inert)previousFocus.focus();
  }
  $('captionToggle').onclick=()=>{captionOn=!captionOn;$('voiceCaption').hidden=!captionOn;$('captionToggle').setAttribute('aria-pressed',String(captionOn));};
  $('voicePreviewControls').onclick=e=>{const button=e.target.closest('[data-preview-state]');if(!preview||!button)return;state(button.dataset.previewState);caption(phase==='speak'?'Możemy zacząć od jednej rzeczy. Co chcesz dziś ze mną załatwić?':phase==='think'?'Podgląd stanu: DONA przygotowuje odpowiedź.':'Powiedz, co masz na myśli.','PRZYKŁAD · BEZ DŹWIĘKU');};
  window.addEventListener('dona:voice-preview',()=>{if(window.Dona.isDemo)open(true);});
  window.addEventListener('dona:auth',()=>{if(visible)$('app').inert=true;});
  window.addEventListener('dona:voice-visibility',e=>{if(e.detail.open)open(false);else close();});
  window.addEventListener('dona:voice-state',e=>{if(visible&&!preview)state(e.detail.state,e.detail.text);});
  window.addEventListener('dona:voice-stream',e=>{if(visible&&!preview)meter.attach(e.detail.kind,e.detail.stream);});
  window.addEventListener('dona:voice-ready',()=>{if(visible&&!preview){startedAt=Date.now();live.dataset.connected='true';tick();}});
  window.addEventListener('dona:voice-caption',e=>{$('captionSpeaker').textContent=e.detail.speaker||'DONA';updateCaption();});
  window.addEventListener('resize',resize);window.addEventListener('pagehide',close);document.addEventListener('visibilitychange',run);
  reduced.addEventListener?.('change',run);
  document.addEventListener('keydown',e=>{
    if(!visible)return;if(e.key==='Escape'){e.preventDefault();$('lclose').click();return;}
    if(e.key==='Tab'){const buttons=Array.from(live.querySelectorAll('button:not([disabled])')).filter(b=>b.offsetParent!==null);const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  if(window.Dona.isDemo&&new URLSearchParams(location.search).get('voice')==='1')open(true);
})();
