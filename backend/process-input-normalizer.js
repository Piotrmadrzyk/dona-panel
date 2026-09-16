const t = $input.first().json || {};
function clean(v,max=4000){return String(v===undefined||v===null?'':v).trim().slice(0,max);}
const operacja = clean(t.operacja,80).toLowerCase();
const tenant_id = clean(t.tenant_id,80) || 'PM';
const requested_by = clean(t.requested_by,120) || 'nieznany';
const czas = new Date().toISOString();
let proces_id = clean(t.proces_id,80);
const typ = clean(t.typ,120);
if (operacja === 'rozpocznij' && !proces_id) {
  const slug = (typ || 'proces').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
  proces_id = 'PROC-' + czas.replace(/[^0-9]/g, '').slice(0, 14) + '-' + (slug || 'proces');
}
const planNumber = Number(t.plan_version);
const resultFlag = t.result_ok === true || clean(t.result_ok,10).toLowerCase() === 'true';
return [{ json: {
  operacja, proces_id, typ,
  opis: clean(t.opis), krok_obecny: clean(t.krok_obecny), stan_json: clean(t.stan_json,100000),
  status: clean(t.status,80) || (operacja === 'rozpocznij' ? 'W_TOKU' : ''), wynik: clean(t.wynik,10000),
  tylko_aktywne: clean(t.tylko_aktywne,10).toLowerCase() !== 'nie',
  tenant_id, requested_by, czas,
  dodaj_ustalone: clean(t.dodaj_ustalone), dodaj_czeka_na_ciebie: clean(t.dodaj_czeka_na_ciebie),
  dodaj_zablokowane: clean(t.dodaj_zablokowane), usun_czeka_na_ciebie: clean(t.usun_czeka_na_ciebie),
  usun_zablokowane: clean(t.usun_zablokowane),
  zadanie_id: clean(t.zadanie_id,80), plan_version: Number.isInteger(planNumber) ? planNumber : 0,
  galaz: clean(t.galaz,40).toLowerCase(), result_reference: clean(t.result_reference,2000),
  result_summary: clean(t.result_summary,5000), result_ok: resultFlag, attempt_id: clean(t.attempt_id,120)
} }];
