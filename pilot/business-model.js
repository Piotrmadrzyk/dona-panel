(function(root){
  'use strict';
  const array=value=>Array.isArray(value)?value:[];
  const finished=value=>/^(DONE|COMPLETED|ZAKONCZONY|ZAKOŃCZONY|ZAKONCZONE|ZAKOŃCZONE|CANCELLED|CANCELED|ANULOWANE|ANULOWANY|REJECTED|SENT|EXECUTED|PREVIEW_READY)$/i.test(value||'');
  const blocked=value=>/^(FAILED|ERROR|BLOCKED|ZABLOKOWANY|NEEDS_INSPECTION|UNKNOWN_RESULT|UNKNOWN)$/i.test(value||'');
  const drafts=value=>['DRAFT','NEEDS_REVIEW','APPROVED'].includes(value);
  const test=row=>/^test-/i.test(row.requestedBy||'')||/^\[TEST/i.test(row.title||row.brief||'')||/^(TEST|MOCK)/i.test(row.type||row.status||'');
  const scoped=(data,key,brand='all')=>array(data?.[key]).filter(row=>!test(row)&&(brand==='all'||row.brandId===brand||row.profileId===brand));
  function orders(data,brand='all'){
    const jobs=scoped(data,'workJobs',brand), ids=new Set(jobs.map(j=>j.id));
    const processes=scoped(data,'processes',brand).filter(p=>!ids.has(p.id)).map(p=>({...p,kind:'process',message:p.state?.blocked?.join(' · ')||p.currentStep||p.result}));
    const tasks=scoped(data,'tasks',brand).filter(t=>!ids.has(t.id)).map(t=>({...t,kind:'task',message:t.description}));
    return [...jobs.map(j=>({...j,kind:'job'})),...processes,...tasks].sort((a,b)=>(Date.parse(b.updatedAt||b.createdAt||b.date)||0)-(Date.parse(a.updatedAt||a.createdAt||a.date)||0));
  }
  function metrics(data,brand='all'){
    const work=orders(data,brand),posts=scoped(data,'socialPosts',brand);
    return {work:work.filter(j=>!finished(j.status)&&!blocked(j.status)).length,blocked:work.filter(j=>blocked(j.status)).length,drafts:posts.filter(p=>drafts(p.status)).length,published:posts.filter(p=>p.status==='PUBLISHED'&&p.publishedUrl).length,clients:scoped(data,'clients',brand).length};
  }
  const labels={READY:'Dokument do oceny',NEEDS_REVISION:'Wymaga poprawek',QUALIFIED:'Zakwalifikowane',SENT:'Wysłane',ACCEPTED:'Przyjęte',WON:'Wygrane',LOST:'Przegrane',PAID:'Opłacone',QUEUED:'Przyjęte',PROCESSING:'Dona pracuje',IN_PROGRESS:'W trakcie',W_TOKU:'W trakcie',PREVIEW_READY:'Gotowy podgląd',BLOCKED:'Wymaga działania',ZABLOKOWANY:'Wymaga działania',NEEDS_INSPECTION:'Sprawdź przebieg',FAILED:'Nie ukończono',ERROR:'Nie ukończono',DRAFT:'Szkic',NEEDS_REVIEW:'Do przejrzenia',APPROVED:'Zatwierdzony',PUBLISHING:'Wysyłanie',BUFFER_ACCEPTED:'Przyjęty przez Buffer',PUBLISHED:'Opublikowany',UNKNOWN:'Wynik niepewny',UNKNOWN_RESULT:'Wynik niepewny',DONE:'Zakończone',COMPLETED:'Zakończone',ZAKONCZONY:'Zakończone',ZAKOŃCZONY:'Zakończone',TODO:'Do wykonania',NEW:'Nowe',ACTIVE:'Aktywne',REQUESTED:'Czeka na decyzję',CZEKA_NA_ZGODE:'Czeka na Twoją decyzję',CANCELLED:'Anulowane',ANULOWANY:'Anulowane',REJECTED:'Odrzucone'};
  const label=value=>labels[value]||String(value||'Brak statusu').replace(/_/g,' ').toLocaleLowerCase('pl');
  const api={array,finished,blocked,drafts,test,scoped,orders,metrics,label};root.DonaBusinessModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
