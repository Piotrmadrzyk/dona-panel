const j=$input.first().json||{};
if(j.error){return [{json:{ok:false,answer:'Nie udało się ukończyć zadania. Wykonawca zgłosił błąd. Nie uruchamiaj ponownie publikacji ani płatnej operacji bez sprawdzenia jej stanu.',errorCode:'BRANCH_EXECUTION_FAILED'}}];}
const candidates=[j.output,j.raport,j.odpowiedz,j.podsumowanie,j.tekst,j.message,j.komunikat,j.blad,j.wynik&&j.wynik.raport,j.wynik&&j.wynik.output,j.wynik&&j.wynik.odpowiedz,j.wynik&&j.wynik.komunikat];
let answer=candidates.find(v=>typeof v==='string'&&v.trim());
if(!answer){ try{answer=JSON.stringify(j);}catch(e){answer='Brak czytelnego wyniku gałęzi.';} }
return [{json:{ok:!(j.status==='blad'||j.status==='nie_udalo_sie'||j.ok===false),answer:String(answer),raw:j}}];