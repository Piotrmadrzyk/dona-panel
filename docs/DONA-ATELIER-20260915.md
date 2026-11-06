# Dona — nowa przestrzeń i wybór wykonawcy

## Stan

Osobny podgląd: https://dona.probatum.pl/review-dona-atelier/
Kod pilota: branch pilot/dona-model-router-20260915, PR #15.
Dodano wyłącznie katalog podglądu do main. Nie podmieniono /pilot/index.html,
produkcyjnego czatu, runnera ani workflowów n8n.

Podgląd wykorzystuje istniejące moduły panelu oraz ich dane demonstracyjne.
Osobny bootstrap wymusza demo przed inicjalizacją. Dodatkowo connect-src 'none'
oraz form-action 'none' blokują połączenia wykonawcze i wysyłanie formularzy.
Zmiana CSS nie stanowi potwierdzenia działania integracji.

## Interfejs

Ciepłe jasne tło, głęboka zieleń, nagłówki szeryfowe, znak D inspirowany liściem,
lekki motyw organiczny bez pobierania fontów lub bibliotek animacji.
Zachowane moduły poczty, kalendarza, map, pogody, zleceń, publikacji i stron.
Wybór wykonawcy schowany w rozwijanym elemencie przy rozmowie.
Niepołączone wykonawce i automatyczny routing pozostają wyłączone w interfejsie;
nie sugerujemy aktywnego użycia subskrypcji. Głos opisany osobno.

## Router

Zadanie może podać executorPreference: auto, claude lub codex.
Preferencja jest walidowana i związana hashem kontekstu zadania.
Ręczny wybór zachowuje ograniczenia uprawnień, aktualności stanu i limitów.
Ręczne wskazanie jednego wykonawcy nie włącza cichego fallbacku do drugiego.
Dotyczy pilota małych zmian kodu, nie dowolnej rozmowy i zadań biznesowych.
Pełny adapter hosta, parsery wyników CLI i podłączenie panelu pozostają do wykonania.

## Weryfikacja

30 testów routera, snapshotów i procesu przeszło. Modele/host routera są atrapami;
testy procesów uruchamiają Node, a testy snapshotów lokalny Git.
W przeglądarce potwierdzono otwarcie podglądu, czatu, sekcji wykonawców oraz
formularza zlecenia strony. Kontrola wizualna ujawniła konflikt kierunku menu;
poprawiono układ skrótów i mobilnego nagłówka. Podgląd 390 px służy do kontroli
układu, nie zastępuje testu Safari na fizycznym iPhonie.

## Rollback

Nie przełączono głównego panelu. Można po prostu korzystać z /pilot/.
Podgląd nie zapisuje danych biznesowych. Usunięcie nowych plików podglądu jest
opcjonalnym sprzątaniem, nie warunkiem przywrócenia działania.
