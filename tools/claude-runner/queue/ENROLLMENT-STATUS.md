# Parowanie Maca — 15.09.2026

Ten zapis aktualizuje wcześniejszy GATEWAY-STATUS.md.

Użytkownik lokalnie utworzył klucz. Otrzymaliśmy wyłącznie jego SHA-256.
Workflow 2RxFcOexRfx3w2MH w PM Command Center (katalog główny) zarejestrował
skrót i utworzył trwałe tabele pilota. Manual execution 68430: success.
Workflow rejestracji pozostaje nieaktywny i nie uruchamia się sam.

Zakres: runner mac-dona-pilot, task pilot_mac_connection_20260915,
contextHash zapisany w connection-binding.json. Ważność do
2026-09-16T16:48:50.203Z. Zadanie jest technicznym testem odczytu;
nie należy kierować go do agentów. Używa istniejącego walidatora typu zadania,
ale treść wyraźnie zabrania uruchamiania modeli i edycji.
Rejestracja nie przedłuża istniejącego klucza ani nie zmienia jego zakresu.

Brama Z2RRu3ze01yQyqc5 aktywowana, wersja
8015f8ae-7d27-47ef-aa69-e7aae4dec6ae. Endpoint:
https://pmresearch.app.n8n.cloud/webhook/dona-router-pilot
Zapisy danych executions: none dla success/error; manual/progress false.
To endpoint pilota, nie przełączenie produkcyjnego routera Dony.

Sprawdzono rzeczywisty HTTP POST bez klucza: 401 AUTH_FAILED.
Test manualny 68431 nie zostawił danych wykonania zgodnie z ustawieniami;
nie wykorzystano go jako dowodu odpowiedzi. Dowodem odmowy jest HTTP.
Pierwsze wywołanie było wolne; limity czasu odnawiania przydziału nadal
wymagają pomiaru i dostrojenia przed uruchomieniem wykonawcy.

pilot-connection-check.mjs odczytuje lokalny klucz z kontrolą praw pliku,
sprawdza status i odczytuje przypisane zadanie. Nie wywołuje acquire, modeli,
publikacji ani instalatora usługi. Test autoryzowanego połączenia pozostaje
do wykonania na Macu, ponieważ sekret nie został przekazany asystentowi.

Rollback: zdezaktywować wyłącznie Z2RRu3ze01yQyqc5; unieważnić klucz
w dona_router_pilot_keys_v1. Nie usuwać tabel ani produkcyjnych workflowów.
Produkcja korzysta nadal z dotychczasowego runnera i kolejki.
