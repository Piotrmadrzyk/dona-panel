const context = $('Validate Access').first().json;
if (!context.authorized || context.tenantId !== 'PM') throw new Error('ACCESS_DENIED');
const tenant = context.tenantId;
const cap = 250;
const crypto = require('crypto');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const brandKeys = ['probatum','silverandglass','edwardjanusz'];
function brand(r){ const explicit=String(r.brand_id||r.profile_key||r.projekt_id||'').toLowerCase(); if(brandKeys.includes(explicit))return explicit;const m=String(r.tagi||'').match(/(?:^|[,\s])brand:(probatum|silverandglass|edwardjanusz)(?:$|[,\s])/);return m?m[1]:''; }
const truncated = [];
function read(name, tenantField, key) {
  const items = $(name).all().map(item => item.json);
  const scoped = items.filter(row => row.id !== undefined && row[tenantField] === tenant);
  // Empty-table output is deliberately represented as [], never as a fake record.
  if (!scoped.length) return [];
  const limit=['mails','mailboxSync','permanentMemory','workHistory','calendar','mediaAnalyses'].includes(key)?50:cap;
  if (scoped.length > limit) truncated.push(key);
  return scoped.slice(0, limit);
}
function readOwnerTable(name, key) {
  if (!context.authorized || tenant !== 'PM') throw new Error('ACCESS_DENIED');
  const items = $(name).all().map(item => item.json).filter(row => row.id !== undefined);
  if (!items.length) return [];
  if (items.length > cap) truncated.push(key);
  return items.slice(0, cap);
}
function text(value, max = 600) { return value === undefined || value === null ? '' : String(value).slice(0,max); }
// Like text(), but marks a hard cut with an ellipsis instead of silently stopping mid-sentence.
function textCut(value, max) { const s = text(value, max + 1); return s.length > max ? s.slice(0, max).trimEnd() + '…' : s; }
function url(value) { const s=text(value,2000).trim(); return /^https:\/\/[^\s<>"']+$/i.test(s) ? s : ''; }
function parse(value) { if(value && typeof value==='object' && !Array.isArray(value)) return value; try { const result=JSON.parse(value || '{}'); return result && typeof result==='object' && !Array.isArray(result) ? result : {}; } catch { return {}; } }
function parseList(value) { if(Array.isArray(value)) return value; try { const result=JSON.parse(value || '[]'); return Array.isArray(result) ? result : []; } catch { return []; } }
function simpleList(value, max=20) { if(Array.isArray(value)) return value.map(v=>text(v,500)).filter(Boolean).slice(0,max); return text(value,5000).split(/[|,\n]/).map(v=>v.trim()).filter(Boolean).slice(0,max); }
function number(value) { const n=Number(value); return value!==null&&value!==''&&Number.isFinite(n)?n:null; }
function processState(value, processId) {
 const state=parse(value), p=parse(state.businessPlan);
 const branches=['sprzedaz','research','marketing','system','klienci','www','poczta'];
 const plan=p.schemaVersion===1&&p.projectId===processId&&Number.isInteger(p.version)&&p.version>0 ? {
  version:p.version, kind:text(p.kind,40),
  tasks:(Array.isArray(p.tasks)?p.tasks:[]).slice(0,40).filter(t=>t&&typeof t==='object'&&/^[a-z0-9_-]{1,80}$/.test(t.id||'')).map(t=>({
   id:text(t.id,80),title:text(t.title,600),branch:branches.includes(t.branch)?t.branch:'',
   status:['READY','WAITING','VERIFIED'].includes(t.status)?t.status:'WAITING',
   resultReference:text(t.resultReference,2000),
   missing:(Array.isArray(t.missing)?t.missing:[]).slice(0,30).map(v=>text(v,120))
  }))
 }:null;
 return {settled:simpleList(state.ustalone),waiting:simpleList(state.czeka_na_ciebie),blocked:simpleList(state.zablokowane),plan};
}
function driveUrl(value) { const s=url(value); return /^https:\/\/(?:drive|docs)\.google\.com\//i.test(s) ? s : ''; }
function youtubeUrl(value) { const s=url(value); try { return /^(?:(?:www|m)\.)?youtube\.com$|^youtu\.be$/i.test(new URL(s).hostname) ? s : ''; } catch { return ''; } }
function cleanPreview(value) {
  const parsed=parse(value);
  if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) {
    const allowed=['subject','temat','title','tytul','body','tresc','message','wiadomosc','summary','opis','to','sendTo','recipient','odbiorca','do','konto'];
    const pieces=allowed.filter(k=>typeof parsed[k]==='string' && parsed[k]).map(k=>text(parsed[k],4000));
    return pieces.length ? pieces.join('\n\n').slice(0,7000) : 'Szczegóły tej operacji są dostępne w obsłudze zgód DONY.';
  }
  return text(value,7000);
}
const configs = read('Tenant Configuration','client_id','configuration');
if(configs.length!==1)throw new Error('TENANT_CONFIGURATION_UNAVAILABLE');
// Piotr (10.09): tabela klientow byla w 100% smieciowymi rekordami z Recepcji Poczty
// (Google Tag Manager, Apple, sady...) - naprawiony u zrodla (patrz Recepcja Poczty), ale
// istniejace 19 rekordow zostaje w tabeli, oznaczane recznie przez Done (update_customer,
// status=NIE_KLIENT) zamiast kasowane - odfiltruj je tutaj, tak jak juz jest to widoczne.
const customersRaw=read('Read Customers','client_id','clients');
const customers=customersRaw.filter(function(r){ return text(r.status).toUpperCase()!=='NIE_KLIENT'; });
const names=new Map(customers.map(r=>[text(r.customer_id),text(r.nazwa||r.firma_nazwa)]));
const clientName=id=>names.get(text(id))||'';
const approvalTypes={SEND_EMAIL_REPLY_RECEPCJA_POCZTY:'Odpowiedź na wiadomość',EMAIL_SEND:'Wiadomość do wysłania',SEND_EMAIL:'Wiadomość do wysłania',ZOHO_EVENT_CREATE:'Dodanie spotkania do Zoho',ZOHO_EVENT_UPDATE:'Zmiana spotkania w Zoho',ZOHO_EVENT_DELETE:'Anulowanie spotkania w Zoho',PUBLISH_PAGE:'Publikacja strony',PUBLISH:'Publikacja',DELETE:'Usunięcie danych'};
const emailApprovalFields=['do','temat','tresc','konto','to','subject','body','sendTo','recipient','thread_id','message_id','in_reply_to','references'];
const calendarApprovalFields=['calendarId','eventUid','etag','recurrenceId','recurrenceEditType','title','start','end','allDay','location','description','attendees','notifyAttendees','timezone'];
function approvalPayload(p){const out={};for(const k of [...emailApprovalFields,...calendarApprovalFields]){if(typeof p[k]==='string')out[k]=text(p[k],30000);else if(typeof p[k]==='boolean')out[k]=p[k];else if(k==='attendees'&&Array.isArray(p[k]))out[k]=p[k].filter(v=>typeof v==='string').map(v=>text(v,320)).slice(0,50);}return out;}
function canApprove(r,p){const type=String(r.action_type||'').toUpperCase(),keys=Object.keys(p);if(/^SEND_EMAIL(?:_REPLY_RECEPCJA_POCZTY)?$/.test(type))return !!(p.do||p.to||p.sendTo||p.recipient)&&!!(p.tresc||p.body)&&keys.every(k=>emailApprovalFields.includes(k)&&typeof p[k]==='string'&&p[k].length<=30000);if(!/^ZOHO_EVENT_(CREATE|UPDATE|DELETE)$/.test(type)||!p.calendarId||keys.some(k=>!calendarApprovalFields.includes(k)))return false;if(Array.isArray(p.attendees)&&p.attendees.some(v=>typeof v!=='string'||v.length>320))return false;if(type==='ZOHO_EVENT_CREATE')return !!p.title&&!!p.start&&!!p.end;if(type==='ZOHO_EVENT_UPDATE')return !!p.eventUid&&!!p.etag&&!!(p.title||p.start||p.end||p.location||p.description);return !!p.eventUid&&!!p.etag;}
const approvals=read('Read Approvals','tenant_id','approvals').map(r=>{
  const payload=parse(r.payload_preview);
  const preview=cleanPreview(r.payload_preview);
  const type=text(r.action_type).toUpperCase();
  return {id:text(r.approval_id),title:text(payload.subject||payload.temat||payload.title||payload.tytul||approvalTypes[type]||'Prośba o zatwierdzenie',200),
    type:approvalTypes[type]||type.replace(/_/g,' '),clientName:text(payload.recipient||payload.to||payload.do||payload.odbiorca,150),
    brandId:brand(r),revision:sha(String(r.payload_preview||'')),actionType:text(r.action_type),actionPayload:approvalPayload(payload),canApprove:canApprove(r,payload),executionStatus:text(r.execution_status),executedAt:text(r.executed_at),approvedAt:text(r.approved_at),status:text(r.status),preview,createdAt:text(r.created_at||r.createdAt),expiresAt:text(r.expires_at),description:''};
});
const leads=read('Read Leads','client_id','leads').map(r=>({id:text(r.lead_id),name:text(r.imie),title:text(r.imie||r.email||'Zapytanie'),email:text(r.email),phone:text(r.telefon),status:text(r.status),description:text(r.tresc||r.notatka,6000),source:text(r.zrodlo),createdAt:text(r.utworzono||r.createdAt)}));
const offers=read('Read Offers','client_id','offers').map(r=>({id:text(r.offer_id),title:text(r.nazwa_pliku||'Oferta '+r.offer_id),clientName:clientName(r.customer_id),status:text(r.status),amount:r.total_netto!==null&&r.total_netto!==''&&Number.isFinite(Number(r.total_netto))?Number(r.total_netto):null,currency:text(r.waluta)||'PLN',createdAt:text(r.utworzono||r.createdAt),expiresAt:text(r.valid_until),url:url(r.drive_link),description:text(r.approval_reason||r.decision_reason)}));
const clients=customers.map(r=>({id:text(r.customer_id),name:text(r.nazwa||r.firma_nazwa||r.customer_id),email:text(r.emails),phone:text(r.telefony),status:text(r.status||r.lifecycle_stage),lifecycle:text(r.lifecycle_stage),owner:text(r.owner),serviceLevel:text(r.poziom_obslugi),tags:text(r.tagi),nextAction:text(r.next_action),nextActionAt:text(r.next_action_at),lastContactAt:text(r.last_contact_at),driveFolderId:text(r.drive_folder_id),createdAt:text(r.utworzono||r.createdAt)}));
const meetings=read('Read Meetings','client_id','meetings').map(r=>({id:text(r.meeting_id),title:text(r.tytul),clientName:clientName(r.customer_id),date:text(r.start),end:text(r.koniec),status:text(r.status),location:text(r.lokalizacja),url:url(r.event_link),createdAt:text(r.utworzono||r.createdAt)}));
// "[TEST ...]" titles are QA fixtures already cancelled at the source (see cancel_reason
// on the row) but deliberately left in place, not deleted - never show them to the owner.
const tasks=read('Read Tasks','tenant_id','tasks').filter(r=>!/^\[TEST/i.test(text(r.tytul))).map(r=>({id:text(r.zadanie_id),title:text(r.tytul),description:text(r.opis),date:text(r.due_at||r.termin),status:text(r.status),clientId:text(r.customer_id||r.klient_id),clientName:clientName(r.customer_id||r.klient_id),projectId:text(r.projekt_id),priority:text(r.explicit_priority||r.priorytet),priorityScore:number(r.priority_score),priorityReasons:text(r.priority_reasons,2000),owner:text(r.wlasciciel),sourceType:text(r.source_type),acceptanceCriteria:text(r.kryteria_odbioru,2000),result:text(r.wynik,4000),completedAt:text(r.completed_at),createdAt:text(r.utworzono||r.createdAt)}));
// Test/harness fixtures (requested_by starting with "test-") are QA artifacts,
// never real business processes - they must never reach the owner's panel.
const processes=read('Read Processes','tenant_id','processes').filter(r=>!/^test-/i.test(text(r.requested_by))&&!/^\[TEST/i.test(text(r.opis))).map(r=>({id:text(r.proces_id),title:text(r.opis||r.typ||r.proces_id),type:text(r.typ),description:text(r.opis,4000),currentStep:text(r.krok_obecny,4000),status:text(r.status),state:processState(r.stan_json,text(r.proces_id)),brandId:['BIZ-20260915-academy','BIZ-20260915-prospecting','BIZ-20260915-delivery'].includes(r.proces_id)?'probatum':brand(r),requestedBy:text(r.requested_by),result:text(r.wynik,5000),createdAt:text(r.utworzono||r.createdAt),updatedAt:text(r.ostatnia_aktywnosc||r.updatedAt)}));

// Durable work queue: only the authenticated owner's business jobs, never worker tokens.
const jobRows=$('Read Work Jobs').all().map(i=>i.json);
const jobsReadFailed=jobRows.some(r=>r.error);
const workJobsStatus={ok:!jobsReadFailed,checkedAt:new Date().toISOString(),message:jobsReadFailed?'Nie udało się odczytać zleceń. Odśwież widok; zapisane zadania pozostają w systemie.':''};
if(jobRows.filter(r=>r.job_id).length>100)truncated.push('workJobs');
const workJobs=jobRows.filter(r=>r.job_id&&r.tenant_id===tenant&&!/^test-/i.test(text(r.requested_by))&&!/^\[TEST/i.test(text(r.brief))).slice(0,100).map(r=>{
 const result=parse(r.result);
 const needsInspection=r.status==='PROCESSING'&&Number.isFinite(Date.parse(r.started_at))&&Date.now()-Date.parse(r.started_at)>30*60000;
 const realFile=r.status==='PREVIEW_READY'&&result.sukces===true&&result.mp4_dostepny===true&&result.is_mock!==true&&result.stored_on_drive===true;
 const output=realFile?url(result.storage_url||result.mp4_url):'';
 const source=url(r.website_url);
 let brandId='';try{const host=new URL(source).hostname.replace(/^www\./,'');brandId=host==='probatum.pl'?'probatum':host==='silverandglass.pl'?'silverandglass':host==='edwardjanusz.pl'?'edwardjanusz':'';}catch{}
 return {id:text(r.job_id),type:'REEL',title:text(r.reel_headline||r.brief||'Rolka',180),brief:text(r.brief,4000),brandId,websiteUrl:source,status:needsInspection?'NEEDS_INSPECTION':text(r.status),message:text(result.wiadomosc,3000),errorCode:text(result.blad_silnika||result.error),resultUrl:output,hasRealFile:!!output,assetId:text(result.reel_asset_id),createdAt:text(r.created_at),updatedAt:text(r.updated_at),startedAt:text(r.started_at),finishedAt:text(r.finished_at),canResume:r.status==='QUEUED'};
});

const assets=read('Read Assets','client_id','assets').filter(r=>!/^TEST/i.test(text(r.asset_type))&&!/^(TEST|MOCK)/i.test(text(r.status))&&!/^(test|demo)[-_]/i.test(text(r.campaign_id))&&!/\bTEST\b/i.test(text(r.title))).map(r=>({id:text(r.asset_id),title:text(r.title||r.asset_id),type:text(r.asset_type),status:text(r.status),publishStatus:text(r.publish_status),approvalStatus:text(r.approval_status),legalStatus:text(r.legal_status),qualityStatus:text(r.qc_status),campaignId:text(r.campaign_id),provider:text(r.provider),version:number(r.version),previewUrl:url(r.preview_url),sourceUrl:url(r.source_data_location),storage:text(r.storage_url,1000),publishedAt:text(r.published_at),createdAt:text(r.utworzono||r.createdAt),updatedAt:text(r.aktualizacja||r.updatedAt)})).filter(r=>r.id);
const campaigns=readOwnerTable('Read Campaigns','campaigns').map(r=>({id:text(r.campaign_id||r.kampania_id||r.form_key),name:text(r.nazwa||r.campaign_id||r.kampania_id),clientId:text(r.klient_id),clientName:text(r.client_name)||clientName(r.klient_id),type:text(r.typ),status:text(r.status),stage:text(r.current_stage),objective:text(r.objective),channels:text(r.kanaly),nextAction:text(r.next_action),landingStatus:text(r.landing_page_status),approvalStatus:text(r.approval_status),qualityStatus:text(r.qc_status),legalStatus:text(r.legal_status),budget:number(r.budzet_netto),targetDate:text(r.data_docelowa),createdAt:text(r.utworzono||r.createdAt),updatedAt:text(r.aktualizacja||r.updatedAt)})).filter(r=>r.id);
const customerMemory=read('Read Customer Memory','client_id','customerMemory').map(r=>({id:text(r.memory_id),customerId:text(r.customer_id),clientName:clientName(r.customer_id),key:text(r.memory_key),value:text(r.wartosc,6000),domain:text(r.domain),kind:text(r.rodzaj),status:text(r.status),confidence:text(r.confidence),sourceType:text(r.source_type),sourceExcerpt:text(r.source_excerpt,1200),validFrom:text(r.valid_from),validTo:text(r.valid_to),createdAt:text(r.utworzono||r.createdAt),updatedAt:text(r.aktualizacja||r.updatedAt)})).filter(r=>r.id);
const nextActions=read('Read Next Actions','client_id','nextActions').map(r=>({id:text(r.action_id),customerId:text(r.customer_id),clientName:clientName(r.customer_id),title:text(r.action),reason:text(r.reason,3000),status:text(r.status),date:text(r.due_at),autonomy:text(r.autonomy),confidence:text(r.confidence),result:text(r.wynik,3000),source:text(r.zrodlo),createdAt:text(r.utworzono||r.createdAt),updatedAt:text(r.aktualizacja||r.updatedAt)})).filter(r=>r.id);
// PM_dokumenty is a personal-project table for this owner pilot. klient_id identifies a business customer, not the owner.
const NOISY_DOC_TYPES=['MEDIA_TRANSCRIPT','MEDIA_SUMMARY','TEST'];
const files=readOwnerTable('Read Documents','files').filter(r=>!NOISY_DOC_TYPES.includes(text(r.typ_dokumentu))).map(r=>({id:text(r.dokument_id),title:text(r.nazwa_pliku||r.temat||r.dokument_id),type:text(r.typ_dokumentu),status:text(r.status),clientName:clientName(r.klient_id),projectId:text(r.projekt_id),source:text(r.zrodlo),fileId:text(r.drive_file_id),qualityStatus:text(r.qc_status),url:driveUrl(r.drive_link),createdAt:text(r.utworzono||r.createdAt)})).filter(r=>r.id);
// Test fixtures are marked in their own invoice number (e.g. "FV/2026/08/TEST1") -
// same fail-closed exclusion already applied to test-harness processes.
const invoices=readOwnerTable('Read Invoices','invoices').map(r=>({id:text(r.numer_faktury),number:text(r.numer_faktury),clientName:text(r.klient),email:text(r.email_klienta),amount:number(r.kwota),currency:text(r.waluta)||'PLN',status:text(r.status),dueAt:text(r.termin_platnosci),lastReminderAt:text(r.data_ostatniego_przypomnienia),reminderCount:number(r.liczba_przypomnien)||0,description:text(r.opis,3000),createdBy:text(r.utworzono_przez),createdAt:text(r.createdAt)})).filter(r=>r.id&&!/TEST/i.test(r.number));
const subscriptions=readOwnerTable('Read Subscriptions','subscriptions').map(r=>({id:text(r.service_id),name:text(r.nazwa||r.service_id),category:text(r.kategoria),account:text(r.konto),plan:text(r.plan),amount:number(r.cena),currency:text(r.waluta)||'PLN',billingPeriod:text(r.okres_rozliczeniowy),renewalDate:text(r.data_odnowienia),status:text(r.status),active:r.aktywny===true,autoRenew:r.auto_renew===true,dashboardUrl:url(r.dashboard_url),note:text(r.notatka,2000),updatedAt:text(r.aktualizacja||r.updatedAt),createdAt:text(r.utworzono||r.createdAt)})).filter(r=>r.id);
const subscriptionUsage=readOwnerTable('Read Subscription Usage','subscriptionUsage').map(r=>({id:text(r.odczyt_id),serviceId:text(r.service_id),source:text(r.source),plan:text(r.plan),confidence:text(r.confidence),metric:text(r.limit_nazwa),unit:text(r.jednostka),used:number(r.used),total:number(r.total),remaining:number(r.remaining),remainingPercent:number(r.remaining_percent),cost:number(r.koszt),status:text(r.status),error:text(r.blad,1000),collectedAt:text(r.collected_at||r.createdAt),resetAt:text(r.reset_at)})).filter(r=>r.id);
// Piotr (10.09): 'Dona miala miec cala wiedze z tego kompa... ta lista jest glupia'. Prawdziwa
// baza wiedzy (Dysk/Poczta/Kalendarz/podsumowania sesji Claude Code) zyje w PM_wiedza_fragmenty,
// zupelnie osobno od PM_drugi_mozg/PM_project_memory ktore panel juz pokazywal - stad wrazenie
// ze Dona 'nic nie wie'. Odfiltruj stary format wielo-czesciowy (sprzed naprawy z tej samej nocy)
// i fragmenty ktore wygladaja na binarny smiec (np. zakodowany base64 zalacznik z transkryptu),
// zeby nie powtorzyc bledu z Centrum dokumentow/Research (szum zamiast tresci).
const KNOWLEDGE_OLD_FORMAT=/czesc\s*\d+\s*\/\s*\d+/i;
function looksLikeBinaryGarbage(value){
  var s=String(value||'');
  if(s.length<80)return false;
  var head=s.slice(0,200);
  var whitespace=(head.match(/\s/g)||[]).length;
  return whitespace/head.length<0.02;
}
const knowledgeFragmentsRaw=readOwnerTable('Read Wiedza Fragmenty','knowledgeFragments');
const knowledgeFragments=knowledgeFragmentsRaw.filter(function(r){
  var tytul=text(r.tytul);
  if(KNOWLEDGE_OLD_FORMAT.test(tytul))return false;
  if(looksLikeBinaryGarbage(r.fragment))return false;
  return true;
}).map(r=>({id:text(r.chunk_hash),title:text(r.tytul,240),text:text(r.fragment,4000),source:text(r.zrodlo),sourceRef:text(r.zrodlo_id),createdAt:text(r.utworzono)})).filter(r=>r.id||r.text);
const RESEARCH_QA_MARKERS=/^\[TEST|bramki dowodowej/i;
const researchesRaw=readOwnerTable('Read Research','researches');
const researchesSeen=new Set();
const researches=researchesRaw.filter(function(r){
  if(text(r.tryb)!=='A')return false; // Tryb B = automatyczne sprawdzenie nadawcy maila, nie jego research rynkowy
  var temat=text(r.temat||r.temat_klucz);
  if(RESEARCH_QA_MARKERS.test(temat))return false;
  var key=temat.toLowerCase().trim();
  if(researchesSeen.has(key))return false;
  researchesSeen.add(key);
  return true;
}).map(r=>({id:text(r.temat_klucz),topic:text(r.temat||r.temat_klucz),summary:text(r.podsumowanie,7000),mode:text(r.tryb),projectId:text(r.projekt_id),clientName:clientName(r.klient_id),highConfidenceClaims:number(r.liczba_twierdzen_wysoka_pewnosc),createdAt:text(r.createdAt),updatedAt:text(r.updatedAt)})).filter(r=>r.id);
const competitorObservations=readOwnerTable('Read Competitor Observations','competitorObservations').map(r=>({id:text(r.obserwacja_id),competitor:text(r.konkurent),area:text(r.obszar),summary:text(r.skrot,4000),whatChanged:text(r.co_sie_zmienilo,4000),changed:r.zmiana===true,weight:text(r.waga),date:text(r.czas||r.createdAt)})).filter(r=>r.id);
const playbooks=readOwnerTable('Read Playbooks','playbooks').map(r=>({id:text(r.playbook_id),name:text(r.nazwa||r.playbook_id),sector:text(r.branza),readiness:number(r.gotowosc),active:r.aktywny===true,tone:text(r.ton_marki,2000),defaultCta:text(r.cta_domyslne),modules:simpleList(r.moduly),missing:text(r.czego_brakuje,2000),updatedAt:text(r.aktualizacja||r.updatedAt)})).filter(r=>r.id);
const mediaAnalyses=read('Read Media Registry','tenant_id','mediaAnalyses').map(r=>{
  const artifacts=parseList(r.pliki_json).map(p=>({name:text(p&&(p.nazwa||p.name),240),url:driveUrl(p&&(p.link||p.url))})).filter(p=>p.name&&p.url).slice(0,20);
  const names=artifacts.map(p=>p.name);
  const has=prefix=>names.some(name=>name.indexOf(prefix)===0);
  const rawStatus=text(r.status,24).toUpperCase();
  return {id:text(r.material_uid,300),title:text(r.tytul||'Analiza filmu',240),sourceUrl:youtubeUrl(r.source_url),status:['SUCCESS','PARTIAL','FAILED'].includes(rawStatus)?rawStatus:'UNKNOWN',folderUrl:driveUrl(r.folder_url),processedAt:text(r.przetworzono_at||r.updatedAt||r.createdAt),transcriptCharacters:Number.isFinite(Number(r.znakow_transkrypcji))?Math.max(0,Number(r.znakow_transkrypcji)):0,brandId:brand(r),files:artifacts,stages:{transcript:has('01_TRANSKRYPCJA'),summary:has('02_PODSUMOWANIE'),mindMap:has('03_MAPA_MYSLI'),metadata:has('04_METADATA')}};
}).filter((r,index,list)=>r.id&&list.findIndex(item=>item.id===r.id)===index);
const activity=read('Read Events','client_id','activity').map(r=>({id:text(r.event_id),title:text(r.event_type||'Zdarzenie klienta').replace(/_/g,' '),clientName:clientName(r.customer_id),date:text(r.czas||r.createdAt)}));
const memory=read('Read Brain','tenant_id','memory').map(r=>({id:text(r.wpis_id),brandId:brand(r),revision:text(r.updatedAt),text:text(r.tresc,6000),type:text(r.typ),status:text(r.status),tags:text(r.tagi),source:text(r.zrodlo_kanal)||'PM_drugi_mozg',sourceRef:text(r.zrodlo_ref),updatedAt:text(r.aktualizacja||r.updatedAt)}));
const knownPages={edwardjanusz:'61594093026807',silverandglass:'61593755021660'};
function socialRows(name,key){const all=$(name).all().map(i=>i.json).filter(r=>r.id!==undefined&&knownPages[r.profile_key]===String(r.fb_page_id));if(all.length>cap)truncated.push(key);return all.slice(0,cap);}
const socialProfiles=socialRows('Read Social Profiles','socialProfiles').map(r=>({id:text(r.profile_key),name:text(r.brand_name),pageId:text(r.fb_page_id),url:url(r.fb_page_url),website:url(r.website_url),enabled:r.posting_enabled===true,connection:text(r.connection_status),bufferChannelId:text(r.buffer_channel_id),bufferCheckedAt:text(r.buffer_checked_at),hour:r.publish_hour,perDay:r.posts_per_day,updatedAt:text(r.updatedAt),source:'PM_social_profiles'}));
const socialPosts=socialRows('Read Social Posts','socialPosts').map(r=>({id:text(r.post_key),revision:text(r.caption_hash),brandId:text(r.profile_key),profileId:text(r.profile_key),title:text(r.source_title),text:text(r.caption,12000),image:url(r.image_url),source:url(r.source_url),status:text(r.status),scheduledDate:text(r.scheduled_date),publishedUrl:url(r.published_url),publishedAt:text(r.published_at),approvedAt:text(r.approved_at),notes:text(r.review_notes,2000),error:text(r.last_error,1000)}));
const claudeRunnerRow=$('Read Claude Runner Status').first().json||{};
const claudeRunner={runnerId:text(claudeRunnerRow.runner_id,80),online:claudeRunnerRow.online===true,lastSeen:text(claudeRunnerRow.last_seen,80),status:text(claudeRunnerRow.runner_status,40),currentJobId:text(claudeRunnerRow.current_job_id,100),version:text(claudeRunnerRow.version,40),queued:Number(claudeRunnerRow.queued_jobs)||0,running:Number(claudeRunnerRow.running_jobs)||0,failed:Number(claudeRunnerRow.failed_jobs)||0};
const claudeDetail=claudeRunner.online?'Wykonawca na Macu jest aktywny'+(claudeRunner.running?' i wykonuje '+claudeRunner.running+' zadanie.':'.')+(claudeRunner.queued?' W kolejce: '+claudeRunner.queued+'.':''):claudeRunner.runnerId?'Runner jest offline. Ostatni heartbeat: '+(claudeRunner.lastSeen||'brak czasu')+'. Zlecenia pozostaną bezpiecznie w kolejce do jego uruchomienia.':'Runner czeka na pierwszą instalację i uruchomienie na Macu. Zlecenia można zapisać, ale nie zostaną wykonane, dopóki runner nie będzie online.';
const connections=[{id:'claude-runner',name:'Claude Code — wykonawca',status:claudeRunner.online?'READ_OK':'NOT_CONNECTED',detail:claudeDetail,source:'PostgreSQL + heartbeat Claude Runner'},
{id:'zanfia',name:'Zanfia — klienci i dostępy',status:'NOT_CONNECTED',detail:'Poświadczenie Zanfia istnieje, ale bezpieczny test GET /clients 15.09.2026 zwrócił HTTP 403. Moduł odczytu jest przygotowany i wymaga odnowienia klucza lub jego uprawnień.',source:'Test Zanfia API 15.09.2026'},
{id:'zoho-suite',name:'Zoho — pozostałe aplikacje',status:'NOT_CONNECTED',detail:'Dona ma obecnie potwierdzone połączenie tylko z Zoho Calendar. CRM, Campaigns, Social, WorkDrive, Books i pozostałe aplikacje nie mają jeszcze poświadczeń ani zweryfikowanych workflowów.',source:'Audyt credentials i workflowów n8n 15.09.2026'},
{id:'workspace',name:'Dane panelu',status:'READ_OK',detail:'Ten odczyt danych zakończył się powodzeniem.',source:'dona-workspace'},
{id:'calendar',name:'Kalendarz Google',status:configs[0].calendar_id?'CONFIGURED':'UNKNOWN',detail:configs[0].calendar_id?'Wybrany kalendarz: '+text(configs[0].calendar_id)+'. Dostęp do Google nie był sprawdzany w tym odczycie.':'Brak identyfikatora kalendarza w konfiguracji.',source:'PM_tenant_config'},
{id:'brain',name:'Drugi mózg',status:'READ_OK',detail:'Odczytano '+memory.length+' wpisów dla Twojej przestrzeni.',source:'PM_drugi_mozg'},
...socialProfiles.map(p=>{const buffer=p.connection==='BUFFER_CONNECTED'&&!!p.bufferChannelId;return {id:p.id,name:p.name+' · Facebook',status:buffer?'READ_OK':p.connection==='META_NOT_CONNECTED'?'NOT_CONNECTED':p.enabled?'CONFIGURED':'PAUSED',detail:buffer?'Kanał Buffer został odczytany i przypisany do właściwej strony. Harmonogram jest osobnym ustawieniem. Polecenie właściciela lub przycisk „Publikuj teraz” publikuje wskazaną wersję posta.':p.connection==='META_NOT_CONNECTED'?'Brak połączenia z Meta lub Buffer. Posty nie mogą się publikować.':p.enabled?'Publikacja włączona w konfiguracji. Ten odczyt nie sprawdza tokenu ani wykonania harmonogramu.':'Publikacja wyłączona.',source:buffer?'Buffer API + PM_social_profiles':p.source};})];
// A message can be re-ingested with the same mail_id by a re-run sync; keep one copy.
const mailsSeen=new Set();
const mails=read('Read Mail','tenant_id','mails').filter(r=>{const status=text(r.status).toUpperCase();const labels=simpleList(r.labels,50).map(v=>v.toUpperCase());return status!=='TRASH'&&!labels.includes('TRASH');}).map(r=>({id:text(r.mail_id),messageId:text(r.message_id),title:text(r.subject),sender:text(r.sender_email||r.sender),snippet:textCut(r.tresc||r.snippet,1000),status:text(r.status),waiting:text(r.waiting_status),date:text(r.czas||r.createdAt),brandId:brand(r),account:text(r.mailbox_adres||r.konto||r.mailbox_id)})).filter(m=>!m.id||!mailsSeen.has(m.id)&&mailsSeen.add(m.id));
const mailboxSync=read('Read Mail Sync','tenant_id','mailboxSync').map(r=>({id:text(r.sync_id),name:text(r.mailbox_adres),status:text(r.status),checkedAt:text(r.ostatni_sync),error:!!r.blad}));
const permanentMemory=read('Read Project Memory','tenant_id','permanentMemory').map(r=>({id:text(r.pamiec_id),brandId:brand(r),text:text(r.fakt,6000),type:text(r.typ),status:text(r.status),tags:text(r.domain),source:'Pamięć projektowa',sourceRef:text(r.source_id||r.zrodlo),updatedAt:text(r.aktualizacja||r.updatedAt),readOnly:true}));
const workHistory=read('Read Panel Events','tenant_id','workHistory').map(r=>({id:text(r.event_id),title:text(r.title),kind:text(r.kind),status:text(r.status),referenceId:text(r.reference_id),brandId:text(r.brand_id),date:text(r.occurred_at)}));
const calendarRows=read('Read Zoho Calendar','tenant_id','calendar');
const zoho=calendarRows.filter(r=>r.provider==='zoho'&&text(r.calendar_id)!=='own').map(r=>{let events=[];try{const e=JSON.parse(r.events_json||'[]');events=Array.isArray(e)?e:[];}catch{}return {id:text(r.calendar_id),name:text(r.calendar_name),status:text(r.status),checkedAt:text(r.checked_at),errorCode:text(r.error_code),rangeStart:text(r.range_start),rangeEnd:text(r.range_end),events:events.slice(0,500).map(e=>({id:text(e.id),uid:text(e.uid),etag:text(e.etag),recurrenceId:text(e.recurrenceId),title:text(e.title),date:text(e.date),end:text(e.end),allDay:e.allDay===true,location:text(e.location),url:url(e.url),status:text(e.status),provider:'zoho',calendarId:text(r.calendar_id),brandId:brand(e)}))};});
connections.push({id:'zoho',name:'Zoho Calendar',status:zoho.length?(zoho.every(c=>c.status==='READ_OK')?'READ_OK':'ERROR'):'NOT_CONNECTED',detail:zoho.length?'Ostatnia synchronizacja: '+text(zoho[0].checkedAt)+'. Widok pokazuje zapisany wynik synchronizacji.':'Połącz konto Zoho, aby pobierać spotkania. Kalendarz Google jest osobną integracją.',source:'Zoho Calendar API'});

for(const collection of [leads,offers,clients,meetings,tasks,processes,assets,campaigns,files,researches,activity,mediaAnalyses])for(const item of collection)if(!item.brandId)item.brandId='';
// GA4 pageview/user/session snapshot per owned site (probatum/edwardjanusz/silverandglass),
// collected daily by 'PM Agent OS - Zbieranie: statystyki_www (GA4, codziennie)'. Keep only the
// most recent row per site - the table accumulates history, the panel only needs the latest.
const wwwStatsRows=read('Read WWW Stats','tenant_id','wwwStats');
const wwwStats={};
for(const r of wwwStatsRows){
  const site=text(r.strona);
  if(!site)continue;
  const existing=wwwStats[site];
  if(existing && new Date(existing.zebrano)>=new Date(r.zebrano))continue;
  wwwStats[site]={odslony:number(r.odslony),uzytkownicy:number(r.uzytkownicy),sesje:number(r.sesje),zakres:text(r.zakres),zebrano:text(r.zebrano)};
}
return [{json:{ok:true,generatedAt:new Date().toISOString(),context:{tenantId:tenant,name:text(configs[0].nazwa)||'Probatum',userName:'Piotr',role:'OWNER'},approvals,leads,offers,clients,meetings,tasks,processes,workJobs,workJobsStatus,assets,campaigns,customerMemory,nextActions,files,invoices,subscriptions,subscriptionUsage,researches,competitorObservations,playbooks,mediaAnalyses,activity,memory,permanentMemory,knowledgeFragments,socialProfiles,socialPosts,connections,claudeRunner,mails,mailboxSync,workHistory,wwwStats,calendar:{provider:'zoho',status:zoho.length?'CONFIGURED':'NOT_CONNECTED',calendars:zoho},meta:{limit:cap,truncated,mode:'owner_pilot',readOnly:true}}}];