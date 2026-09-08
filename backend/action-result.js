const g=$('Check Exact Content').first().json;
const rows=$input.all().map(i=>i.json).filter(r=>r.id!==undefined);
const match=rows.find(r=>g.kind==='memory'?r.wpis_id===g.id&&r.tenant_id==='PM':g.kind==='social'?r.post_key===g.id&&r.status===g.status:r.approval_id===g.id&&r.tenant_id==='PM'&&r.status===g.status);
if(!match)return [{json:{ok:false,statusCode:409,error:'write_not_confirmed'}}];
return [{json:{ok:true,statusCode:200,id:g.id,kind:g.kind,status:g.status,brandId:g.brandId,title:g.title,date:g.now,eventId:'panel-'+String($execution.id),answer:g.kind==='memory'?'Informacja zapisana w drugim mózgu.':g.kind==='social'?(g.status==='APPROVED'?'Post zatwierdzony. Publikacja wymaga działającego połączenia z Facebookiem i włączonego harmonogramu.':'Szkic odrzucony.'):(g.status==='APPROVED'?'Zgoda zapisana. Wiadomość nie została wysłana przez ten przycisk.':'Prośba odrzucona.')}}];
