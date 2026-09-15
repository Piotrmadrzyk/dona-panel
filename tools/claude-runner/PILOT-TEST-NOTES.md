# Uzupełnienie pilota — 15.09.2026

## Potwierdzone testami

Polecenie:

```bash
node --test tests/model-router.test.mjs tests/pilot-workspace.test.mjs tests/pilot-process.test.mjs
```

26 testów zakończonych poprawnie. Osiem nowych testów uruchamia lokalny Node,
nie Claude ani Codex: stdin bez shell, ograniczone środowisko, kod wyjścia,
timeout, AbortSignal, limit stdout/stderr, brak programu, zakończenie zwykłego
procesu potomnego po wyjściu rodzica oraz anulowanie przed startem.

`pilot-process.mjs` pozostaje oddzielnym modułem. Nie jest podłączony do produkcji
ani do adaptera hosta. AbortSignal trzeba powiązać z rzeczywistą utratą lease.
Kontrola grupy procesów POSIX nie zatrzymuje potomków, które samodzielnie odłączą
się do nowej sesji. Izolacja systemowa hosta jest nadal warunkiem uruchomienia.
Sukces procesu nie oznacza sukcesu zadania: wymagany jest parser wyniku CLI,
kontrola zakresu plików i niezależna weryfikacja. Parser oraz pełny adapter nie
są jeszcze gotowe. Nie przeprowadzono testów rozliczeń ani logowania CLI.

## Nagranie od Piotra

Przejrzane klatki przekazanego nagrania pokazują jeden interfejs ATNEL/Kreion,
ekran autoryzacji Claude Code do konta Claude, komunikat zalogowania Codex,
zmianę wykonawcy w rozmowie i pracę z obrazem. Jest to dowód prezentowanego UX,
nie implementacji backendu, automatycznego routingu, pełnej zgodności regulaminowej
ani rozliczania każdej operacji. Nie wykonano transkrypcji audio.

Dla Dony pozostaje cel: jeden kontekst projektu oraz automatyczny wybór wykonawcy.
Pilot obejmuje jedynie niewielkie zadania programistyczne, bez publikacji.

## Wieczorny test

Najpierw diagnostyka z katalogu gałęzi pilota:

```bash
node tools/claude-runner/pilot-preflight.mjs
```

Następnie trzeba potwierdzić logowanie oficjalnych CLI, izolację konta, config/MCP
i brak płatnych nadpisań. Dopiero wtedy podłączyć adapter i wykonać jedną małą
poprawkę z osobnym podglądem. Nie używać instalatora produkcyjnego runnera.

Przed próbą Codex trzeba również sprawdzić obsługę migawki bez katalogu `.git`
w zainstalowanej wersji CLI; obecna specyfikacja wywołania nie rozstrzyga tego.
Produkcja pozostaje niezmieniona. Kod znajduje się na gałęzi pilota w PR #15.
