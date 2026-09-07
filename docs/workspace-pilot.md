# DONA Workspace — pilot właściciela

Nowy panel działa w `pilot/` w tym samym repozytorium i pod tym samym pochodzeniem GitHub Pages co obecny panel. Główny `index.html` pozostaje punktem powrotu. Nie dodano frameworka ani procesu budowania.

## Zakres

- Widoki Dzisiaj, Do zatwierdzenia, Zapytania, Oferty, Klienci, Kalendarz, Pliki.
- Odczyt rzeczywistych rejestrów n8n, wyszukiwanie, filtrowanie i szczegóły.
- Istniejąca rozmowa, historia, pliki, notatki, dyktowanie, głos i bezpośrednie gałęzie agentów.
- Oddzielny podgląd `?demo=1` ma jawnie przykładowe dane i blokuje wywołania operacyjne.
- Szczegóły kierują do rozmowy przez przygotowanie wiadomości; wysłanie wymaga przycisku użytkownika.
- Zgody można przeglądać i omawiać. Bezpośrednie zatwierdzanie z karty nie jest zaimplementowane; działa istniejący proces zgód DONY.

## Backend

Workflow `DONA Panel — Workspace API (pilot)`, ID `QdyWx6Gudc4S00m7`, projekt PM Command Center. POST `/webhook/dona-workspace`, body `{operation:"snapshot",haslo:"<hasło obecnego panelu>"}`.

Hasło pochodzi z istniejącego magazynu serwerowego; nie jest zapisane w kodzie. To pilot jednego właściciela: serwer przypisuje firmę PM. Pola tożsamości przesłane przez klienta są odrzucane. To nie jest jeszcze uwierzytelnianie wielu firm. Historia i rozmowa korzystają z dotychczasowej sesji panelu.

Endpoint jest tylko do odczytu. Każdy odczyt ma filtr firmy, następnie wynik jest ponownie filtrowany i ograniczany do jawnej listy pól. Odpowiedź nie zawiera danych uwierzytelniających ani pełnych rekordów. Puste tabele zwracają puste kolekcje. Maksymalnie 250 najnowszych rekordów na kolekcję; ograniczenie jest sygnalizowane w `meta.truncated` i w panelu. Liczby na pulpicie opisują rekordy w widoku, nie całość firmy. Kalendarz i pliki pokazują rejestry DONY, nie pełną zawartość Google Calendar lub Drive.

Zapisywanie danych wykonań workflow jest wyłączone dla sukcesów, błędów i testów ręcznych. Odpowiedzi mają `Cache-Control: no-store`. CORS dopuszcza obecne pochodzenie GitHub Pages. Hasło w przeglądarce jest utrzymywane w pamięci lub `sessionStorage` przy włączonym „Zapamiętaj w tej karcie”.

## Utrzymanie

- Edytuj `backend/workspace-auth.js` i `backend/workspace-snapshot.js`.
- Wygeneruj definicję n8n: `python3 scripts/build-workspace.py`.
- Uruchom testy: `node --test tests/workspace.test.cjs`.
- Sprawdź składnię frontendu: `node --check pilot/chat.js` i `node --check pilot/workspace.js`.
- Definicję n8n należy zwalidować przed aktualizacją. Nie twórz drugiego workflow na tej samej ścieżce webhooka.
- Wycofanie pilota: usuń udostępnienie ścieżki `pilot/` i zdezaktywuj nowy workflow. Obecny panel nie zależy od niego.

## Kolejny etap po testach właściciela

Oddzielne konta, sesje i przestrzenie firmowe, kontrola uprawnień po stronie serwera dla każdej operacji, izolowana historia, pełny obieg decyzji w interfejsie, paginacja, monitoring i pomiar kosztów. Dopiero dalej onboarding klientów i rozliczenia SaaS.
