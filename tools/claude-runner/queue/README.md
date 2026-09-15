# Kolejka pilota: stan 15.09.2026

## Potwierdzone

Oba CLI na Macu użytkownika przeszły rzeczywisty parser protokołu.
Claude wymagał USER/LOGNAME w ograniczonym środowisku. Poprawka korzysta
z os.userInfo(), nie z treści zadania. To nie dowód izolacji systemowej.

Aktualny odczyt n8n: istniejący Runner API EZGJIPd70YVOp9ER,
wersja aktywna 58ef23de-f859-4a73-83f7-38022db925a2, pobiera claim
ze wspólnej kolejki bez ograniczenia do projektu pilota. Nie zmieniono go.
Nie wolno użyć go jako bezpośredniego transportu nowego adaptera.

queries.mjs przygotowuje parametryzowane operacje na osobnych tabelach
pm_os.dona_router_pilot_jobs_v1 i dona_router_pilot_events_v1.
Nie wykonuje dowolnego SQL otrzymanego od klienta. Hash zadania jest liczony
po stronie backendu, a projekt ograniczony do dona-panel.
Zapis wymaga konkretnego lease, wykonawcy, hasha i oczekiwanej rewizji.
Zmiana stanu oraz wpis audytu są jednym poleceniem SQL. Wygaśnięcie nie
uruchamia automatycznego ponowienia przez innego wykonawcę.

adapter.mjs realizuje acquire/owns/save/release dla runPilot.
Wymaga zaufanego, uwierzytelnionego transportu request. Nie jest nim stary
endpoint runnera. owns odnawia ważny przydział atomowo w bazie;
transport musi respektować AbortSignal i mieć własny limit czasu.
Po niepewnym zapisie adapter nie ogłasza sukcesu ani nie zwalnia zadania.

## Wykonane testy

Workflow QA: EEdT1Jgcp5mDRo2k, projekt PM Command Center, katalog główny.
Nieaktywny, wyłącznie Manual Trigger; brak webhooka/harmonogramu.
Execution 68400: success, 13 asercji PostgreSQL, rollback.
Sprawdzono konflikt hasha, drugi sekwencyjny claim, własność, obce odnowienie,
stary numer rewizji, przejścia do weryfikacji/wyniku, odmowę odnowienia
po zakończeniu, zwolnienie oraz liczbę wpisów audytu.
To nie test jednoczesnego claimu na dwóch połączeniach ani awarii sieci.
Transakcja wycofała również testowe tworzenie tabel. Tabele nie zostały
jeszcze wdrożone trwale. Workflow QA pozostaje do powtarzalnej weryfikacji.

5 testów Node adaptera/walidacji przeszło. Transport w nich jest atrapą.
Nie stanowią dowodu integracji Mac → n8n.

## Następny krok i granice

1. Uwierzytelniona brama pilota: osobny odwoływalny klucz, ograniczony
   do konkretnego wykonawcy/projektu; brak dostępu do bootstrap/enqueue
   z uprawnień workera. Nie wysyłać hasła panelu do modelu.
2. Trwałe utworzenie tabel i podłączenie bramy do zweryfikowanych zapytań.
3. Timeouty transportu, kontrolowane odnawianie, testy równoległości
   na dwóch połączeniach, odwołanie klucza i utrata połączenia.
4. Izolacja procesów na Macu, niezależny weryfikator i trwałe artefakty.
   Nie wstawiać true do preflight na podstawie testów protokołu.
5. Jedno zadanie z panelu do wykonawcy i wynik do przeglądu, bez publikacji.

RLS i odebranie praw PUBLIC/anon/authenticated są przygotowane w bootstrap.
Istniejące poświadczenie bazy jest nadal szerokie i pozostaje w n8n.
Nie powstaje nowa usługa ani abonament. Nie wdrożono UI wyników kolejki.

Rollback: produkcyjny runner/router nie został przełączony. Workflow QA
nie działa samodzielnie, a test wycofał dane. Kod istnieje na gałęzi pilota.

Źródła: https://supabase.com/docs/guides/database/postgres/row-level-security
oraz https://supabase.com/changelog (sprawdzone 15.09.2026).
