# Kontrola logowania w ograniczeniu

Użytkownik potwierdził 7/7 syntetycznych prób izolacji na macOS 12.7.6.
Nie jest to jeszcze dowód izolacji rzeczywistego agenta.

pilot-isolated-auth-check.mjs używa zainstalowanego SRT 0.0.76. Dla każdego
CLI dopuszcza do odczytu jego plik wykonywalny, katalog testowy, dotychczasowe
katalogi systemowe i dokładne ścieżki plików logowania. Nie kopiuje ani
nie odczytuje tokenów w kodzie opakowującym. CLI wykonuje jedynie auth status
lub login status. Nie przyznaje zapisu w HOME ani odczytu całego katalogu
.claude/.codex, historii rozmów, katalogu Keychain lub klucza kolejki.

Przed poleceniem statusu sprawdza odmowę odczytu sztucznego pliku poza
workspace z identycznym profilem. Brak potwierdzenia blokuje dany test.
Sieć pozostaje zamknięta; nie ma żadnych promptów ani zadań modelu.
Raport ujawnia tylko statusy i kody, nie stdout/stderr CLI ani dane konta.

Jeżeli Claude potrzebuje Keychain/IPC lub dodatkowej konfiguracji, test może
zgłosić AUTH_NOT_VISIBLE/ACCESS_DENIED. Nie otwiera wtedy automatycznie nowych
uprawnień. Jeśli silnik jest zainstalowany w katalogu domowym z dodatkowymi
modułami, może zgłosić CLI_DEPENDENCY_BLOCKED. Należy rozstrzygnąć to osobno.
Nawet sukces nie uprawnia do ustawienia isolationVerified=true w wykonawcy:
widoczność loginu nie potwierdza sieci, odświeżania sesji ani zakresu narzędzi.

Składnię skryptu sprawdzono w środowisku roboczym. Nie wykonano testu
na Macu za użytkownika; rzeczywisty wynik pozostaje do otrzymania.
