# Brama pilota — 15.09.2026

Workflow Z2RRu3ze01yQyqc5 utworzony w PM Command Center, katalog główny.
Siedem węzłów, nieaktywny, żadnego klucza użytkownika jeszcze nie zarejestrowano.
Ścieżka planowana: POST /webhook/dona-router-pilot. Nie jest jeszcze dostępna.
Nie włączać przed trwałą inicjalizacją tabel, zapisaniem skrótu klucza
i testem pełnego przepływu HTTP. Nie podłączono Maca ani panelu.

gateway.mjs: token jest hashowany, scope wiąże jeden task/contextHash/runner.
Brak administracyjnego enqueue/bootstrap z klucza wykonawcy.
Każda operacja bazy ponownie sprawdza cofnięcie i wygaśnięcie uprawnienia.
Brama nie zapisuje danych executions (success/error/manual/progress); ustawienia
nałożone po utworzeniu przez setWorkflowSettings. Przy odtwarzaniu z pliku
gateway.workflow.ts trzeba ponownie nałożyć te ustawienia PRZED aktywacją.

transport.mjs: HTTPS, weryfikacja certyfikatu, brak przekierowań, stały endpoint
z konfiguracji operatora, timeout całej operacji, AbortSignal, limit rozmiaru,
brak automatycznych ponowień niepewnych zapisów. Parametry hostname/port/ca
są wyłącznie zaufaną konfiguracją hosta (testy używają lokalnego TLS).

Weryfikacja: 17 testów Node kolejki/bramy/HTTPS przeszło. Test HTTPS używa
prawdziwego lokalnego serwera TLS i jednorazowego certyfikatu OpenSSL.
QA PostgreSQL workflow EEdT1Jgcp5mDRo2k, execution 68419: success,
18 asercji, rollback. W tym aktywny klucz, cofnięcie między autoryzacją
a wykonaniem zapytania, klucz cofnięty i wygasły. To nie test samego webhooka.

pilot-pairing.mjs tworzy na Macu losowy klucz w prywatnym katalogu użytkownika
z prawami 0700, plik 0600. Nie drukuje klucza; drukuje SHA-256 i runnerId.
Odmawia użycia symlinków, hardlinków i plików o niepoprawnych prawach.
Nie uruchamia modeli, nie kontaktuje się z siecią i nie zmienia logowania CLI.
To przygotowanie do ręcznego przypisania skrótu do jednego zadania pilota.

Pozostaje: trwałe tabele, rejestracja skrótu, test webhooka, izolacja procesu
na Macu, niezależny QA i artefakty, dopiero potem połączenie całości z panelem.
Klucz lokalny musi być niedostępny dla procesu agenta. Sam plik 0600 nie
izoluje innych procesów uruchomionych z tym samym UID.

Nie zakupiono żadnej usługi i nie zmieniono produkcyjnej kolejki Dony.
