# Pilot routera Dony — stan implementacji

Zatwierdzony przez Piotra 15.09.2026. Rozszerza istniejący mechanizm zadań;
nie zastępuje produkcyjnego runner.mjs, panelu ani workflowów n8n.

## Gotowe w kodzie

- Kontrakt zadania ograniczony do małych zmian UI projektu dona-panel.
- Routing Claude → Codex wyłącznie dla gotowych wykonawców subskrypcyjnych.
- Kontrola wieku obserwacji, rezerwa 30% znanego limitu, nieznany limit opisany jawnie.
- Brak płatnego fallbacku w pierwszym etapie.
- Hash wiążący cel, projekt, commit, zakres plików i kryteria akceptacji.
- Checkpoint przed zmianą wykonawcy; zakaz fallbacku po odmowie uprawnień.
- Wynik READY_FOR_REVIEW wyłącznie po oddzielnej weryfikacji i referencjach artefaktu/testów.
- Przerwanie po utracie lease; zatrzymanie procesu przed weryfikacją i zwolnieniem lease.
- Migawka wybranych plików z konkretnego commitu bez współdzielenia .git,
  hooków, konfiguracji i remote. Kontrola symlinków, hardlinków, nowych i brakujących plików.
- Specyfikacje CLI z promptem przez stdin i minimalnym środowiskiem.

## Granice i warunki uruchomienia

**To przetestowany rdzeń pilota, nie uruchomiona usługa.** Host adapter jest jeszcze
do podłączenia po diagnostyce komputera. Nie wolno zastępować jego preflight
stałymi wartościami true z testów. Musi faktycznie zapewnić izolację konta/systemu,
zweryfikowane logowanie subskrypcyjne, kontrolę procesu, trwały zapis i niezależny test.

Migawka nie jest sandboxem systemowym. inspectSnapshot wolno uruchamiać dopiero po
zatrzymaniu całej grupy procesów; inaczej istnieje ryzyko zmiany plików podczas kontroli.
Codex workspace-write nie ogranicza wszystkich odczytów domu użytkownika. Wymaga
osobnego środowiska bez sekretów produkcyjnych i kontroli config/MCP. Claude używa
restricted + safe-mode, lecz ustawienia administracyjne hosta trzeba sprawdzić.
CLI powinien odmówić nieobsługiwanych opcji, nigdy usuwać ich po błędzie.

Oficjalne źródła sprawdzone 15.09.2026:
- https://code.claude.com/docs/en/cli-reference
- https://developers.openai.com/codex/non-interactive-mode

## Diagnostyka Maca bez uruchamiania zadań

Z katalogu tej gałęzi repozytorium:

```bash
node tools/claude-runner/pilot-preflight.mjs
```

Pokazuje wersje i nazwy obecnych zmiennych mogących wpływać na rozliczenia.
Nie pokazuje wartości, nie odczytuje tokenów i nie kontaktuje się z kolejką.
Nie potwierdza logowania ani limitów. Nie używać starego install-macos.sh do pilota:
instalator uruchamia obecnego runnera produkcyjnego.

## Testy

```bash
node --test tests/model-router.test.mjs tests/pilot-workspace.test.mjs
```

Testy routera używają atrap modeli/hosta. Testy workspace wykonują lokalne operacje Git
w tymczasowym repo bez sieci i sprawdzają naruszenia granic. To nie test abonamentu,
CLI ani jakości wygenerowanej poprawki.

## Następne kroki

1. Diagnostyka hosta, oficjalne logowanie każdego CLI, kontrola jego config/MCP.
2. Host adapter dla istniejącego mechanizmu lease, osobny credential i scope pilota.
3. Pojedyncza rzeczywista poprawka z podglądem, bez merge i publikacji.
4. Symulacja limitu i przejęcie przez drugi CLI; potem 10 małych zadań.

Rollback: produkcja pozostaje nienaruszona, bo nie importuje tego modułu. Przy
późniejszym podłączeniu flaga enabled=false zatrzymuje nowe zlecenia; uruchomione
procesy trzeba oddzielnie zatrzymać i unieważnić ich lease.
