const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const select=fs.readFileSync('backend/social-select.js','utf8');
const result=fs.readFileSync('backend/social-result.js','utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function fixture(){
 const p={id:3,profile_key:'edwardjanusz',fb_page_id:'61594093026807',post_key:'edwardjanusz:dzf-2-9',source_title:'Leopoldyna Janusz',source_url:'https://www.edwardjanusz.pl/zbior/dzf-2-9',image_url:'https://www.edwardjanusz.pl/images/zbior/dzf-2-9a.jpg',image_sha256:'a'.repeat(64),caption:'Zatwierdzona treść.',status:'APPROVED',approved_by:'Piotr',approved_at:new Date().toISOString(),scheduled_date:''};
 p.approved_hash=p.caption_hash=hash(JSON.stringify([p.profile_key,p.fb_page_id,p.source_url,p.image_url,p.image_sha256,p.caption]));
 return {request:{ok:true,operation:'publish_approved',post_key:p.post_key,original_message:'Opublikuj zatwierdzony post na Janusza'},posts:[p],profiles:[{profile_key:p.profile_key,fb_page_id:p.fb_page_id,buffer_channel_id:'6aa08c72cd8b9c702c31bbbd',connection_status:'BUFFER_CONNECTED',scope:'ORGANIC_PHOTO_POSTS_ONLY',approval_policy:'APPROVED_EXACT_CONTENT_ONLY',posts_per_day:1,posting_enabled:false}],channels:[{id:'6aa08c72cd8b9c702c31bbbd',service:'facebook',isDisconnected:false,isLocked:false}]};
}
function runSelect(f){
 const byName={'Authorize Social Request':[f.request],'Read Social Profiles':f.profiles,'Read Social Posts':f.posts};
 return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+select+'})()',{
 require,Date,$execution:{id:'exec-test'},$now:{setZone:()=>({toISODate:()=>new Date().toISOString().slice(0,10)})},
 $input:{first:()=>({json:{body:{data:{channels:f.channels}}}})},
 $:name=>({first:()=>({json:byName[name][0]}),all:()=>byName[name].map(json=>({json}))})
 })[0].json));
}
test('social read exposes real post identity and approvals without writing',()=>{
 const f=fixture();f.request.operation='read';const r=runSelect(f);
 assert.equal(r.route,'return');assert.equal(r.approved_count,1);assert.equal(r.posts[0].post_key,f.posts[0].post_key);assert.equal(r.profiles[0].connected,true);assert.equal(r.payload,undefined);
});
test('publishing uses exactly approved text, image and known Buffer channel',()=>{
 const f=fixture(),r=runSelect(f);assert.equal(r.route,'publish');assert.equal(r.payload.variables.input.text,f.posts[0].caption);assert.equal(r.payload.variables.input.assets[0].image.url,f.posts[0].image_url);assert.equal(r.payload.variables.input.mode,'shareNow');assert.equal(r.payload.variables.input.channelId,f.profiles[0].buffer_channel_id);
});
test('explicit Polish wrzuć command is recognized as a whole word',()=>{
 const f=fixture();f.request.original_message='Wrzuć zatwierdzony post';assert.equal(runSelect(f).route,'publish');
 f.request.original_message='Nie wrzuć posta';assert.notEqual(runSelect(f).route,'publish');
});
test('current owner command publishes the exact version selected after read, regardless of queue or date',()=>{
 const f=fixture();f.request.operation='read';const read=runSelect(f);
 f.request={...f.request,operation:'publish_now',post_key:f.posts[0].post_key,original_message:'Opublikuj teraz ten post',expected_content_hash:read.posts[0].content_hash};
 f.posts[0].status='DRAFT';f.posts[0].scheduled_date='2099-01-01';
 f.posts.unshift({...fixture().posts[0],id:1,post_key:'first-approved'});
 f.posts.push({...fixture().posts[0],id:9,post_key:'published-today',status:'PUBLISHED',scheduled_date:new Date().toISOString().slice(0,10),published_url:'https://www.facebook.com/posts/123'});
 const r=runSelect(f);assert.equal(r.route,'publish');assert.equal(r.post.post_key,f.request.post_key);assert.equal(r.approval.approved_by,'Piotr');assert.equal(r.approval.approved_hash,f.request.expected_content_hash);
});
test('owner override fails closed when exact content was not read or changed afterwards',()=>{
 const f=fixture();f.request.operation='publish_now';f.request.original_message='Opublikuj teraz ten post';f.posts[0].status='DRAFT';
 assert.equal(runSelect(f).error,'READ_EXACT_VERSION_FIRST');
 f.request.expected_content_hash=hash(JSON.stringify([f.posts[0].profile_key,f.posts[0].fb_page_id,f.posts[0].source_url,f.posts[0].image_url,f.posts[0].image_sha256,f.posts[0].caption]));
 f.posts[0].caption+=' zmieniona';assert.equal(runSelect(f).error,'POST_CHANGED_SINCE_READ');
});
test('legacy approved publishing rejects missing approval, changed material, foreign profile and disconnected channel',()=>{
 for(const change of [f=>f.posts[0].status='DRAFT',f=>f.posts[0].caption+=' edited',f=>f.posts[0].approved_by='DONA',f=>f.profiles[0].buffer_channel_id='other',f=>f.channels[0].isDisconnected=true,f=>f.request.ok=false,f=>f.request.profile_key='silverandglass']){
  const f=fixture();change(f);assert.notEqual(runSelect(f).route,'publish');
 }
});
test('read-only questions cannot become publication through LLM operation selection',()=>{
 for(const message of ['Widzisz posty?','Nie publikuj','Tylko odczyt, bez publikacji','Czy umiesz publikować?','Czy możesz opublikować ten post?']){
  const f=fixture();f.request.original_message=message;assert.equal(runSelect(f).error,'EXPLICIT_PUBLISH_COMMAND_REQUIRED');
 }
});
test('selected post is protected against duplicate publication without blocking other selected work',()=>{
 const f=fixture();f.posts.push({...f.posts[0],id:9,post_key:'other',status:'PUBLISHING'});assert.equal(runSelect(f).route,'publish');
 for(const status of ['PUBLISHING','BUFFER_ACCEPTED','UNKNOWN']){
  const same=fixture();same.posts[0].status=status;same.posts[0].buffer_post_id='buffer-12345';assert.equal(runSelect(same).route,'status');
 }
 const published=fixture();published.posts[0].status='PUBLISHED';published.posts[0].published_url='https://www.facebook.com/posts/123';const r=runSelect(published);assert.equal(r.route,'return');assert.equal(r.published,true);assert.equal(r.payload,undefined);
});
function runResult(remote,previousOverrides={}){
 const f=fixture(),selected={route:'publish',post:{...f.posts[0],...previousOverrides},channelId:f.channels[0].id,today:'2026-09-09'};
 return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+result+'})()',{
 $execution:{id:'exec-test'},$input:{first:()=>({json:{body:remote}})},
 $:name=>name==='Select Social Operation'?{first:()=>({json:selected})}:{isExecuted:false}
 })[0].json));
}
test('Buffer accepted is not Facebook published',()=>{
 const post={id:'buffer-12345',channelId:fixture().channels[0].id,text:fixture().posts[0].caption,status:'sending'};
 const accepted=runResult({data:{createPost:{post}}});assert.equal(accepted.status,'BUFFER_ACCEPTED');assert.equal(accepted.published,false);
 assert.equal(runResult({data:{createPost:{post:{...post,status:'sent'}}}}).published,false);
 const published=runResult({data:{createPost:{post:{...post,status:'sent',sentAt:'2026-09-09T18:00:00Z',externalLink:'https://www.facebook.com/posts/123'}}}});
 assert.equal(published.published,true);assert.equal(published.status,'PUBLISHED');
 assert.equal(runResult({errors:[{message:'ambiguous'}]}).status,'UNKNOWN');
 assert.equal(runResult({data:{createPost:{post:{...post,channelId:'wrong'}}}}).status,'UNKNOWN');
});
test('social executor has no automatic publication trigger and keeps exact claim ahead of write',()=>{
 const w=fs.readFileSync('backend/social.workflow.ts','utf8');
 assert.doesNotMatch(w,/scheduleTrigger|n8n-nodes-base.webhook|retryOnFail":true/);
 assert.match(w,/Claim Exact Approved Post/);assert.match(w,/Verify Approved Photo/);assert.match(w,/"callerIds":"vE77e9dXD2e93jBW,mILGt8TyRMEf6NZg"/);
 assert.match(w,/expected_content_hash/);assert.match(w,/publish_now/);assert.match(w,/updatedAt/);
 assert.doesNotMatch(w,/ANOTHER_APPROVED_POST_IS_FIRST|DAILY_LIMIT_REACHED|POST_SCHEDULED_FOR_FUTURE/);
 assert.match(w,/\.to\(claim\)\.to\(confirm\)\.to\(write\)/);
});
