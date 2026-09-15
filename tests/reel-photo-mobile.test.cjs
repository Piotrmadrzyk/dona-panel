const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('pilot/index.html','utf8');
const chat=fs.readFileSync('pilot/chat.js','utf8');
const business=fs.readFileSync('pilot/business.js','utf8');

test('mobile composer accepts up to eight photos and uses the fast Drive endpoint',()=>{
  assert.match(html,/id="fileInp"[^>]*multiple/);
  assert.match(chat,/PHOTO_URL=API\+"\/dona-panel-zdjecie"/);
  assert.match(chat,/if\(files\.length>8\)/);
  assert.match(chat,/for\(var start=0;start<files\.length;start\+=3\)/);
  assert.match(chat,/width:p\.width,height:p\.height/);
});

test('phone photos are resized locally and submitted as JPEG before upload',()=>{
  assert.match(chat,/1920\/Math\.max\(img\.naturalWidth,img\.naturalHeight\)/);
  assert.match(chat,/canvas\.toBlob/);
  assert.match(chat,/'image\/jpeg'/);
  assert.match(chat,/3\.5\*1024\*1024/);
});

test('media view has a direct photo-reel action and hands Drive ids to Marketing',()=>{
  assert.match(business,/data-business-photos/);
  assert.match(business,/window\.Dona\.pickReelPhotos\(\)/);
  assert.match(chat,/pickReelPhotos:function/);
  assert.match(chat,/plik_id:p\.fileId/);
  assert.match(chat,/galaz:'marketing'/);
  assert.match(chat,/trybu PHOTO_SLIDESHOW/);
});
