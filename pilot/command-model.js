(function(root){
'use strict';
const brands=[{id:'all',name:'Wszystkie sprawy'},{id:'probatum',name:'Probatum',website:'https://probatum.pl'},{id:'silverandglass',name:'Silver & Glass',website:'https://www.silverandglass.pl'},{id:'edwardjanusz',name:'Edward Janusz',website:'https://www.edwardjanusz.pl'}];
const day=v=>{const d=new Date(v);return Number.isNaN(+d)?'':d.toLocaleDateString('sv-SE',{timeZone:'Europe/Warsaw'});};
const done=s=>/^(DONE|COMPLETED|CANCELLED|CANCELED|REJECTED|EXPIRED|SENT|EXECUTED|ZAKOŃCZONE|ANULOWANE)$/i.test(s||'');
const inBrand=(r,b)=>!b||b==='all'||(r.brandId||r.profileId)===b;
const rows=(d,key,b)=>(d?.[key]||[]).filter(r=>inBrand(r,b));
const pending=(d,b,now=Date.now())=>rows(d,'approvals',b).filter(r=>r.status==='REQUESTED'&&(!r.expiresAt||Date.parse(r.expiresAt)>now));
const eventDays=e=>({start:day(e.date),end:e.end?day(Date.parse(e.end)-(e.allDay?86400000:1)):day(e.date)});
function calendar(d,b='all',provider='zoho'){
 return (provider==='zoho'?(d?.calendar?.calendars||[]).flatMap(c=>(c.events||[]).map(e=>({...e,calendarName:c.name,checkedAt:c.checkedAt}))):d?.meetings||[]).filter(e=>!done(e.status)&&inBrand(e,b)).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
}
function alerts(d,b='all',now=Date.now()){
 const out=[];for(const c of d?.connections||[])if(/NOT_CONNECTED|ERROR|FAILED|PAUSED/.test(c.status)&&(!['edwardjanusz','silverandglass'].includes(c.id)||b==='all'||b===c.id))out.push({id:'connection-'+c.id,title:c.name,detail:c.detail,status:c.status,date:d.generatedAt,href:c.id==='zoho'?'#calendar':'#connections'});
 for(const t of rows(d,'tasks',b)){if(/ERROR|FAILED/.test(t.status))out.push({id:'task-'+t.id,title:t.title,detail:'Zadanie ma zapisany błąd.',status:'ERROR',date:t.date,href:'#activity'});else if(!done(t.status)&&t.date&&Date.parse(t.date)<now)out.push({id:'late-'+t.id,title:t.title,detail:'Termin zadania minął; brak potwierdzenia zakończenia.',status:'OVERDUE',date:t.date,href:'#activity'});}
 for(const p of rows(d,'socialPosts',b))if(/FAILED|UNKNOWN|PUBLISHING/.test(p.status))out.push({id:'post-'+p.id,title:p.title,detail:'Wynik publikacji wymaga sprawdzenia. Nie ponawiaj jej bez ustalenia stanu.',status:p.status,date:p.publishedAt||p.scheduledDate,href:'#social'});
 if(b==='all')for(const m of d?.mailboxSync||[])if(m.error||/ERROR|FAILED/.test(m.status))out.push({id:'mail-'+m.id,title:'Synchronizacja poczty: '+m.name,detail:'Ostatnia synchronizacja zgłosiła problem.',status:'ERROR',date:m.checkedAt,href:'#connections'});
 if(b==='all')for(const r of d?.agentRuns||[])if(r.errors>0||/ERROR|FAILED/.test(r.status))out.push({id:'run-'+r.id,title:r.name,detail:'Zapisany przebieg zgłosił błąd.',status:'ERROR',date:r.date,href:'#activity'});
 for(const c of d?.calendar?.calendars||[])if(c.status==='READ_OK'&&(!c.checkedAt||now-Date.parse(c.checkedAt)>30*60000))out.push({id:'stale-calendar-'+c.id,title:'Zoho: dane wymagają odświeżenia',detail:'Ostatni odczyt ma ponad 30 minut. Sprawdź spotkania bezpośrednio w Zoho.',status:'STALE',date:c.checkedAt,href:'#calendar'});
 return out;
}
function brief(d,b='all',now=Date.now()){
 const meetings=calendar(d,b).filter(e=>{const range=eventDays(e);return range.start<=day(now)&&range.end>=day(now);});
 return {meetings,decisions:pending(d,b,now).length+rows(d,'socialPosts',b).filter(p=>p.status==='DRAFT').length,tasks:rows(d,'tasks',b).filter(t=>!done(t.status)).sort((a,b)=>(Date.parse(a.date)||Infinity)-(Date.parse(b.date)||Infinity)),mails:rows(d,'mails',b).filter(m=>/WAIT|NEW|NOW|UNREAD|PENDING/i.test(m.status+' '+m.waiting)),alerts:alerts(d,b,now),calendarConnected:(d?.calendar?.calendars||[]).some(c=>c.status==='READ_OK')};
}
function history(d,b='all'){
 const out=rows(d,'workHistory',b).map(x=>({...x,source:'Historia panelu'}));
 out.push(...rows(d,'activity',b).map(x=>({...x,status:'RECORDED',source:'Zdarzenie w systemie'})));
 out.push(...rows(d,'approvals',b).filter(a=>a.approvedAt||a.executedAt).map(a=>({id:'approval-'+a.id,title:a.title,status:a.executionStatus||a.status,date:a.executedAt||a.approvedAt,source:a.executedAt?'Zapis wykonania zgody':'Decyzja o zgodzie'})));
 out.push(...rows(d,'socialPosts',b).filter(p=>p.publishedAt||p.approvedAt).map(p=>({id:'social-'+p.id,title:p.title,status:p.status,date:p.publishedAt||p.approvedAt,url:p.publishedUrl,source:'Facebook'})));
 return out.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
}
const api={brands,day,eventDays,done,inBrand,rows,pending,calendar,alerts,brief,history};root.DonaModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
