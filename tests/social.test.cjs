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
test('social rejects missing approval, changed material, foreign profile, expired approval and disconnected channel',()=>{
 for(const change of [f=>f.posts[0].status='DRAFT',f=>f.posts[0].caption+=' edited',f=>f.posts[0].approved_by='DONA',f=>f.posts[0].approved_at='2020-01-01',f=>f.profiles[0].buffer_channel_id='other',f=>f.channels[0].isDisconnected=true,f=>f.request.ok=false,f=>f.request.profile_key='silverandglass']){
  const f=fixture();change(f);assert.notEqual(runSelect(f).route,'publish');
 }
});
test('read-only questions cannot become publication through LLM operation selection',()=>{
 for(const message of ['Widzisz posty?','Nie publikuj','Opublikuj test','Tylko odczyt, bez publikacji','Czy umiesz publikować?']){
  const f=fixture();f.request.original_message=message;assert.equal(runSelect(f).error,'EXPLICIT_PUBLISH_COMMAND_REQUIRED');
 }
});
test('unknown, accepted and already published posts block duplicates',()=>{
 for(const status of ['PUBLISHING','BUFFER_ACCEPTED','UNKNOWN','PUBLISHED']){
  const f=fixture();f.posts.push({...f.posts[0],id:9,post_key:'other',status,scheduled_date:new Date().toISOString().slice(0,10)});assert.notEqual(runSelect(f).route,'publish');
 }
 const f=fixture();f.posts.push({...f.posts[0],id:1,post_key:'first'});assert.equal(runSelect(f).error,'ANOTHER_APPROVED_POST_IS_FIRST');
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
 assert.match(w,/Claim Exact Approved Post/);assert.match(w,/Verify Approved Photo/);assert.match(w,/"callerIds":"vE77e9dXD2e93jBW"/);
 assert.match(w,/\.to\(claim\)\.to\(confirm\)\.to\(write\)/);
});
