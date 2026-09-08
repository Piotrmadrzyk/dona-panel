const crypto = require('crypto');
const auth = $('Validate Conversation Access').first().json;
const rows = $input.all().map(item => item.json).filter(row => row.id !== undefined && row.tenant_id === auth.tenantId && row.thread_id === auth.threadId);
if (rows.length !== 1) return [{json:{valid:false,ok:false,statusCode:404,error:'thread_not_found'}}];
const thread = rows[0];
const now = new Date().toISOString();
let title = String(thread.title || 'Nowa rozmowa').slice(0,80);
if (auth.role === 'user' && (!title || title === 'Nowa rozmowa')) {
  const clean = auth.content.replace(/^\[[^\]]{1,40}\]\s*/, '').replace(/\s+/g, ' ').trim();
  title = clean.length > 54 ? clean.slice(0,53).trim() + '…' : (clean || 'Nowa rozmowa');
}
return [{json:{valid:true,ok:true,statusCode:200,tenant_id:auth.tenantId,thread_id:auth.threadId,role:auth.role,content:auth.content,message_id:auth.messageId || ('msg-' + crypto.randomUUID()),created_at:now,title,brand_id:String(thread.brand_id || auth.brandId || ''),message_count:(Number(thread.message_count) || 0) + 1}}];
