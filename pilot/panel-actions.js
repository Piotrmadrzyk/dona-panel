(function(){
'use strict';
function plain(value){return String(value||'').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
let pendingWeatherPeriod='';
const routes=[
 {view:'operations',test:/\b(prac\w* agent\w*|co rob\w* agenc\w*|agenci|live ops|liveops|operacj\w* dony)\b/},
 {view:'mail',test:/\b(poczt\w*|mail\w*|wiadomosc\w*|skrzynk\w*)\b/},
 {view:'calendar',test:/\b(kalendarz\w*|spotkani\w*|termin\w*|grafik\w*)\b/},
 {view:'social',test:/\b(posty?|facebook|fb|messenger)\b/},
 {view:'approvals',test:/\b(zatwierd\w*|decyzj\w*|akceptacj\w*|odrzuc\w*)\b/},
 {view:'drive',test:/\b(dysk|drive|dokumenty|pliki)\b/},
 {view:'weather',test:/\b(pogod\w*|prognoz\w*|temperatur\w*|deszcz\w*)\b/},
 {view:'maps',test:/\b(mapa|mapy|mapie|mape|tras\w*|nawigacj\w*|lokalizacj\w*)\b/},
 {view:'youtube',test:/\b(youtube|transkrypcj\w*|map[ae] mysli|film\w*)\b/},
 {view:'recipes',test:/\b(receptur\w*|przepis\w*)\b/},
 {view:'marketing',test:/\b(stron\w*|www|realizacj\w*|portfolio)\b/},
 {view:'knowledge',test:/\b(wiedz\w*|pamie\w*|co wiesz)\b/},
 {view:'today',test:/\b(poranny brief|pulpit|dzisiaj|moj dzien)\b/}
];
function navigate(view,source){
 if(!view)return;location.hash='#'+view;
 if(source==='voice')window.dispatchEvent(new CustomEvent('dona:voice-panel-mode',{detail:{enabled:true,view:view}}));
 window.dispatchEvent(new CustomEvent('dona:panel-action',{detail:{type:'navigate',view,source}}));
}
function cleanPlace(value){return String(value||'').replace(/\b(?:na\s+)?(?:ten\s+)?weekend\w*\b/gi,'').replace(/\b(?:dzisiaj|dzis|teraz|jutro)\b/gi,'').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g,'').trim();}
function weatherPlace(text){
 const original=String(text||'');let match=original.match(/\b(?:w|we|dla)\s+([^?!.;,]{2,100})/i);if(match)return cleanPlace(match[1]);
 match=original.match(/\bpogod\w*\s+(?:na\s+weekend\w*\s+)?([^?!.;,]{2,100})/i);if(!match)return '';
 const place=cleanPlace(match[1]);return /^(?:u\s+mnie|tutaj|w\s+mojej\s+lokalizacji)$/i.test(place)?'':place;
}
function mapQuery(text){
 const original=String(text||'');let match=original.match(/\btras[a-ząćęłńóśźż]*\s+(?:do|na)\s+([^?!.;]{2,140})/iu);if(match)return cleanPlace(match[1]);
 match=original.match(/\b(?:mapa|mapy|mapie|mapę|mape)\s+(?:dla|z|ze|w|we|do)?\s*([^?!.;]{2,140})/i);if(!match)return '';
 return cleanPlace(match[1]).replace(/^(?:mi|proszę|prosze)\s+/i,'').trim();
}
function prepare(text,options){
 options=options||{};const normalized=plain(text);let route=null,clientAction=null;
 const navigation=/\b(pokaz|otworz|przejdz|wyswietl|zobacz|wejdz|sprawdz)\b/.test(normalized);
 const mindMap=/\bmap[ae] mysli\b/.test(normalized);
 for(const candidate of routes){if(candidate.view==='maps'&&mindMap)continue;if(candidate.test.test(normalized)&&(navigation||/^(dona\s+)?(poczta|mail|wiadomosci|kalendarz|posty|facebook|dysk|youtube|receptury|strony|pogoda|mapa|mapy|trasa|live ops|liveops|agenci)/.test(normalized))){route=candidate;break;}}
 const edit=/\b(edytuj|popraw|zmien|przeredaguj)\b/.test(normalized);
 if(route&&route.view==='mail'&&/\b(facebook|fb|messenger)\b/.test(normalized))route={view:'social'};
 if(edit&&/\b(post|facebook|fb)\b/.test(normalized))route={view:'social'};
 const cancel=/^(?:dona\s+)?(?:anuluj|niewazne|stop)\b/.test(normalized);
 const isWeather=/\b(pogod\w*|prognoz\w*|temperatur\w*|czy bedzie padac|deszcz\w*)\b/.test(normalized);
 if(options.navigateOnly){if(route)navigate(route.view,options.source);return {backendText:String(text||''),view:route&&route.view};}
 if(pendingWeatherPeriod&&cancel)pendingWeatherPeriod='';
 else if(pendingWeatherPeriod&&!isWeather&&normalized.length>1&&normalized.length<=100){
   route={view:'weather'};clientAction={type:'weather-place',place:String(text||'').trim(),period:pendingWeatherPeriod};pendingWeatherPeriod='';
 }else if(isWeather){
   route={view:'weather'};const weekend=/\b(weekend\w*|sobot\w*|niedziel\w*)\b/.test(normalized),local=/\b(u mnie|tutaj|moja lokalizacja|mojej lokalizacji|gdzie jestem)\b/.test(normalized),place=weatherPlace(text);
   if(place){clientAction={type:'weather-place',place,period:weekend?'weekend':'current'};pendingWeatherPeriod='';}
   else if(weekend&&!local){clientAction={type:'weather-needs-place',period:'weekend'};pendingWeatherPeriod='weekend';}
   else{clientAction={type:'weather-current',period:weekend?'weekend':'current'};pendingWeatherPeriod='';}
 }
 if((route&&route.view==='maps')||(/\b(wyznacz|prowad\w*)\b/.test(normalized)&&/\btras\w*\b/.test(normalized))){route={view:'maps'};const query=mapQuery(text);if(query)clientAction={type:'map-query',query};}
 if(route)navigate(route.view,options.source);
 if(edit&&route&&route.view==='social')setTimeout(()=>window.dispatchEvent(new CustomEvent('dona:request-revision',{detail:{kind:'social',text:String(text||''),source:options.source||'chat'}})),80);
 let backendText=String(text||'');
 if(route)backendText+='\n\n[KONTEKST PANELU: interfejs otworzył właśnie widok „'+route.view+'”. Odnieś odpowiedź do danych widocznych w tym widoku. Nie twierdź, że wykonano zmianę, jeśli nie ma potwierdzonego wyniku.]';
 if(/\b(kalendarz\w*|spotkani\w*|termin\w*)\b/.test(normalized)&&/\b(zablokuj\w*|usun\w*|odwol\w*|przeloz\w*|przenies\w*|zmien\w*|napisz\w*|wyslij\w*)\b/.test(normalized)){
   backendText+='\n\n[TRYB BEZPIECZNEJ OPERACJI KALENDARZOWEJ: rozpoznaj datę w strefie Europe/Warsaw, sprawdź realne wydarzenia, przygotuj plan zmian oraz pełną treść wiadomości do uczestników. Najpierw zwróć kartę do zatwierdzenia. Nie zmieniaj kalendarza i nie wysyłaj maila bez jednoznacznego potwierdzenia Piotra. Po potwierdzeniu wykonaj tylko zatwierdzony zakres i zwróć identyfikatory wyników.]';
 }
 if(edit)backendText+='\n\n[TRYB KOREKTY: ustal dokładnie, którego elementu dotyczy polecenie. Jeśli jest więcej niż jeden kandydat, poproś o wybór. Przygotuj poprawioną wersję do ponownej decyzji; nie zatwierdzaj, nie publikuj i nie wysyłaj samodzielnie.]';
 if(clientAction&&clientAction.type==='weather-needs-place')backendText+='\n\n[POGODA NA WEEKEND: brakuje miejscowości. Zadaj dokładnie jedno krótkie pytanie: „Gdzie mam sprawdzić pogodę na weekend?”. Nie uruchamiaj lokalizacji urządzenia i nie zgaduj miejsca.]';
 return {backendText,view:route&&route.view,clientAction};
}
window.DonaPanelActions={prepare,navigate};
})();
