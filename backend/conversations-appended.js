const row = $('Build Conversation Message').first().json;
return [{json:{ok:true,statusCode:200,thread:{id:row.thread_id,title:row.title,brandId:row.brand_id,updatedAt:row.created_at,messageCount:row.message_count},message:{id:row.message_id,role:row.role,text:row.content,createdAt:row.created_at}}}];
