const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('pilot/index.html','utf8');
const workspace=fs.readFileSync('pilot/workspace.js','utf8');
const business=fs.readFileSync('pilot/business.js','utf8');
const css=fs.readFileSync('pilot/business.css','utf8');

test('phone navigation always exposes sales, a new order, tools and Dona',()=>{
  const mobile=html.match(/<nav class="biz-mobile-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(mobile,/data-view="today"/);
  assert.match(mobile,/data-view="sales"/);
  assert.match(mobile,/>Sprzedaż</);
  assert.match(mobile,/data-business-new="task"/);
  assert.match(mobile,/data-view="tools"/);
  assert.match(mobile,/data-chat/);
  assert.match(mobile,/>Narzędzia</);
});

test('weather and maps are visible in the main menu instead of a hidden tools group',()=>{
  assert.match(html,/<a href="#weather" data-view="weather">/);
  assert.match(html,/<a href="#maps" data-view="maps">/);
  assert.match(html,/<a href="#tools" data-view="tools">[\s\S]*Wszystkie funkcje<\/strong><\/a>/);
  assert.doesNotMatch(html,/<summary>Wiedza i narzędzia<\/summary>/);
});

test('tool centre retains every former function in clear categories',()=>{
  for(const id of ['weather','maps','mail','calendar','drive','searchall','social','media','campaigns','websites','youtube','researchhub','sales','clients','inquiries','offers','finance','files','documents','projects','dona','knowledge','recipes','connections','health','operations','history','settings']){
    assert.match(workspace,new RegExp("id:'"+id+"'"),id);
  }
  assert.match(workspace,/Na co dzień/);
  assert.match(workspace,/Tworzenie i promocja/);
  assert.match(workspace,/Sprzedaż i firma/);
  assert.match(workspace,/Dona i system/);
});

test('home screen has immediate weather and maps shortcuts',()=>{
  assert.match(business,/SZYBKIE FUNKCJE/);
  assert.match(business,/\['weather','☀','Pogoda'\]/);
  assert.match(business,/\['maps','⌖','Mapy'\]/);
});

test('phone controls are touch-sized and include an emphasized new-order button',()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/biz-mobile-nav a,.biz-mobile-nav button\{[^}]*min-height:43px/);
  assert.match(css,/biz-mobile-create>span\{[^}]*width:38px[^}]*height:38px/);
  assert.match(css,/function-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
