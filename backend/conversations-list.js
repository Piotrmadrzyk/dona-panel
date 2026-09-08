const tenant = $('Validate Conversation Access').first().json.tenantId;
const rows = $input.all().map(item => item.json).filter(row => row.id !== undefined && row.tenant_id === tenant && row.archived !== true);
rows.sort((a,b) => String(b.updated_at || b.updatedAt || '').localeCompare(String(a.updated_at || a.updatedAt || '')));
const threads = rows.slice(0, 50).map(row => ({
  id: String(row.thread_id || ''), title: String(row.title || 'Nowa rozmowa').slice(0,80),
  brandId: String(row.brand_id || ''), createdAt: String(row.created_at || row.createdAt || ''),
  updatedAt: String(row.updated_at || row.updatedAt || ''), messageCount: Number(row.message_count) || 0
})).filter(thread => thread.id === 'PM' || /^thread-[a-f0-9-]{20,80}$/i.test(thread.id));
return [{json:{ok:true,statusCode:200,threads}}];
