# DONA — panel firmy, 14.09.2026

Właściciel zatwierdził przebudowę i wdrożenie panelu. Główne wejście prowadzi do `/pilot/#today`; wcześniejszy widok rozmowy zachowano w `/legacy.html`.

## Zmiana

Pulpit zbiera zlecenia, wyniki i decyzje. Osobne widoki: publikacje Facebook, rolki i materiały, kampanie, sprzedaż. Pozostałe narzędzia są dostępne w grupach menu. Formularze przekazują polecenia do dotychczasowego, uwierzytelnionego `/dona-panel-branch`. Wybrana marka ustawia również kontekst rozmowy.

Backend Workspace czyta prywatną kolejkę PostgreSQL `pm_os.dona_work_jobs_v1`. Pokazuje wyłącznie dozwolone pola właściciela, bez tokenów workerów i rekordów testowych. Gotowy link do rolki wymaga rzeczywistego pliku zapisanego na Drive. Błąd odczytu kolejki ma osobny komunikat.

Przycisk „Publikuj teraz” jest poleceniem właściciela dotyczącym wyświetlonego tekstu i zdjęcia. API ponownie wylicza hash i przekazuje `publish_now` do istniejącego wykonawcy. Wykonawca sprawdza profil, źródło i brak wcześniejszej wysyłki; kolejność listy nie blokuje publikacji. `BUFFER_ACCEPTED` jest odrębne od `PUBLISHED`.

## Weryfikacja

- 63 testy backendu i nawigacji: PASS. Sprawdzono m.in. zgodność wersji posta, ochronę przed powtórną wysyłką, zakres właściciela, ukrycie testów oraz rozróżnienie przyjęcia i publikacji.
- Żywy odczyt `/dona-workspace`, wykonanie 66317: 16 postów, nowe szkice 66204/66216, odczyt kolejki poprawny, testowe materiały niewidoczne.
- Żywa rozmowa przez `/dona-panel-branch`, wykonanie 66334: poprawny odczyt zakończonego zadania; brak rzeczywistego MP4 jest zgłoszony wprost. Poprawiono rozróżnienie błędu odczytu od poprawnego odczytu nieudanego zadania.
- Podgląd `/review-20260914/?demo=1`: sprawdzone formularze, wybór drugiego posta, wyszukiwanie zleceń, sprzedaż, kampanie i zachowany widok stron. Tryb demonstracyjny nie zleca produkcji ani nie publikuje.
- Formularze korzystają z istniejącej drogi Panel Apex → Dyspozytor → właściwa gałąź. Właściciel i tenant są ustalane w backendzie.
- Ocena wizualna wykonana w dostępnej przeglądarce desktopowej. Układ telefonu ma osobną nawigację i reguły responsywne; nie deklarujemy testu na fizycznym telefonie.

## Rzeczywiste ograniczenia

- Ostatnia rzeczywista próba Creatomate 66154/66155: HTTP402, brak kredytów. Nie powstała nowa rolka Probatum. Test zapisu syntetycznego MP4 nie jest pełnym testem produkcji.
- W Buffer potwierdzono tylko Edward Janusz i Silver & Glass. Probatum wymaga podłączenia własnego kanału.
- Status kampanii to jej rejestr. Nie potwierdzono działającego uruchamiania płatnych Meta Ads.
- Academy/Zanfia czeka na płatności; ten etap nie zmienia sprzedaży Akademii.
- Starsze generatory SDK nie opisują wszystkich zmian dokonanych wcześniej bezpośrednio w n8n. Przed ich użyciem porównaj aktualny graf; nie zastępuj nim produkcji w ciemno.

## Cofnięcie

Historia Git zachowuje poprzednie pliki frontendu. Backend sprzed zmiany: Workspace `1387fc05-4977-439c-9940-50dd86a4e56c`, akcje `805773c0-3519-4e20-b8b6-7bbfa3959e61`. Przy cofaniu kodu panelu sprawdź zgodność pól i operacji z opublikowanymi workflowami.
