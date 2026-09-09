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
function url(value) { const s=text(value,2000).trim(); return /^https:\/\/[^\s<>"']+$/i.test(s) ? s : ''; }
function parse(value) { if(value && typeof value==='object' && !Array.isArray(value)) return value; try { const result=JSON.parse(value || '{}'); return result && typeof result==='object' && !Array.isArray(result) ? result : {}; } catch { return {}; } }
function parseList(value) { if(Array.isArray(value)) return value; try { const result=JSON.parse(value || '[]'); return Array.isArray(result) ? result : []; } catch { return []; } }
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
const customers=read('Read Customers','client_id','clients');
const names=new Map(customers.map(r=>[text(r.customer_id),text(r.nazwa||r.firma_nazwa)]));
const clientName=id=>names.get(text(id))||'';
const approvalTypes={SEND_EMAIL_REPLY_RECEPCJA_POCZTY:'Odpowiedź na wiadomość',EMAIL_SEND:'Wiadomość do wysłania',SEND_EMAIL:'Wiadomość do wysłania',PUBLISH_PAGE:'Publikacja strony',PUBLISH:'Publikacja',DELETE:'Usunięcie danych'};
const approvalFields=['do','temat','tresc','konto','to','subject','body','sendTo','recipient','thread_id','message_id','in_reply_to','references'];
function approvalPayload(p){return Object.fromEntries(approvalFields.filter(k=>typeof p[k]==='string').map(k=>[k,text(p[k],30000)]));}
function canApprove(r,p){return /^send_email(?:_reply_recepcja_poczty)?$/i.test(r.action_type||'')&&!!(p.do||p.to||p.sendTo||p.recipient)&&!!(p.tresc||p.body)&&Object.keys(p).every(k=>approvalFields.includes(k)&&typeof p[k]==='string'&&p[k].length<=30000);}
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
const clients=customers.map(r=>({id:text(r.customer_id),name:text(r.nazwa||r.firma_nazwa||r.customer_id),email:text(r.emails),phone:text(r.telefony),status:text(r.status||r.lifecycle_stage),nextAction:text(r.next_action),nextActionAt:text(r.next_action_at),createdAt:text(r.utworzono||r.createdAt)}));
const meetings=read('Read Meetings','client_id','meetings').map(r=>({id:text(r.meeting_id),title:text(r.tytul),clientName:clientName(r.customer_id),date:text(r.start),end:text(r.koniec),status:text(r.status),location:text(r.lokalizacja),url:url(r.event_link),createdAt:text(r.utworzono||r.createdAt)}));
const tasks=read('Read Tasks','tenant_id','tasks').map(r=>({id:text(r.zadanie_id),title:text(r.tytul),description:text(r.opis),date:text(r.due_at||r.termin),status:text(r.status),clientName:clientName(r.customer_id),createdAt:text(r.utworzono||r.createdAt)}));
// PM_dokumenty is a personal-project table for this owner pilot. klient_id identifies a business customer, not the owner.
const files=readOwnerTable('Read Documents','files').map(r=>({id:text(r.dokument_id),title:text(r.nazwa_pliku||r.temat||r.dokument_id),type:text(r.typ_dokumentu),status:text(r.status),url:driveUrl(r.drive_link),createdAt:text(r.utworzono||r.createdAt)})).filter(r=>r.id);
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
const connections=[{id:'workspace',name:'Dane panelu',status:'READ_OK',detail:'Ten odczyt danych zakończył się powodzeniem.',source:'dona-workspace'},
{id:'calendar',name:'Kalendarz Google',status:configs[0].calendar_id?'CONFIGURED':'UNKNOWN',detail:configs[0].calendar_id?'Wybrany kalendarz: '+text(configs[0].calendar_id)+'. Dostęp do Google nie był sprawdzany w tym odczycie.':'Brak identyfikatora kalendarza w konfiguracji.',source:'PM_tenant_config'},
{id:'brain',name:'Drugi mózg',status:'READ_OK',detail:'Odczytano '+memory.length+' wpisów dla Twojej przestrzeni.',source:'PM_drugi_mozg'},
...socialProfiles.map(p=>{const buffer=p.connection==='BUFFER_CONNECTED'&&!!p.bufferChannelId;return {id:p.id,name:p.name+' · Facebook',status:buffer?'READ_OK':p.connection==='META_NOT_CONNECTED'?'NOT_CONNECTED':p.enabled?'CONFIGURED':'PAUSED',detail:buffer?'Kanał Buffer został odczytany i przypisany do właściwej strony. Automatyczna publikacja pozostaje wyłączona; każdy materiał wymaga zatwierdzenia dokładnej treści.':p.connection==='META_NOT_CONNECTED'?'Brak połączenia z Meta lub Buffer. Posty nie mogą się publikować.':p.enabled?'Publikacja włączona w konfiguracji. Ten odczyt nie sprawdza tokenu ani wykonania harmonogramu.':'Publikacja wyłączona.',source:buffer?'Buffer API + PM_social_profiles':p.source};})];
const mails=read('Read Mail','tenant_id','mails').map(r=>({id:text(r.mail_id),title:text(r.subject),sender:text(r.sender_email||r.sender),snippet:text(r.snippet,1000),status:text(r.status),waiting:text(r.waiting_status),date:text(r.czas||r.createdAt),brandId:brand(r)}));
const mailboxSync=read('Read Mail Sync','tenant_id','mailboxSync').map(r=>({id:text(r.sync_id),name:text(r.mailbox_adres),status:text(r.status),checkedAt:text(r.ostatni_sync),error:!!r.blad}));
const permanentMemory=read('Read Project Memory','tenant_id','permanentMemory').map(r=>({id:text(r.pamiec_id),brandId:brand(r),text:text(r.fakt,6000),type:text(r.typ),status:text(r.status),tags:text(r.domain),source:'Pamięć projektowa',sourceRef:text(r.source_id||r.zrodlo),updatedAt:text(r.aktualizacja||r.updatedAt),readOnly:true}));
const workHistory=read('Read Panel Events','tenant_id','workHistory').map(r=>({id:text(r.event_id),title:text(r.title),kind:text(r.kind),status:text(r.status),referenceId:text(r.reference_id),brandId:text(r.brand_id),date:text(r.occurred_at)}));
const calendarRows=read('Read Zoho Calendar','tenant_id','calendar');
const zoho=calendarRows.filter(r=>r.provider==='zoho').map(r=>{let events=[];try{const e=JSON.parse(r.events_json||'[]');events=Array.isArray(e)?e:[];}catch{}return {id:text(r.calendar_id),name:text(r.calendar_name),status:text(r.status),checkedAt:text(r.checked_at),errorCode:text(r.error_code),rangeStart:text(r.range_start),rangeEnd:text(r.range_end),events:events.slice(0,500).map(e=>({id:text(e.id),title:text(e.title),date:text(e.date),end:text(e.end),allDay:e.allDay===true,location:text(e.location),url:url(e.url),status:text(e.status),provider:'zoho',calendarId:text(r.calendar_id),brandId:brand(e)}))};});
connections.push({id:'zoho',name:'Zoho Calendar',status:zoho.length?(zoho.every(c=>c.status==='READ_OK')?'READ_OK':'ERROR'):'NOT_CONNECTED',detail:zoho.length?'Ostatnia synchronizacja: '+text(zoho[0].checkedAt)+'. Widok pokazuje zapisany wynik synchronizacji.':'Połącz konto Zoho, aby pobierać spotkania. Kalendarz Google jest osobną integracją.',source:'Zoho Calendar API'});

for(const collection of [leads,offers,clients,meetings,tasks,files,activity,mediaAnalyses])for(const item of collection)if(!item.brandId)item.brandId='';
return [{json:{ok:true,generatedAt:new Date().toISOString(),context:{tenantId:tenant,name:text(configs[0].nazwa)||'Probatum',userName:'Piotr',role:'OWNER'},approvals,leads,offers,clients,meetings,tasks,files,mediaAnalyses,activity,memory,permanentMemory,socialProfiles,socialPosts,connections,mails,mailboxSync,workHistory,calendar:{provider:'zoho',status:zoho.length?'CONFIGURED':'NOT_CONNECTED',calendars:zoho},meta:{limit:cap,truncated,mode:'owner_pilot',readOnly:true}}}];
