const row = $('Build New Thread').first().json;
return [{json:{ok:true,statusCode:201,thread:{id:row.thread_id,title:row.title,brandId:row.brand_id,createdAt:row.created_at,updatedAt:row.updated_at,messageCount:row.message_count}}}];
