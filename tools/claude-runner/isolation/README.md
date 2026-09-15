# Izolacja — test Maca, nie gotowy profil agenta

Połączenie Mac → brama potwierdzone przez użytkownika: authentication 2826 ms,
scoped_task_read 427 ms, passed true. Brak claimu i uruchomienia agenta.

Wybrano istniejący Anthropic Sandbox Runtime 0.0.76, Apache-2.0, Node >=20.11.
Wersję, wymagania i integralność potwierdzono w npm, zainstalowano lokalnie
bez skryptów lifecycle. package-lock.json przypina zależności przechodnie.
Repozytorium oficjalne: https://github.com/anthropics/sandbox-runtime
Dokumentacja: https://code.claude.com/docs/en/sandboxing

pilot-isolation-check.mjs tworzy wyłącznie sztuczne pliki testowe i lokalny
serwer TCP bez danych. Dopuszcza odczyt/zapis katalogu testowego, próbuje
odczytu i zapisu poza nim, odczytu przez symlink i proces potomny oraz
bezpośredniego połączenia z lokalnym portem. Nie otwiera klucza workera,
plików sesji CLI ani prywatnych dokumentów. Wymaga konkretnej odmowy
EPERM/EACCES; sam timeout sieci nie jest uznawany za dowód izolacji.

Wynik passed oznacza wyłącznie zaliczenie siedmiu sztucznych prób.
isolationVerified pozostaje false: nie dowodzi jeszcze poprawnej izolacji
Claude/Codexa z działającym logowaniem. Katalogi systemowe dopuszczone
do odczytu nie są kompletną, audytowaną polityką dla dowolnego hosta.
Program wykonawczy nie jest jeszcze uruchamiany przez ten profil.

Użycie:
```
npm ci --prefix tools/claude-runner/isolation --ignore-scripts --no-audit --no-fund
node tools/claude-runner/pilot-isolation-check.mjs
```

Własny system plików/migawka nie stanowi izolacji systemowej. Całe HOME
nie może być udostępnione agentowi tylko po to, by działało logowanie.
Po teście granic trzeba osobno rozwiązać minimalny dostęp do logowania,
sieć CLI i niedostępność klucza kolejki. Nie kopiować tokenów subskrypcji
do n8n ani promptów; nie osłabiać preflight. Nie wdrożono nowego SaaS.
