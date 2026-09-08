const auth = $('Validate Conversation Access').first().json;
const threadRows = $('Read Conversation Thread').all().map(item => item.json).filter(row => row.id !== undefined && row.tenant_id === auth.tenantId && row.thread_id === auth.threadId);
const rows = $input.all().map(item => item.json).filter(row => row.id !== undefined && row.sesja === auth.threadId);
rows.sort((a,b) => String(a.czas || a.createdAt || '').localeCompare(String(b.czas || b.createdAt || '')));
if (threadRows.length !== 1) return [{json:{ok:false,statusCode:404,error:'thread_not_found'}}];
const row = threadRows[0];
const messages = rows.slice(-200).map(message => ({id:String(message.wiadomosc_id || message.id || ''),role:message.rola === 'user' ? 'user' : 'dona',text:String(message.tresc || '').slice(0,30000),createdAt:String(message.czas || message.createdAt || '')}));
return [{json:{ok:true,statusCode:200,thread:{id:String(row.thread_id),title:String(row.title || 'Nowa rozmowa').slice(0,80),brandId:String(row.brand_id || ''),createdAt:String(row.created_at || row.createdAt || ''),updatedAt:String(row.updated_at || row.updatedAt || ''),messageCount:Number(row.message_count) || messages.length},messages}}];
