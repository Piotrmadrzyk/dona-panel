const context = $('Validate Access').first().json;
if (!context.authorized || context.tenantId !== 'PM') throw new Error('ACCESS_DENIED');
const tenant = context.tenantId;
const cap = 250;
const truncated = [];
function read(name, tenantField, key) {
  const items = $(name).all().map(item => item.json);
  const scoped = items.filter(row => row.id !== undefined && row[tenantField] === tenant);
  // Empty-table output is deliberately represented as [], never as a fake record.
  if (!scoped.length) return [];
  if (scoped.length > cap) truncated.push(key);
  return scoped.slice(0, cap);
}
function text(value, max = 600) { return value === undefined || value === null ? '' : String(value).slice(0,max); }
function url(value) { const s=text(value,2000).trim(); return /^https:\/\/[^\s<>"']+$/i.test(s) ? s : ''; }
function parse(value) { if(value && typeof value==='object' && !Array.isArray(value)) return value; try { const result=JSON.parse(value || '{}'); return result && typeof result==='object' && !Array.isArray(result) ? result : {}; } catch { return {}; } }
function cleanPreview(value) {
  const parsed=parse(value);
  if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) {
    const allowed=['subject','temat','title','tytul','body','tresc','message','wiadomosc','summary','opis','to','sendTo','recipient','odbiorca'];
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
const approvalTypes={EMAIL_SEND:'Wiadomość do wysłania',SEND_EMAIL:'Wiadomość do wysłania',PUBLISH_PAGE:'Publikacja strony',PUBLISH:'Publikacja',DELETE:'Usunięcie danych'};
const approvals=read('Read Approvals','tenant_id','approvals').map(r=>{
  const payload=parse(r.payload_preview);
  const preview=cleanPreview(r.payload_preview);
  const type=text(r.action_type).toUpperCase();
  return {id:text(r.approval_id),title:text(payload.subject||payload.temat||payload.title||payload.tytul||approvalTypes[type]||'Prośba o zatwierdzenie',200),
    type:approvalTypes[type]||type.replace(/_/g,' '),clientName:text(payload.recipient||payload.to||payload.odbiorca,150),
    status:text(r.status),preview,createdAt:text(r.created_at||r.createdAt),expiresAt:text(r.expires_at),description:''};
});
const leads=read('Read Leads','client_id','leads').map(r=>({id:text(r.lead_id),name:text(r.imie),title:text(r.imie||r.email||'Zapytanie'),email:text(r.email),phone:text(r.telefon),status:text(r.status),description:text(r.tresc||r.notatka,6000),source:text(r.zrodlo),createdAt:text(r.utworzono||r.createdAt)}));
const offers=read('Read Offers','client_id','offers').map(r=>({id:text(r.offer_id),title:text(r.nazwa_pliku||'Oferta '+r.offer_id),clientName:clientName(r.customer_id),status:text(r.status),amount:r.total_netto!==null&&r.total_netto!==''&&Number.isFinite(Number(r.total_netto))?Number(r.total_netto):null,currency:text(r.waluta)||'PLN',createdAt:text(r.utworzono||r.createdAt),expiresAt:text(r.valid_until),url:url(r.drive_link),description:text(r.approval_reason||r.decision_reason)}));
const clients=customers.map(r=>({id:text(r.customer_id),name:text(r.nazwa||r.firma_nazwa||r.customer_id),email:text(r.emails),phone:text(r.telefony),status:text(r.status||r.lifecycle_stage),nextAction:text(r.next_action),nextActionAt:text(r.next_action_at),createdAt:text(r.utworzono||r.createdAt)}));
const meetings=read('Read Meetings','client_id','meetings').map(r=>({id:text(r.meeting_id),title:text(r.tytul),clientName:clientName(r.customer_id),date:text(r.start),end:text(r.koniec),status:text(r.status),location:text(r.lokalizacja),url:url(r.event_link),createdAt:text(r.utworzono||r.createdAt)}));
const tasks=read('Read Tasks','tenant_id','tasks').map(r=>({id:text(r.zadanie_id),title:text(r.tytul),description:text(r.opis),date:text(r.due_at||r.termin),status:text(r.status),clientName:clientName(r.customer_id),createdAt:text(r.utworzono||r.createdAt)}));
const files=read('Read Documents','klient_id','files').map(r=>({id:text(r.dokument_id),title:text(r.nazwa_pliku||r.temat||r.dokument_id),type:text(r.typ_dokumentu),status:text(r.status),url:url(r.drive_link),createdAt:text(r.utworzono||r.createdAt)}));
const activity=read('Read Events','client_id','activity').slice(0,12).map(r=>({id:text(r.event_id),title:text(r.event_type||'Zdarzenie klienta').replace(/_/g,' '),clientName:clientName(r.customer_id),date:text(r.czas||r.createdAt)}));
return [{json:{ok:true,generatedAt:new Date().toISOString(),context:{tenantId:tenant,name:text(configs[0].nazwa)||'Probatum',userName:'Piotr',role:'OWNER'},approvals,leads,offers,clients,meetings,tasks,files,activity,meta:{limit:cap,truncated,mode:'owner_pilot',readOnly:true}}}];
