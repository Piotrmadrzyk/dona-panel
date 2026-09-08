const crypto = require('crypto');
const auth = $('Validate Conversation Access').first().json;
const now = new Date().toISOString();
return [{json:{tenant_id:auth.tenantId,thread_id:'thread-' + crypto.randomUUID(),title:auth.title || 'Nowa rozmowa',brand_id:auth.brandId || '',created_at:now,updated_at:now,message_count:0,archived:false}}];
