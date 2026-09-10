const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Minimal harness mirroring tests/feature-requests.test.cjs, just enough to render the
// marketing view and inspect the resulting HTML for the GA4 stat badge.
function panel(snapshot) {
  const nodes = new Map();
  const element = () => ({value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},setAttribute(){},close(){this.open=false;},showModal(){this.open=true;}});
  const root = element();
  let html='';
  Object.defineProperty(root,'innerHTML',{set(value){html=value;},get(){return html;}});
  nodes.set('viewContent',root);
  const window={addEventListener(){},dispatchEvent(){},Dona:{request(){return new Promise(()=>{});}}};
  const document={body:{appendChild(){}},createElement:element,getElementById:id=>nodes.get(id)||null,addEventListener(){}};
  const context=vm.createContext({window,document,URL,TypeError,console,setTimeout(){},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../pilot/features.js'),'utf8'),context);
  window.DonaFeatures.render('marketing',snapshot,false);
  return html;
}

test('GA4 stat badge is keyed by domain (not the internal site id) so it actually matches what the collection workflow writes',()=>{
  const html=panel({mediaAnalyses:[],wwwStats:{
    'probatum.pl':{odslony:340,uzytkownicy:128,sesje:150,zakres:'last7days',zebrano:'2026-09-10T06:00:00.000Z'},
    'edwardjanusz.pl':{odslony:0,uzytkownicy:0,sesje:0,zakres:'last7days',zebrano:'2026-09-10T06:00:00.000Z'}
  }});
  assert.match(html,/site-stat-badge/);
  assert.match(html,/340 odsłon/);
  // A real zero (not missing data) is a legitimate value and must still render, not be hidden.
  assert.match(html,/0 odsłon/);
  // silverandglass.pl has no row in this snapshot - its card gets no badge at all, not a fake zero.
  const silverCardStart=html.indexOf('Silver &amp; Glass');
  const silverCardEnd=html.indexOf('</article>',silverCardStart);
  assert.doesNotMatch(html.slice(silverCardStart,silverCardEnd),/site-stat-badge/);
});

test('missing wwwStats (older snapshot shape, or a fetch that has not run yet) renders cards with no badge and no crash',()=>{
  const html=panel({mediaAnalyses:[]});
  assert.doesNotMatch(html,/site-stat-badge/);
  assert.match(html,/class="site-card"/);
});
