# DONA Workspace — pilot właściciela

Nowy panel działa w `pilot/` w tym samym repozytorium i pod tym samym pochodzeniem GitHub Pages co obecny panel. Główny `index.html` pozostaje punktem powrotu. Nie dodano frameworka ani procesu budowania.

## Zakres

- Widoki Dzisiaj, Poczta, Do zatwierdzenia, Zapytania, Oferty, Klienci, Kalendarz, Pliki, Receptury, YouTube, Dysk Google, Pogoda, Mapy oraz wizualny katalog stron i realizacji.
- Odczyt rzeczywistych rejestrów n8n, wyszukiwanie, filtrowanie i szczegóły.
- Istniejąca rozmowa, historia, pliki, notatki, dyktowanie, głos i bezpośrednie gałęzie agentów.
- Tryb webinarowy z widocznym stanem żądania oraz trzema bezpiecznymi scenariuszami startowymi. Oczekiwana gałąź jest oznaczona jako niepotwierdzona; po wyniku panel pokazuje wyłącznie potwierdzone nazwy użytych narzędzi/agentów, bez treści prywatnych i bez rozumowania modelu.
- Oddzielny podgląd `?demo=1` ma jawnie przykładowe dane i blokuje wywołania operacyjne.
- Szczegóły kierują do rozmowy przez przygotowanie wiadomości; wysłanie wymaga przycisku użytkownika. Materiały do decyzji mają także opcję „Edytuj”, która zwraca poprawioną wersję do ponownego zatwierdzenia.
- Zgody można przeglądać, omawiać, zatwierdzać i odrzucać. Karty zmian Zoho pokazują dokładny zakres operacji; usunięcie wymaga dodatkowego zaznaczenia pola i wpisania `ANULUJ`.

## Backend

Workflow `DONA Panel — Workspace API (pilot)`, ID `QdyWx6Gudc4S00m7`, projekt PM Command Center. POST `/webhook/dona-workspace`, body `{operation:"snapshot",haslo:"<hasło obecnego panelu>"}`.

Hasło pochodzi z istniejącego magazynu serwerowego; nie jest zapisane w kodzie. To pilot jednego właściciela: serwer przypisuje firmę PM. Pola tożsamości przesłane przez klienta są odrzucane. To nie jest jeszcze uwierzytelnianie wielu firm. Historia rozmów jest synchronizowana przez osobny endpoint i przekazuje dokładny identyfikator wątku do głównej DONY.

Endpoint jest tylko do odczytu. Każdy odczyt ma filtr firmy, następnie wynik jest ponownie filtrowany i ograniczany do jawnej listy pól. Odpowiedź nie zawiera danych uwierzytelniających ani pełnych rekordów. Puste tabele zwracają puste kolekcje. Maksymalnie 250 najnowszych rekordów na kolekcję; ograniczenie jest sygnalizowane w `meta.truncated` i w panelu. Liczby na pulpicie opisują rekordy w widoku, nie całość firmy. Kalendarz i pliki pokazują rejestry DONY, nie pełną zawartość Google Calendar lub Drive.

Decyzje zapisuje osobny workflow `DONA Panel — decyzje i pamięć`, ID `mILGt8TyRMEf6NZg`, przez POST `/webhook/dona-panel-actions`. Akcje Zoho trafiają po zatwierdzeniu do kolejki wykonawcy `jDW2QM45nGgA8vuw`. Zatwierdzenie wymaga zgodności typu akcji, wersji, skrótu payloadu, terminu ważności, właściciela i źródła decyzji. Edycja i usunięcie wymagają ponownego odczytu aktualnego `etag` przed zapisem.

Zapisywanie danych wykonań workflow jest wyłączone dla sukcesów, błędów i testów ręcznych. Odpowiedzi mają `Cache-Control: no-store`. CORS dopuszcza obecne pochodzenie GitHub Pages. Przy włączonym „Zapamiętaj mnie na tym urządzeniu” hasło jest przechowywane w lokalnym magazynie tej przeglądarki; wylogowanie je usuwa.

## Utrzymanie

- Edytuj `backend/workspace-auth.js` i `backend/workspace-snapshot.js`.
- Wygeneruj definicję n8n: `python3 scripts/build-workspace.py`.
- Uruchom testy: `node --test tests/*.test.cjs`.
- Sprawdź składnię frontendu: `node --check pilot/chat.js`, `node --check pilot/features.js`, `node --check pilot/panel-actions.js` i `node --check pilot/workspace.js`.
- Definicję n8n należy zwalidować przed aktualizacją. Nie twórz drugiego workflow na tej samej ścieżce webhooka.
- Wycofanie pilota: usuń udostępnienie ścieżki `pilot/` i zdezaktywuj nowy workflow. Obecny panel nie zależy od niego.

## Kolejny etap po testach właściciela

Oddzielne konta, sesje i przestrzenie firmowe, kontrola uprawnień po stronie serwera dla każdej operacji, izolowana historia, pełny obieg decyzji w interfejsie, paginacja, monitoring i pomiar kosztów. Dopiero dalej onboarding klientów i rozliczenia SaaS.

## Weryfikacja 7 września 2026

Siedem testów automatycznych przeszło: hasło, odrzucanie tożsamości z przeglądarki, puste tabele, izolacja danych, dozwolone pola, bezpieczne linki/kwoty, ograniczenie list i nietypowy podgląd zgody. Test na działającym n8n potwierdził snapshot HTTP 200, błędne hasło 401, obcą firmę 403, CORS i strukturę kolekcji. Tymczasowy endpoint kontrolny wyłączono i usunięto.

W opublikowanej wersji przeglądarkowej sprawdzono pulpit demo, szczegóły zgody, przygotowanie wiadomości bez automatycznego wysyłania, blokadę wykonywania działań w demo, nawigację, wyszukiwanie i łączenie go z filtrem statusu. Funkcje mikrofonu, rozmowy na żywo, faktyczny zapis notatki i wysłanie pliku wymagają testu właściciela; podczas weryfikacji nie wykonywano tych działań.

## DONA Live 4.1

Ekran rozmowy ma odrębny ciemny interfejs, animowaną świetlną formę, napisy, czas połączenia oraz przyciski mikrofonu i zakończenia. Górny pasek panelu zawiera jawne wejścia „Czat z DONĄ” i „Rozmawiaj na żywo”.

`voice-audio.js` analizuje już istniejące strumienie mikrofonu i odpowiedzi, bez nowego żądania dostępu do mikrofonu, bez dodatkowej transmisji i bez połączenia z wyjściem głośnikowym. Warstwa rozmowy nadal odpowiada za zatrzymanie swoich ścieżek; warstwa wizualna zwalnia analizatory i AudioContext. Animacja działa maksymalnie około 30 klatek/s, zatrzymuje się w ukrytej karcie i respektuje ograniczenie ruchu w systemie. Referencje: [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode), [createMediaStreamSource](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamSource).

Podgląd `?demo=1&voice=1` nie uruchamia mikrofonu, sesji Realtime ani zleceń. Ma oznaczone przykładowe stany słuchania, myślenia i odpowiedzi. Testy `node --test tests/voice-audio.test.cjs` sprawdzają ciszę, ograniczenie amplitudy, wyciszenie/koniec ścieżki, wymianę strumienia, brak dodatkowego odsłuchu i zwalnianie zasobów. Rzeczywista reakcja na mikrofon wymaga sprawdzenia na urządzeniu właściciela.
