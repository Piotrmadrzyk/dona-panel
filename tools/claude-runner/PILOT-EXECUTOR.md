# Stan adaptera wykonawczego

`pilot-executor.mjs` łączy rzeczywiste procesy POSIX (`pilot-process.mjs`),
parser protokołu (`pilot-result.mjs`) oraz cykliczną kontrolę przydziału.
Jego `execute` i `stop` odpowiadają kontraktowi hosta z `model-router.mjs`.
Nie został jeszcze podłączony do produkcyjnej kolejki ani panelu.

Domyślnie kontroluje przydział co 5 sekund, czeka na odpowiedź maksymalnie
3 sekundy i ogranicza próbę do 15 minut. Nie udaje natychmiastowego wykrywania
utraty przydziału. Awaria pętli zdarzeń hosta również ogranicza te gwarancje.
Funkcja owns musi wykonać rzeczywisty odczyt bieżącego, niewygasłego lease
i respektować AbortSignal. Nie może opierać się na samym worker_id ani
wyniku pierwszego claimu. Musi sprawdzać konkretny identyfikator przydziału.

Moduł sprawdza własność przed startem i po zakończeniu, zatrzymuje proces przy
błędzie lub przekroczeniu czasu odczytu własności. Odrzuca równoległe zadanie
i zatrzymanie przez obcy lease. stop czeka na zakończenie procesu; wyjątek
zatrzymania nie zwalnia miejsca na następną próbę.

Ścieżki wykonywalne i środowisko pochodzą z zaufanej konfiguracji hosta.
Specyfikację argumentów dostarcza router, nie treść zadania od użytkownika.
Katalog migawki musi pochodzić z prepareSnapshot. Ta warstwa nie zapewnia
samodzielnie izolacji systemowej ani logowania subskrypcyjnego.

## Weryfikacja

44 testy przeszły:

```bash
node --test tests/model-router.test.mjs tests/pilot-workspace.test.mjs tests/pilot-process.test.mjs tests/pilot-result.test.mjs tests/pilot-executor.test.mjs
```

Sześć nowych testów integruje proces Node, parser i kontrolę własności.
Odpowiedzi własności są atrapami, a tekst odpowiedzi providera jest fixture.
To nie test n8n, autoryzacji, jakości modelu lub faktycznego renderowania.

## Pozostaje

Trwały adapter kolejki z odczytem własności i odnawianiem lease, checkpoint,
zapis dowodów weryfikacji i podłączenie panelu. Nie podłączać bezpośrednio
starego endpointu runnera bez sprawdzenia jego zakresu dostępu do zadań.
Diagnoza komputera i oficjalne logowanie obu wykonawców wymagają dostępnego
hosta. Nie zastępować preflight deklaracjami true z testów.

W wyglądzie obowiązuje zaakceptowana makieta grafit/koral, nie zielony podgląd.
Zmiany wyglądu nie zostały wykonane w tym etapie napraw.
