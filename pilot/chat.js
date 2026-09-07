
(function(){
  var isDemo = new URLSearchParams(location.search).get("demo") === "1";
  var authenticated = false;
  function emit(name,detail){ window.dispatchEvent(new CustomEvent("dona:"+name,{detail:detail})); }
  function demoNotice(){ emit("notice","To podgląd na danych przykładowych. Zaloguj się, aby korzystać z DONY."); }
  var API="https://pmresearch.app.n8n.cloud/webhook";
  var CHAT_URL=API+"/dona-panel";
  var FILE_URL=API+"/dona-panel-plik";
  var MEM_URL=API+"/dona-panel-zapamietaj";
  var TTS_URL=API+"/dona-tts";
  var HIST_URL=API+"/dona-historia";
  var histWczytana=false;
  function zapiszHist(rola,tresc){ try{ fetch(HIST_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({haslo:sessionPw,operacja:"zapisz",sesja:"PM",rola:rola,tresc:tresc})}); }catch(e){} }
  function wczytajHist(){ if(isDemo||histWczytana||!sessionPw) return; histWczytana=true; var requestedPassword=sessionPw;
    panelPost(HIST_URL,{haslo:sessionPw,operacja:"wczytaj",sesja:"PM"},20000)
      .then(function(j){ if(!authenticated||sessionPw!==requestedPassword)return; if(j&&Array.isArray(j.historia)&&j.historia.length){ for(var i=0;i<j.historia.length;i++){ var h=j.historia[i]; add(h.rola==="user"?"me":"dona", h.tresc); } log.scrollTop=log.scrollHeight; } })
      .catch(function(){histWczytana=false;phase("Nie udało się wczytać historii. Odśwież ją w zakładce Historia rozmowy.");});
  }
  var TOKEN_URL=API+"/dona-realtime-token";

  // ---- ikony (cienkie, cyan) ----
  var IC={
    chart:'<svg class="ic" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>',
    users:'<svg class="ic" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    folder:'<svg class="ic" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    mail:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    mega:'<svg class="ic" viewBox="0 0 24 24"><path d="M3 10v4l11 4V6L3 10z"/><path d="M14 9a3 3 0 0 1 0 6"/></svg>',
    globe:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18c-3-3-3-15 0-18z"/></svg>',
    media:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
    wallet:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14" r="1.1"/></svg>',
    gear:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-1.7-1L14.9 3H9.1l-.5 2.6a7.5 7.5 0 0 0-1.7 1l-2.3-1-2 3.4L2.6 11a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 1.7 1l.5 2.6h5.8l.5-2.6a7.5 7.5 0 0 0 1.7-1l2.3 1 2-3.4z"/></svg>',
    mic:'<svg class="ic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
    headset:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4" height="6" rx="1.3"/><rect x="17.5" y="13" width="4" height="6" rx="1.3"/><path d="M20 19a3 3 0 0 1-3 3h-3"/></svg>',
    send:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 12l16-7-7 16-2-6-7-3z"/></svg>',
    close:'<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  document.getElementById("dictIc").innerHTML=IC.mic;
  document.getElementById("liveIc").innerHTML=IC.headset;
  document.getElementById("sendIc").innerHTML=IC.send;
  document.getElementById("closeIc").innerHTML=IC.close;

  var AGENTS=[
    {k:"chart",nm:"Sprzedaż",q:"Jak wygląda lejek sprzedaży?"},
    {k:"users",nm:"Klienci",q:"Co mam dzisiaj i kto czeka na odpowiedź?"},
    {k:"folder",nm:"Dysk",q:"Znajdź ostatnie dokumenty na dysku."},
    {k:"mail",nm:"Poczta",q:"Co pilnego jest w skrzynce?"},
    {k:"mega",nm:"Marketing",q:"Napisz krótki post na LinkedIn."},
    {k:"globe",nm:"WWW",q:"Jak stoją nasze kampanie i strony?"},
    {k:"media",nm:"Media",q:"Podsumuj ostatnie nagranie."},
    {k:"wallet",nm:"Pieniądze",q:"Ile poszło na OpenAI w tym miesiącu?"},
    {k:"gear",nm:"System",q:"Jacy agenci są w systemie?"}
  ];

  // ---- localStorage bezpieczny ----
  var KEY="pm_panel_haslo";
  function lsGet(k){ try{ return localStorage.getItem(k)||""; }catch(e){ return ""; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
  var sessionPw=isDemo?"":lsGet(KEY);

  var gate=document.getElementById("gate");
  var pw=document.getElementById("pw");
  var remember=document.getElementById("remember");
  var pwErr=document.getElementById("pwErr");
  function openGate(){ authenticated=false; gate.style.display="flex"; document.getElementById("app").inert=true; emit("auth",{authenticated:false,demo:false}); setTimeout(function(){pw.focus();},50); }
  function closeGate(){ authenticated=!isDemo; gate.style.display="none"; document.getElementById("app").inert=false; emit("auth",{authenticated:authenticated,demo:isDemo}); }
  if(isDemo){setTimeout(closeGate,0);}else if(sessionPw){setTimeout(function(){ask("",undefined,true).then(function(ok){if(ok){closeGate();wczytajHist();}else{sessionPw="";lsDel(KEY);openGate();}}).catch(function(){openGate();pwErr.textContent="Zaloguj się ponownie, aby potwierdzić połączenie.";});},0);}else{openGate();}
  function tryLogin(){
    var v=pw.value.trim(); if(!v) return;
    pwErr.textContent="Sprawdzam...";
    ask("Cześć",v,true).then(function(ok){
      if(ok){ sessionPw=v; if(remember.checked){ lsSet(KEY,v); }else{lsDel(KEY);} closeGate(); pw.value=""; pwErr.textContent=""; setTimeout(wczytajHist,300); }
      else { pwErr.textContent="Błędne hasło."; }
    }).catch(function(e){ pwErr.textContent=e.message==='AUTH'?"Błędne hasło.":"Nie udało się połączyć. Spróbuj ponownie."; });
  }
  document.getElementById("pwBtn").addEventListener("click",tryLogin);
  pw.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); tryLogin(); }});

  // ---- zegar (desktop) ----
  var clock=document.getElementById("clock");
  function tick(){ var d=new Date();
    var hh=("0"+d.getHours()).slice(-2), mm=("0"+d.getMinutes()).slice(-2);
    clock.textContent=hh+":"+mm; }
  tick(); setInterval(tick,20000);

  // ---- scena orbity (desktop) ----
  var orbit=document.getElementById("orbit");
  var wires=document.getElementById("wires");
  var nodesBox=document.getElementById("nodes");
  function buildOrbit(){
    var W=orbit.clientWidth||520; var R=W/2, radius=R*0.9;
    wires.setAttribute("viewBox","0 0 "+W+" "+W);
    wires.innerHTML=""; nodesBox.innerHTML="";
    for(var i=0;i<AGENTS.length;i++){
      var a=AGENTS[i];
      var ang=(i/AGENTS.length)*Math.PI*2 - Math.PI/2;
      var x=Math.cos(ang)*radius, y=Math.sin(ang)*radius;
      var ex=R+x, ey=R+y;
      var mx=(R+ex)/2 + (y*0.14), my=(R+ey)/2 - (x*0.14);
      var p=document.createElementNS("http://www.w3.org/2000/svg","path");
      p.setAttribute("class","wire"); p.setAttribute("d","M "+R+" "+R+" Q "+mx+" "+my+" "+ex+" "+ey);
      p.style.animationDelay=(i*0.14)+"s"; wires.appendChild(p);
      var side=(x<-1)?"lf":"rt";
      var el=document.createElement("div"); el.className="node "+side;
      el.style.left=ex+"px"; el.style.top=ey+"px";
      el.innerHTML='<span class="dot"></span><span class="lb">'+a.nm+'</span>';
      (function(a){ el.addEventListener("click",function(){ openBranch(a); }); })(a);
      nodesBox.appendChild(el);
    }
  }
  buildOrbit();
  var rz; window.addEventListener("resize",function(){ clearTimeout(rz); rz=setTimeout(function(){ buildOrbit(); buildLiveOrbit(); },200); });

  // ---- szybkie akcje (pasek) ----
  var quick=document.getElementById("quick");
  for(var i=0;i<AGENTS.length;i++){ (function(a){
    var el=document.createElement("div"); el.className="qpill";
    el.innerHTML='<span class="ic">'+IC[a.k]+'</span><span>'+a.nm+'</span>';
    el.addEventListener("click",function(){ openBranch(a); });
    quick.appendChild(el);
  })(AGENTS[i]); }

  // ---- czat ----
  var log=document.getElementById("log");
  var inp=document.getElementById("inp");
  var btn=document.getElementById("btn");
  var core=document.getElementById("core");
  var lcore=document.getElementById("lcore");
  function think(on){ core.classList.toggle("think",on); lcore.classList.toggle("think",on); }
  function speakAnim(on){ core.classList.toggle("speak",on); lcore.classList.toggle("speak",on); }
  var busy=false, lastText="";
  function setInput(t){ inp.value=t; inp.focus(); }

  function add(cls,text){
    var d=document.createElement("div"); d.className="msg "+cls; d.textContent=text;
    log.appendChild(d); log.scrollTop=log.scrollHeight; return d;
  }
  function addRetry(text,onRetry){
    var d=document.createElement("div"); d.className="msg sys";
    d.textContent=text+" ";
    var b=document.createElement("span"); b.className="retry"; b.textContent="Ponów";
    b.addEventListener("click",function(){ d.remove(); onRetry(); });
    d.appendChild(b); log.appendChild(d); log.scrollTop=log.scrollHeight; return d;
  }

  // ---- glos Dony (TTS, naturalne tempo) ----
  var voiceOn=(lsGet("pm_glos")!=="off");
  var voiceBtn=document.getElementById("voiceBtn");
  function paintVoice(){ voiceBtn.classList.toggle("on",voiceOn); voiceBtn.textContent=voiceOn?"Głos wł.":"Głos wył."; voiceBtn.setAttribute("aria-pressed",String(voiceOn)); }
  paintVoice();
  var synth=window.speechSynthesis||null, plVoice=null;
  function pickVoice(){ if(!synth)return; var vs=synth.getVoices()||[];
    var pref=["zosia","paulina","google","microsoft"], best=null;
    for(var p=0;p<pref.length&&!best;p++){ for(var i=0;i<vs.length;i++){ var v=vs[i];
      if((v.lang||"").toLowerCase().indexOf("pl")===0 && (v.name||"").toLowerCase().indexOf(pref[p])>=0){ best=v; break; } } }
    if(!best){ for(var j=0;j<vs.length;j++){ if((vs[j].lang||"").toLowerCase().indexOf("pl")===0){ best=vs[j]; break; } } }
    if(best) plVoice=best;
  }
  if(synth){ pickVoice(); if(synth.onvoiceschanged!==undefined){ synth.onvoiceschanged=pickVoice; } }
  var RATES=[0.9,1.0,1.1]; var rateIdx=parseInt(lsGet("pm_tempo"),10);
  if(isNaN(rateIdx)||rateIdx<0||rateIdx>=RATES.length){ rateIdx=1; }
  var rateBtn=document.getElementById("rateBtn");
  function paintRate(){ rateBtn.textContent=RATES[rateIdx]+"×"; }
  paintRate();
  rateBtn.addEventListener("click",function(){ rateIdx=(rateIdx+1)%RATES.length; lsSet("pm_tempo",String(rateIdx)); paintRate(); });
  function speakBrowser(text){ if(!synth) return;
    try{ synth.cancel(); var u=new SpeechSynthesisUtterance(text);
      u.lang="pl-PL"; if(plVoice)u.voice=plVoice; u.rate=RATES[rateIdx]; u.pitch=1.0;
      u.onstart=function(){speakAnim(true);}; u.onend=function(){speakAnim(false);}; u.onerror=function(){speakAnim(false);};
      synth.speak(u);
    }catch(e){}
  }
  var ttsAudio=null;
  function speak(text){ if(isDemo||!voiceOn||!text||liveOn) return;
    try{ if(synth) synth.cancel(); }catch(e){}
    try{ if(ttsAudio){ ttsAudio.pause(); ttsAudio=null; } }catch(e){}
    fetch(TTS_URL,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({haslo:sessionPw,tekst:text}) })
      .then(function(r){ if(!r.ok) throw new Error("tts"); return r.blob(); })
      .then(function(b){ if(liveOn||!voiceOn)return; var url=URL.createObjectURL(b); ttsAudio=new Audio(url);
        ttsAudio.onplay=function(){speakAnim(true);}; ttsAudio.onended=function(){speakAnim(false); URL.revokeObjectURL(url);}; ttsAudio.onerror=function(){speakAnim(false);};
        var p=ttsAudio.play(); if(p&&p.catch){ p.catch(function(){ speakBrowser(text); }); }
      })
      .catch(function(){ speakBrowser(text); });
  }
  voiceBtn.addEventListener("click",function(){ voiceOn=!voiceOn; lsSet("pm_glos",voiceOn?"on":"off"); paintVoice();
    if(!voiceOn){ stopAllSpeech(); } });

  // ---- rozmowa tekstowa z prawdziwa Dona ----
  function ask(text,pwOverride,probe){
    return fetch(CHAT_URL,{ method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({wiadomosc:text,haslo:(pwOverride!==undefined?pwOverride:sessionPw),probe:!!probe}) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j&&j.error==="auth"){ if(!probe){ lsDel(KEY); sessionPw=""; openGate(); } return probe?false:null; }
        if(probe) return true;
        return (j&&j.answer)?j.answer:"";
      });
  }

  function send(text){
    text=(text!==undefined?text:inp.value).trim(); if(!text||busy) return;
    lastText=text; busy=true; btn.disabled=true; think(true); add("me",text); zapiszHist("user",text); inp.value="";
    var tip=document.createElement("div"); tip.className="msg dona typing";
    tip.innerHTML="<span></span><span></span><span></span>"; log.appendChild(tip); log.scrollTop=log.scrollHeight;
    ask(text).then(function(ans){ tip.remove();
      if(ans===null){ addRetry("Sesja wygasła — zaloguj się ponownie.",function(){}); }
      else if(!ans){ add("dona","Nie dostałam teraz odpowiedzi. Spróbuj jeszcze raz."); }
      else { add("dona",ans); speak(ans); zapiszHist("dona",ans); }
    }).catch(function(){ tip.remove();
      addRetry("Nie udało się połączyć.",function(){ send(text); });
    }).finally(function(){ busy=false; btn.disabled=false; think(false); });
  }
  btn.addEventListener("click",function(){ send(); });
  var memBtn=document.getElementById("memBtn");
  if(memBtn){
    memBtn.addEventListener("click",function(){
      if(isDemo){demoNotice();return;}
      var t=(inp.value||"").trim();
      if(!t||busy){ if(!t){ add("sys","Wpisz najpierw tresc do zapamietania."); } return; }
      busy=true; btn.disabled=true; memBtn.disabled=true; think(true);
      add("me","🧠 zapamietaj: "+t); inp.value="";
      panelPost(MEM_URL,{haslo:sessionPw,tresc:t,typ:"notatka"},60000)
        .then(function(j){ if(j&&j.error==="auth"){ lsDel(KEY); sessionPw=""; openGate(); add("sys","Sesja wygasla - zaloguj sie ponownie."); return; } var a=(j&&j.answer)?j.answer:"Nie otrzymałam potwierdzenia zapisu notatki."; add("dona",a); if(typeof zapiszHist==="function"){ zapiszHist("dona",a); } })
        .catch(function(e){ add("sys",requestError(e)); })
        .finally(function(){ busy=false; btn.disabled=false; memBtn.disabled=false; think(false); });
    });
  }
  var clipBtn=document.getElementById("clipBtn");
  var fileInp=document.getElementById("fileInp");
  if(clipBtn&&fileInp){
    clipBtn.addEventListener("click",function(){ if(isDemo){demoNotice();return;} if(!busy) fileInp.click(); });
    fileInp.addEventListener("change",function(){
      var f=fileInp.files&&fileInp.files[0]; if(!f||busy){ return; }
      if(f.size>3.5*1024*1024){add("sys","Ten plik przekracza limit panelu 3,5 MB. Użyj mniejszego pliku albo linku do Dysku.");fileInp.value="";return;}
      var komentarz=(inp.value||"").trim();
      busy=true; btn.disabled=true; clipBtn.disabled=true; think(true);
      add("me","📎 "+f.name+(komentarz?(" — "+komentarz):""));
      inp.value="";
      var tip=document.createElement("div"); tip.className="msg dona typing";
      tip.innerHTML="<span></span><span></span><span></span>"; log.appendChild(tip); log.scrollTop=log.scrollHeight;
      var reader=new FileReader();
      reader.onload=function(){
        var b64=String(reader.result||"");
        panelPost(FILE_URL,{haslo:sessionPw,nazwa:f.name,typ:(f.type||""),dane_base64:b64,komentarz:komentarz},165000)
          .then(function(j){ tip.remove();
            if(j&&j.error==="auth"){ lsDel(KEY); sessionPw=""; openGate(); add("sys","Sesja wygasla - zaloguj sie ponownie."); }
            else { var ans=(j&&j.answer)?j.answer:"Nie otrzymałam potwierdzenia odczytu ani zapisu pliku."; add("dona",ans); speak(ans); }
          })
          .catch(function(e){ tip.remove(); add("sys",requestError(e)); })
          .finally(function(){ busy=false; btn.disabled=false; clipBtn.disabled=false; think(false); fileInp.value=""; });
      };
      reader.onerror=function(){ tip.remove(); add("sys","Nie udalo sie odczytac pliku."); busy=false; btn.disabled=false; clipBtn.disabled=false; think(false); fileInp.value=""; };
      reader.readAsDataURL(f);
    });
  }
  core.addEventListener("click",function(){ if(!liveOn&&!busy) golive.click(); });
  inp.addEventListener("keydown",function(e){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }});

  // ---- DYKTOWANIE (darmowe) ----
  var dictBtn=document.getElementById("dictBtn");
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
  if(!SR){ dictBtn.style.display="none"; }
  else{
    var rec=new SR(); rec.lang="pl-PL"; rec.interimResults=false; rec.maxAlternatives=1;
    var recording=false;
    rec.onresult=function(e){ var t=""; for(var i=0;i<e.results.length;i++){ t+=e.results[i][0].transcript; } inp.value=t.trim(); };
    rec.onerror=function(e){ recording=false; dictBtn.classList.remove("rec");
      if(e&&(e.error==="not-allowed"||e.error==="service-not-allowed")){ add("sys","Mikrofon zablokowany przez przeglądarkę. Możesz pisać tekstem."); } };
    rec.onend=function(){ recording=false; dictBtn.classList.remove("rec"); if(inp.value.trim()){ send(); } };
    dictBtn.addEventListener("click",function(){
      if(isDemo){demoNotice();return;}
      if(liveOn) return;
      if(recording){ try{rec.stop();}catch(e){} return; }
      try{ recording=true; dictBtn.classList.add("rec"); inp.value=""; rec.start(); }
      catch(e){ recording=false; dictBtn.classList.remove("rec"); }
    });
  }

  // ======================================================================
  // TRYB "ROZMOWA NA ZYWO" (Apex, pelny ekran) + OpenAI Realtime
  // ======================================================================
  var liveEl=document.getElementById("live");
  var golive=document.getElementById("golive");
  var lstop=document.getElementById("lstop");
  var lclose=document.getElementById("lclose");
  var ltrans=document.getElementById("ltrans");
  var lhint=document.getElementById("lhint");
  var lwires=document.getElementById("lwires");
  var lnodes=document.getElementById("lnodes");
  var liveOn=false, pc=null, dc=null, micStream=null, audioEl=null;

  function buildLiveOrbit(){
    var box=document.getElementById("lorbit"); if(!box) return;
    var W=box.clientWidth||560; var R=W/2, radius=R*0.9;
    lwires.setAttribute("viewBox","0 0 "+W+" "+W);
    lwires.innerHTML=""; lnodes.innerHTML="";
    for(var i=0;i<AGENTS.length;i++){
      var a=AGENTS[i];
      var ang=(i/AGENTS.length)*Math.PI*2 - Math.PI/2;
      var x=Math.cos(ang)*radius, y=Math.sin(ang)*radius, ex=R+x, ey=R+y;
      var mx=(R+ex)/2 + (y*0.14), my=(R+ey)/2 - (x*0.14);
      var p=document.createElementNS("http://www.w3.org/2000/svg","path");
      p.setAttribute("class","lwire"); p.setAttribute("d","M "+R+" "+R+" Q "+mx+" "+my+" "+ex+" "+ey);
      p.style.animationDelay=(i*0.13)+"s"; lwires.appendChild(p);
      var side=(x<-1)?"lf":"rt";
      var el=document.createElement("div"); el.className="lnode "+side;
      el.style.left=ex+"px"; el.style.top=ey+"px";
      el.innerHTML='<span class="d"></span><span>'+a.nm+'</span>';
      lnodes.appendChild(el);
    }
  }
  buildLiveOrbit();

  function showLive(on){ liveEl.classList.toggle("show",on); }
  function endLive(silent){
    liveOn=false; showLive(false); speakAnim(false);
    try{ if(dc) dc.close(); }catch(e){} dc=null;
    try{ if(pc) pc.close(); }catch(e){} pc=null;
    try{ if(micStream){ var tr=micStream.getTracks(); for(var i=0;i<tr.length;i++){ tr[i].stop(); } } }catch(e){} micStream=null;
    try{ if(audioEl){ audioEl.srcObject=null; audioEl.remove(); } }catch(e){} audioEl=null;
    if(!silent){ add("sys","Rozmowa na żywo zakończona."); }
  }
  lstop.addEventListener("click",function(){ endLive(false); });
  lclose.addEventListener("click",function(){ endLive(false); });

  golive.addEventListener("click",function(){
    if(isDemo){demoNotice();return;}
    if(liveOn){ endLive(false); return; }
    if(!window.RTCPeerConnection || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      add("sys","Rozmowa na żywo działa w pełnej wersji panelu (poza n8n). Na razie pisz tekstem lub dyktuj.");
      return;
    }
    if(!confirm("Włączyć rozmowę na żywo z Doną?\n\nTo tryb głosowy Realtime — płatny według czasu rozmowy. Świetny na pokaz; w codziennej pracy pisz tekstem.")) return;
    startLive();
  });

  function startLive(){
    showLive(true); liveOn=true; ltrans.textContent=""; lhint.textContent="Łączę z Doną...";
    fetch(TOKEN_URL,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({haslo:sessionPw}) })
      .then(function(r){ return r.json(); })
      .then(function(tok){
        if(tok&&tok.error==="auth"){ lsDel(KEY); sessionPw=""; openGate(); throw new Error("auth"); }
        var EK=tok&&(tok.value||(tok.client_secret&&tok.client_secret.value));
        if(!EK){ throw new Error("token"); }
        return startWebRTC(EK);
      })
      .then(function(){ lhint.textContent="Mów śmiało — możesz przerywać"; })
      .catch(function(e){
        endLive(true);
        if((e&&e.message)!=="auth"){ add("sys","Nie udało się włączyć rozmowy na żywo. Spróbuj ponownie za chwilę."); }
      });
  }

  function startWebRTC(EK){
    pc=new RTCPeerConnection();
    audioEl=document.createElement("audio"); audioEl.autoplay=true;
    pc.ontrack=function(e){ audioEl.srcObject=e.streams[0]; speakAnim(true); };
    return navigator.mediaDevices.getUserMedia({audio:true}).then(function(ms){
      micStream=ms; pc.addTrack(ms.getTracks()[0]);
      dc=pc.createDataChannel("oai-events"); dc.addEventListener("message",onRealtimeEvent);
      return pc.createOffer();
    }).then(function(offer){ return pc.setLocalDescription(offer).then(function(){ return offer; }); })
      .then(function(offer){
        return fetch("https://api.openai.com/v1/realtime/calls",{ method:"POST", body:offer.sdp,
          headers:{ "Authorization":"Bearer "+EK, "Content-Type":"application/sdp" } });
      }).then(function(r){ return r.text(); })
      .then(function(sdp){ return pc.setRemoteDescription({type:"answer",sdp:sdp}); });
  }
  function rtSend(o){ try{ if(dc&&dc.readyState==="open"){ dc.send(JSON.stringify(o)); } }catch(e){} }

  function onRealtimeEvent(ev){
    var m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
    var t=m.type||"";
    if(t==="conversation.item.input_audio_transcription.completed" && m.transcript){ ltrans.textContent="„"+m.transcript+"”"; }
    if(t==="response.output_audio_transcript.done" && m.transcript){ ltrans.textContent=m.transcript; add("voice",m.transcript); }
    if(t==="response.function_call_arguments.done" && m.name==="ask_dona"){
      var callId=m.call_id, args={}; try{ args=JSON.parse(m.arguments||"{}"); }catch(e){}
      var pytanie=args.pytanie||args.question||args.text||"";
      ask(pytanie).then(function(ans){
        rtSend({ type:"conversation.item.create", item:{ type:"function_call_output", call_id:callId, output:JSON.stringify({odpowiedz:ans||""}) } });
        rtSend({ type:"response.create" });
      }).catch(function(){
        rtSend({ type:"conversation.item.create", item:{ type:"function_call_output", call_id:callId, output:JSON.stringify({odpowiedz:"Nie udało się połączyć z systemem Dony."}) } });
        rtSend({ type:"response.create" });
      });
    }
    if(t==="output_audio_buffer.stopped" || t==="response.done"){ speakAnim(false); }
  }


var panelVersion = '4.0-pilot';
var panelConversationId = lsGet('pm_panel_conversation_id') || 'panel-owner';
var panelBusyCount = 0, rtSession = null, rtSequence = 0;
var BRANCH_URL = API + '/dona-panel-branch';
var branchMap = {'Sprzedaż':'sprzedaz','Klienci':'klienci','Dysk':'dysk','Poczta':'poczta','Marketing':'marketing','WWW':'www','Media':'media','Pieniądze':'pieniadze','System':'system','Research':'research','Serwis':'serwis'};
var branchDialog = document.getElementById('branchDialog');
var activeBranch = null, previousFocus = null;
try { localStorage.removeItem('pm_panel_haslo'); } catch(e) {}
function lsGet(k){ try { return (k === 'pm_panel_haslo' ? sessionStorage : localStorage).getItem(k)||''; }catch(e){ return ''; } }
function lsSet(k,v){ try { (k === 'pm_panel_haslo' ? sessionStorage : localStorage).setItem(k,v); }catch(e){} }
function lsDel(k){ try { (k === 'pm_panel_haslo' ? sessionStorage : localStorage).removeItem(k); if(k === 'pm_panel_haslo')localStorage.removeItem(k); }catch(e){} }
function phase(text){ var n=document.getElementById('operationStatus'); if(n)n.textContent=text;emit('phase',text); }
function lockPanel(on){
  panelBusyCount=Math.max(0,panelBusyCount+(on?1:-1));busy=panelBusyCount>0;
  ['btn','clipBtn','memBtn','dictBtn','logoutBtn'].forEach(function(id){var n=document.getElementById(id);if(n)n.disabled=busy;});
  if(core)core.classList.toggle('think',busy);
}
function safeLinks(node,text){
  var re=/https?:\/\/[^\s<>"']+/g, last=0,m;
  while((m=re.exec(text))){
    node.appendChild(document.createTextNode(text.slice(last,m.index)));
    var clean=m[0].replace(/[),.;!?]+$/,'');
    var a=document.createElement('a');a.textContent=clean;a.href=clean;a.target='_blank';a.rel='noopener noreferrer';
    node.appendChild(a);node.appendChild(document.createTextNode(m[0].slice(clean.length)));last=m.index+m[0].length;
  }
  node.appendChild(document.createTextNode(text.slice(last)));
}
function add(cls,text){
  var d=document.createElement('div');d.className='msg '+cls;safeLinks(d,String(text==null?'':text));
  d.dataset.createdAt=new Date().toISOString();log.appendChild(d);log.scrollTop=log.scrollHeight;emit('message',{role:cls,text:String(text||'')});return d;
}
async function panelPost(url,body,timeout){
  if(isDemo)throw new Error("DEMO");
  var ctrl=new AbortController(),timer=setTimeout(function(){ctrl.abort();},timeout||165000);
  try{
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal,cache:'no-store'});
    var raw=await r.text(),j;try{j=JSON.parse(raw);}catch(e){throw new Error('INVALID_RESPONSE');}
    if(r.status===401||j.error==='auth'){
      lsDel(KEY);sessionPw='';if(rtSession)endLive(true);openGate();throw new Error('AUTH');
    }
    if(!r.ok)throw new Error('HTTP '+r.status);
    if(j.error)throw new Error('BACKEND_ERROR');
    return j;
  }finally{clearTimeout(timer);}
}
async function ask(text,pwOverride,probe,live){
  var j=await panelPost(CHAT_URL,{wiadomosc:String(text||''),haslo:pwOverride!==undefined?pwOverride:sessionPw,probe:!!probe,conversation_id:panelConversationId,kanal:live?'panel_live':'panel'});
  if(probe)return j.ok===true;
  if(typeof j.answer!=='string'||!j.answer.trim())throw new Error('EMPTY_RESPONSE');
  return j.answer;
}
function zapiszHist(rola,tresc){
  if(!sessionPw)return;
  panelPost(HIST_URL,{haslo:sessionPw,operacja:'zapisz',sesja:'PM',rola:rola,tresc:String(tresc||'')},15000)
    .catch(function(){phase('Nie potwierdzono zapisu historii. Bieżący wynik pozostaje na ekranie.');});
}
function requestError(e){
  return e&&e.message==='AUTH'?'Zaloguj się ponownie. Nie ponawiam zlecenia automatycznie.':'Nie potwierdzono wyniku. Zadanie mogło dotrzeć do systemu — nie ponawiaj go w ciemno. Sprawdź status przed kolejnym zleceniem.';
}
function send(text){
  if(isDemo){demoNotice();return;}
  text=String(text!==undefined?text:inp.value).trim();if(!text||busy||liveOn)return;
  lastText=text;lockPanel(true);add('me',text);zapiszHist('user',text);inp.value='';phase('Czekam na odpowiedź Dony…');
  var tip=add('sys','Dona odpowiada…');
  ask(text).then(function(ans){tip.remove();add('dona',ans);zapiszHist('dona',ans);phase('Odpowiedź otrzymana');speak(ans);})
    .catch(function(e){tip.remove();add('sys',requestError(e));phase('Wynik niepotwierdzony');})
    .finally(function(){lockPanel(false);});
}
function openBranch(a){
  if(isDemo){demoNotice();return;}
  if(busy||liveOn){phase('Zaczekaj na bieżący wynik lub zakończ Live.');return;}
  activeBranch={id:branchMap[a.nm],name:a.nm};if(!activeBranch.id)return;
  previousFocus=document.activeElement;
  document.getElementById('branchTitle').textContent=a.nm+' — nowe zadanie';
  document.getElementById('branchText').value=inp.value||'';
  branchDialog.showModal();document.getElementById('branchText').focus();
}
function closeBranch(){branchDialog.close();if(previousFocus&&previousFocus.focus)previousFocus.focus();}
async function runBranch(){
  var text=document.getElementById('branchText').value.trim();if(!text||!activeBranch||busy)return;
  var selected={id:activeBranch.id,name:activeBranch.name};closeBranch();lockPanel(true);
  add('me','['+selected.name+'] '+text);zapiszHist('user','['+selected.name+'] '+text);phase('Zlecenie → '+selected.name);
  var tip=add('sys',selected.name+': czekam na wynik…');
  document.querySelectorAll('[data-branch="'+selected.id+'"]').forEach(function(n){n.classList.add('running');});
  try{
    var j=await panelPost(BRANCH_URL,{haslo:sessionPw,galaz:selected.id,polecenie:text,tryb:selected.id==='research'?'szybka':''});
    if(typeof j.answer!=='string'||!j.answer.trim())throw new Error('EMPTY_RESPONSE');
    add('dona','['+selected.name+']\n'+j.answer);zapiszHist('dona','['+selected.name+']\n'+j.answer);
    phase(j.ok===false?'Gałąź zgłosiła problem — sprawdź odpowiedź':'Otrzymano odpowiedź: '+selected.name);
  }catch(e){add('sys',requestError(e));phase('Wynik niepotwierdzony');}
  finally{tip.remove();lockPanel(false);document.querySelectorAll('.running').forEach(function(n){n.classList.remove('running');});}
}
document.getElementById('branchCancel').onclick=closeBranch;
document.getElementById('branchRun').onclick=runBranch;
document.getElementById('branchText').onkeydown=function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();runBranch();}};
['Research','Serwis'].forEach(function(nm){var b=document.createElement('button');b.className='qpill';b.textContent=nm;b.onclick=function(){openBranch({nm:nm});};quick.appendChild(b);});
document.querySelectorAll('.node,.qpill').forEach(function(n){var label=(n.textContent||'').trim();if(branchMap[label])n.dataset.branch=branchMap[label];n.setAttribute('role','button');n.tabIndex=0;n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();n.click();}});});
document.getElementById('logoutBtn').onclick=function(){if(busy)return;endLive(true);stopAllSpeech();sessionPw='';lsDel(KEY);log.textContent='';histWczytana=false;authenticated=false;openGate();phase('Wylogowano');};
function stopAllSpeech(){try{if(synth)synth.cancel();}catch(e){}try{if(ttsAudio){ttsAudio.pause();ttsAudio.src='';ttsAudio=null;}}catch(e){}speakAnim(false);}
function liveState(s,text){
  if(lhint)lhint.textContent=text||s;
  if(lcore){lcore.classList.toggle('think',s==='work'||s==='think');lcore.classList.toggle('speak',s==='speak');}
  document.querySelectorAll('#liveSteps [data-step]').forEach(function(n){n.classList.toggle('active',n.dataset.step===s);});
}
function isCurrent(s){return !!s&&!s.closed&&rtSession===s&&liveOn;}
function closeTransport(s){
  if(!s||s.closed)return;s.closed=true;
  clearTimeout(s.connectionTimer);clearTimeout(s.disconnectTimer);clearTimeout(s.idleTimer);clearTimeout(s.maxTimer);
  if(s.abort)s.abort.abort();
  try{if(s.dc)s.dc.close();}catch(e){}try{if(s.pc)s.pc.close();}catch(e){}
  try{if(s.stream)s.stream.getTracks().forEach(function(t){t.stop();});}catch(e){}
  try{if(s.audio){s.audio.pause();s.audio.srcObject=null;s.audio.remove();}}catch(e){}
}
function endLive(silent){
  var s=rtSession;rtSession=null;liveOn=false;closeTransport(s);pc=dc=micStream=audioEl=null;
  showLive(false);speakAnim(false);if(lcore)lcore.classList.remove('think');
  if(!silent){add('sys',s&&s.pending?'Rozmowa zakończona. Wysłane zlecenie może nadal pracować — zakończenie Live go nie anuluje.':'Rozmowa na żywo zakończona. Mikrofon wyłączony.');}
}
function failLive(s,message){if(!isCurrent(s))return;endLive(true);add('sys',message);phase('Live zatrzymane');}
function sendRT(s,o){if(isCurrent(s)&&s.dc&&s.dc.readyState==='open'){s.dc.send(JSON.stringify(o));return true;}return false;}
function rtSend(o){return sendRT(rtSession,o);}
function scheduleReply(s){
  if(!isCurrent(s)||!s.replyDue||s.responding||s.userSpeaking)return;
  s.replyDue=false;sendRT(s,{type:'response.create'});
}
function touchLive(s){
  if(!isCurrent(s))return;clearTimeout(s.idleTimer);
  s.idleTimer=setTimeout(function(){if(s.pending||s.responding){touchLive(s);return;}failLive(s,'Live wyłączone po 3 minutach bezczynności. Mikrofon jest wyłączony.');},180000);
}
async function runLiveTool(s,it){
  var id=it.call_id;if(!id||!it.name||s.seenCalls.has(id))return;s.seenCalls.add(id);
  if(it.name!=='ask_dona'){sendRT(s,{type:'conversation.item.create',item:{type:'function_call_output',call_id:id,output:JSON.stringify({ok:false,error:'Niedozwolone narzędzie'})}});s.replyDue=true;scheduleReply(s);return;}
  var args;try{args=JSON.parse(it.arguments||'{}');}catch(e){args={};}
  var q=typeof args.pytanie==='string'?args.pytanie.trim():'';
  if(!q||q.length>20000||busy){
    sendRT(s,{type:'conversation.item.create',item:{type:'function_call_output',call_id:id,output:JSON.stringify({ok:false,not_started:true,reason:busy?'Poprzednie zlecenie nadal pracuje. Nie uruchomiono kolejnego.':'Brak poprawnego polecenia.'})}});
    s.replyDue=true;scheduleReply(s);return;
  }
  s.pending++;lockPanel(true);touchLive(s);liveState('work','ZLECENIE PRZEKAZANE DO SYSTEMU');phase('Live: czekam na wynik zadania…');
  add('sys','Zlecenie głosowe: '+q);
  try{
    var answer=await ask(q,undefined,false,true);
    add('dona',answer);zapiszHist('dona',answer);phase('Wynik systemu otrzymany — sprawdź odpowiedź');
    if(isCurrent(s)){
      sendRT(s,{type:'conversation.item.create',item:{type:'function_call_output',call_id:id,output:JSON.stringify({odpowiedz:answer})}});
      ltrans.textContent=answer;liveState('result','ODPOWIEDŹ SYSTEMU OTRZYMANA');s.replyDue=true;scheduleReply(s);
    }
  }catch(e){
    var msg=requestError(e);add('sys',msg);phase('Wynik zadania niepotwierdzony');
    if(isCurrent(s)){sendRT(s,{type:'conversation.item.create',item:{type:'function_call_output',call_id:id,output:JSON.stringify({ok:false,status:'UNKNOWN',odpowiedz:msg})}});s.replyDue=true;scheduleReply(s);}
  }finally{s.pending--;lockPanel(false);}
}
function onRealtimeEvent(ev,session){
  var s=session||rtSession;if(!isCurrent(s))return;
  var m;try{m=JSON.parse(ev.data);}catch(e){return;}var t=m.type||'';
  if(t==='input_audio_buffer.speech_started'){s.userSpeaking=true;touchLive(s);liveState('listen','SŁUCHAM');s.text='';ltrans.textContent='Słucham…';}
  if(t==='input_audio_buffer.speech_stopped'){s.userSpeaking=false;liveState('think','ROZUMIEM…');}
  if(t==='response.created'){s.responding=true;s.text='';liveState(s.pending?'work':'think',s.pending?'ZADANIE W TOKU':'DONA ODPOWIADA…');}
  if(t==='response.output_audio_transcript.delta'||t==='response.audio_transcript.delta'){s.text+=m.delta||'';ltrans.textContent=s.text;}
  if(t==='output_audio_buffer.started'){liveState('speak','DONA MÓWI');}
  if(t==='output_audio_buffer.stopped'||t==='output_audio_buffer.cleared'){liveState(s.pending?'work':'listen',s.pending?'ZADANIE W TOKU — MOŻESZ DALEJ ROZMAWIAĆ':'SŁUCHAM');touchLive(s);}
  if(t==='conversation.item.input_audio_transcription.completed'&&m.transcript){
    var key='u:'+(m.item_id||m.event_id);if(!s.seenText.has(key)){s.seenText.add(key);add('me',m.transcript);zapiszHist('user',m.transcript);}
  }
  if((t==='response.output_audio_transcript.done'||t==='response.audio_transcript.done')&&m.transcript){
    var ak='a:'+(m.item_id||m.response_id||m.event_id);if(!s.seenText.has(ak)){s.seenText.add(ak);add('voice',m.transcript);zapiszHist('dona',m.transcript);}ltrans.textContent=m.transcript;
  }
  if(t==='response.function_call_arguments.done')runLiveTool(s,m);
  if(t==='response.done'){
    s.responding=false;
    var response=m.response||{};
    if(response.status==='completed'&&Array.isArray(response.output))response.output.forEach(function(it){if(it.type==='function_call')runLiveTool(s,it);});
    if(response.status==='failed'){phase('Realtime nie ukończyło odpowiedzi');liveState('error','ODPOWIEDŹ NIEUDANA');}
    scheduleReply(s);
  }
  if(t==='error'){
    var code=m.error&&m.error.code;
    if(code==='response_cancel_not_active')return;
    if(code==='conversation_already_has_active_response'){s.replyDue=true;return;}
    failLive(s,'Realtime zwróciło błąd. Sesja i mikrofon zostały wyłączone. Wysłane zadanie nie jest ponawiane automatycznie.');
  }
}
async function startLive(){
  if(isDemo){demoNotice();return;}
  if(liveOn||busy)return;if(!sessionPw){openGate();return;}
  if(!window.RTCPeerConnection||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){add('sys','Uruchom panel w przeglądarce z obsługą mikrofonu przez HTTPS.');return;}
  var s={id:++rtSequence,closed:false,pc:null,dc:null,stream:null,audio:null,abort:new AbortController(),seenCalls:new Set(),seenText:new Set(),pending:0,responding:false,userSpeaking:false,replyDue:false,text:''};
  rtSession=s;liveOn=true;stopAllSpeech();
  try{if(typeof recording!=='undefined'&&recording&&rec)rec.abort();}catch(e){}
  document.getElementById('muteLive').textContent='Wycisz mikrofon';document.getElementById('resumeAudio').hidden=true;
  showLive(true);buildLiveOrbit();liveState('connect','ŁĄCZĘ…');ltrans.textContent='Zezwól na mikrofon. Live jest usługą płatną.';
  s.connectionTimer=setTimeout(function(){failLive(s,'Połączenie Live nie zostało zestawione w 30 sekund. Mikrofon wyłączony.');},30000);
  try{
    var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(!isCurrent(s)){stream.getTracks().forEach(function(t){t.stop();});return;}s.stream=stream;micStream=stream;
    var tok=await panelPost(TOKEN_URL,{haslo:sessionPw},20000);if(!isCurrent(s))return;
    var key=tok.value||(tok.client_secret&&tok.client_secret.value);if(typeof key!=='string'||!key)throw new Error('TOKEN');
    s.pc=new RTCPeerConnection();pc=s.pc;s.audio=document.createElement('audio');audioEl=s.audio;s.audio.autoplay=true;s.audio.setAttribute('playsinline','');document.body.appendChild(s.audio);
    s.pc.ontrack=function(e){if(!isCurrent(s))return;s.audio.srcObject=e.streams[0]||new MediaStream([e.track]);s.audio.play().catch(function(){if(isCurrent(s)){document.getElementById('resumeAudio').hidden=false;liveState('error','KLIKNIJ „WŁĄCZ DŹWIĘK”');}});};
    s.pc.onconnectionstatechange=function(){
      if(!isCurrent(s))return;var st=s.pc.connectionState;
      if(st==='failed'||st==='closed')failLive(s,'Połączenie Live przerwane. Mikrofon wyłączony.');
      if(st==='disconnected')s.disconnectTimer=setTimeout(function(){if(isCurrent(s)&&s.pc.connectionState==='disconnected')failLive(s,'Utracono połączenie Live. Mikrofon wyłączony.');},6000);
      if(st==='connected')clearTimeout(s.disconnectTimer);
    };
    stream.getTracks().forEach(function(t){s.pc.addTrack(t,stream);});
    s.dc=s.pc.createDataChannel('oai-events');dc=s.dc;s.dc.onmessage=function(e){onRealtimeEvent(e,s);};
    s.dc.onclose=function(){if(isCurrent(s))failLive(s,'Kanał Live został zamknięty. Mikrofon wyłączony.');};
    s.dc.onopen=function(){
      if(!isCurrent(s))return;clearTimeout(s.connectionTimer);liveState('listen','SŁUCHAM — MÓW NORMALNIE');ltrans.textContent='Możesz rozmawiać i zlecać zadania. Aby przerwać odpowiedź, zacznij mówić.';touchLive(s);
      s.maxTimer=setTimeout(function(){failLive(s,'Sesja Live zakończona po 15 minutach. Możesz uruchomić kolejną.');},900000);
    };
    var offer=await s.pc.createOffer();if(!isCurrent(s))return;await s.pc.setLocalDescription(offer);
    var r=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/sdp'},body:offer.sdp,signal:s.abort.signal});
    key='';if(!r.ok)throw new Error('REALTIME_HTTP_'+r.status);var answer=await r.text();if(!isCurrent(s))return;
    if(!answer.startsWith('v=0'))throw new Error('INVALID_SDP');await s.pc.setRemoteDescription({type:'answer',sdp:answer});
  }catch(e){if(isCurrent(s))failLive(s,e&&e.name==='NotAllowedError'?'Mikrofon zablokowany. Zezwól na mikrofon w ustawieniach tej witryny.':'Nie udało się uruchomić Live. Mikrofon wyłączony; sesja nie jest ponawiana automatycznie.');}
}
document.getElementById('resumeAudio').onclick=function(){var s=rtSession;if(isCurrent(s)&&s.audio)s.audio.play().then(function(){document.getElementById('resumeAudio').hidden=true;}).catch(function(){});};
document.getElementById('muteLive').onclick=function(){var s=rtSession;if(!isCurrent(s)||!s.stream)return;var tracks=s.stream.getAudioTracks();var enabled=!tracks[0].enabled;tracks.forEach(function(t){t.enabled=enabled;});this.textContent=enabled?'Wycisz mikrofon':'Włącz mikrofon';liveState(enabled?'listen':'mute',enabled?'SŁUCHAM':'MIKROFON WYCISZONY');};
window.addEventListener('pagehide',function(){endLive(true);stopAllSpeech();});
phase('');
window.Dona={
  version:panelVersion,isDemo:isDemo,
  isAuthenticated:function(){return authenticated;},
  request:function(path,body,timeout){if(!authenticated||isDemo)return Promise.reject(new Error('AUTH'));return panelPost(API+'/'+path,Object.assign({},body,{haslo:sessionPw}),timeout);},
  draft:function(text){setInput(text);emit('open-chat');},
  branch:function(name){openBranch({nm:name});},
  history:function(){return Array.from(log.children).filter(function(n){return n.classList.contains('me')||n.classList.contains('dona')||n.classList.contains('voice');}).map(function(n){return{role:n.classList.contains('me')?'user':'dona',text:n.textContent,time:n.dataset.createdAt||''};});},
  refreshHistory:function(){histWczytana=false;log.textContent='';wczytajHist();},
  logout:function(){document.getElementById('logoutBtn').click();}
};
emit('ready',{demo:isDemo});

})();
