# Dona Claude Code Runner

Lokalny, pojedynczy wykonawca zadań technicznych przekazanych przez Donę. Korzysta z istniejącego logowania Claude Code na Macu i z oficjalnego trybu nieinteraktywnego `claude -p`.

## Zasady bezpieczeństwa

- Obsługuje wyłącznie aliasy projektów wpisane w `config.json`.
- Każda ścieżka projektu musi leżeć w jednym z `allowedRoots`.
- Uruchamia proces bez powłoki (`shell: false`), więc treść zadania nie staje się komendą systemową.
- Pozwala czytać i edytować kod, wykonywać ograniczoną listę poleceń Git oraz testów.
- Nie dostaje zgody na push, deploy, publikację, wysyłkę maili ani inne działania zewnętrzne.
- Sekret połączenia jest czytany z macOS Keychain, nie z pliku.
- Jedno zadanie ma lease, heartbeat i limit czasu. Wynik jest przyjmowany tylko dla aktualnego `lease_id`.

## Stan wdrożenia

Backend `dona-claude-runner` i kolejka PostgreSQL są przygotowane. Na Macu uruchom:

```bash
bash tools/claude-runner/install-macos.sh
```

Instalator sprawdza zależności, pyta o katalogi repozytoriów, zapisuje hasło panelu wyłącznie w Keychain i uruchamia proces przez LaunchAgent.

Runner wymaga Node.js 20+ i Claude Code 2.1.259+ ze względu na `--permission-prompts none`.
