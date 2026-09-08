const auth = $('Validate Panel Tools Access').first().json;
const rows = $input.all().map(item => item.json || {});
const first = rows[0] || {};
if (auth.operation === 'drive_search') {
  const results = Array.isArray(first.wyniki) ? first.wyniki.slice(0, 20).map(row => ({
    id:String(row.id || ''), name:String(row.nazwa || ''), type:String(row.typ || ''),
    url:/^https:\/\//.test(String(row.link || '')) ? String(row.link) : ''
  })).filter(row => row.id) : [];
  return [{json:{ok:first.status === 'ok' || first.status === 'nie_znaleziono',statusCode:first.status === 'blad' ? 502 : 200,status:String(first.status || 'blad'),query:auth.query,results,error:String(first.blad || first.wiadomosc || '')}}];
}
if (auth.operation === 'drive_read') {
  const ok = first.status === 'ok';
  return [{json:{ok,statusCode:ok ? 200 : 502,status:String(first.status || 'blad'),fileId:auth.fileId,name:String(first.nazwa || ''),type:String(first.typ || ''),text:String(first.tresc || first.info || '').slice(0,40000),error:String(first.blad || '')}}];
}
const status = String(first.status || first.status_koncowy || 'FAILED').toUpperCase();
const files = Array.isArray(first.pliki) ? first.pliki.slice(0, 20).map(row => ({
  name:String(row.nazwa || row.name || ''), type:String(row.typ || row.mimeType || ''),
  url:/^https:\/\//.test(String(row.link || row.url || '')) ? String(row.link || row.url) : ''
})) : [];
return [{json:{
  ok:['SUCCESS','PARTIAL'].includes(status), statusCode:status === 'FAILED' ? 502 : 200,
  status, message:String(first.komunikat || first.powod || ''), title:String(first.tytul || ''),
  source:String(first.zrodlo || auth.url), folderUrl:/^https:\/\//.test(String(first.folder_url || '')) ? String(first.folder_url) : '',
  files, stages:first.etapy || {}, transcriptCharacters:Number(first.znakow_transkrypcji) || 0,
  coverage:Number(first.pokrycie_procent) || 0, error:String(first.blad || '')
}}];
