const crypto = require('crypto');
const ctx = $('Validate Access').first().json;
const b = $('Workspace Request').first().json.body;
const deny = (error, statusCode=409) => [{json:{ok:false,error,statusCode}}];
if (!ctx.authorized || ctx.tenantId !== 'PM') return deny('auth',401);
const hash = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const now = new Date().toISOString();
const brands = ['','probatum','silverandglass','edwardjanusz'];
if (b.operation === 'save_memory') {
  if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > 6000 || !brands.includes(b.brandId||'') || !/^[a-zA-Z0-9-]{12,80}$/.test(b.requestId||'')) return deny('invalid_memory',400);
  if (b.sourceUrl && !/^https:\/\/[^\s<>"']+$/.test(b.sourceUrl)) return deny('invalid_source',400);
  return [{json:{ok:true,kind:'memory',id:'panel-'+b.requestId,text:b.text.trim(),brandId:b.brandId||'',tags:b.brandId?'brand:'+b.brandId:'',sourceUrl:b.sourceUrl||'',now,title:'Zapisano informację w pamięci',status:'SAVED'}}];
}
if (!['approve','reject'].includes(b.action) || !['social','approval'].includes(b.kind) || typeof b.id!=='string' || b.id.length>160 || !/^[a-f0-9]{64}$/.test(b.revision||'')) return deny('invalid_decision',400);
if (b.kind==='social') {
  const rows=$('Read Social Target').all().map(i=>i.json).filter(r=>r.post_key===b.id);
  if(rows.length!==1)return deny('not_found',404);
  const r=rows[0],allowed={edwardjanusz:{id:'61594093026807',host:'https://www.edwardjanusz.pl/'},silverandglass:{id:'61593755021660',host:'https://www.silverandglass.pl/'}};
  const page=allowed[r.profile_key];
  if(!page||r.fb_page_id!==page.id)return deny('scope',403);
  const digest=hash(JSON.stringify([r.profile_key,r.fb_page_id,r.source_url,r.image_url,r.image_sha256,r.caption]));
  if(r.status!=='DRAFT'||r.caption_hash!==b.revision||digest!==b.revision)return deny('stale_content');
  if(!r.source_url.startsWith(page.host)||!r.image_url.startsWith(page.host)||!/^[a-f0-9]{64}$/.test(r.image_sha256||''))return deny('invalid_material');
  return [{json:{ok:true,kind:'social',rowId:r.id,id:r.post_key,brandId:r.profile_key,previousStatus:r.status,profileKey:r.profile_key,pageId:r.fb_page_id,sourceUrl:r.source_url,imageUrl:r.image_url,captionHash:digest,caption:r.caption,imageHash:r.image_sha256,now,status:b.action==='approve'?'APPROVED':'REJECTED',title:b.action==='approve'?'Zatwierdzono post: '+String(r.source_title||r.post_key).slice(0,180):'Odrzucono szkic posta',approvedHash:b.action==='approve'?digest:''}}];
}
const rows=$('Read Approval Target').all().map(i=>i.json).filter(r=>r.approval_id===b.id&&r.tenant_id==='PM');
if(rows.length!==1)return deny('not_found',404);
const r=rows[0];
if(r.status!=='REQUESTED'||hash(r.payload_preview||'')!==b.revision)return deny('stale_content');
if(!r.expires_at||!Number.isFinite(Date.parse(r.expires_at))||Date.parse(r.expires_at)<=Date.now())return deny('expired');
let payload;try{payload=JSON.parse(r.payload_preview);}catch{return deny('invalid_payload');}
const fields=['do','temat','tresc','konto','to','subject','body','sendTo','recipient','thread_id','message_id','in_reply_to','references'];
if(b.action==='approve'&&(!/^send_email(?:_reply_recepcja_poczty)?$/i.test(r.action_type||'')||!payload||typeof payload!=='object'||Array.isArray(payload)||!(payload.do||payload.to||payload.sendTo||payload.recipient)||!(payload.tresc||payload.body)||!Object.keys(payload).every(k=>fields.includes(k)&&typeof payload[k]==='string'&&payload[k].length<=30000)))return deny('unsupported_action',400);
return [{json:{ok:true,kind:'approval',rowId:r.id,id:r.approval_id,brandId:'',previousStatus:'REQUESTED',actionType:r.action_type,payloadPreview:r.payload_preview,payloadHash:r.payload_hash,expiresAt:r.expires_at,now,status:b.action==='approve'?'APPROVED':'REJECTED',title:b.action==='approve'?'Zatwierdzono przygotowaną wiadomość':'Odrzucono prośbę o zgodę'}}];
