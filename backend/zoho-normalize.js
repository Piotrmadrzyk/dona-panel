const request=$('Select Calendar').item.json;
const raw=$input.first().json;
const body=raw.body||raw;
const code=Number(raw.statusCode)||200;
const ok=code>=200&&code<300&&Array.isArray(body.events);
function date(value,allDay){
 const s=String(value||'');
 if(allDay&&/^\d{8}$/.test(s))return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);
 const m=s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})?$/);
 if(!m)return '';
 const offset=m[7]?(m[7]==='Z'?'Z':m[7].slice(0,3)+':'+m[7].slice(3)):'Z';
 return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`;
}
const events=ok?body.events.map(e=>{
 const allDay=e.isallday===true;
 const start=date(e.dateandtime?.start||e.start,allDay),end=date(e.dateandtime?.end||e.end,allDay);
 return {id:String(e.uid||'')+':'+start,title:String(e.title||'Spotkanie').slice(0,500),date:start,end,allDay,location:String(e.location||'').slice(0,600),status:String(e.status||'SCHEDULED'),url:'',brandId:''};
}).filter(e=>e.id&&e.date&&e.end):[];
const invalid=ok&&(events.length!==body.events.length||events.length>500);
return [{json:{tenant_id:'PM',provider:'zoho',calendar_id:request.calendarId,calendar_name:request.calendarName,events_json:JSON.stringify(events.slice(0,500)),status:ok&&!invalid?'READ_OK':'ERROR',checked_at:new Date().toISOString(),error_code:invalid?'INVALID_OR_TRUNCATED_EVENTS':ok?'':'ZOHO_READ_FAILED_'+code,range_start:request.rangeStart,range_end:request.rangeEnd}}];
