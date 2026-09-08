# DONA — centrum pracy, 8 września 2026

Rozszerzenie istniejącego panelu: poranny brief z danych panelu, skrzynka decyzji, przestrzenie trzech marek, drugi mózg i pamięć projektowa, karty danych przy rozmowie, centrum wykrytych usterek, trwała historia i kalendarz.

## Wdrożone API

- Workspace: `QdyWx6Gudc4S00m7`, POST `dona-workspace`. Uwierzytelnienie właściciela bez zmiany. Nowe tabele odczytywane wyłącznie dla `tenant_id=PM`, limit 50 z sygnalizacją obcięcia; pola odpowiedzi są jawnie dozwolone. Globalne logi agentów nie są pobierane.
- Decyzje i pamięć: `mILGt8TyRMEf6NZg`, POST `dona-panel-actions`. Wymaga hasła panelu i Origin `https://dona.probatum.pl`; tożsamości przesłane przez klienta są odrzucane.
- Decyzja społecznościowa: pełny podgląd, zgodność skrótu tekstu, oryginalnego zdjęcia i strony; zapis warunkowy tylko z DRAFT. Żaden test nie zatwierdził ani nie opublikował rzeczywistego posta.
- Decyzje wiadomości: tylko pełne, obsługiwane ładunki, aktualna prośba i termin ważności. Zapis APPROVED nie jest wysyłką. Wykonanie wymaga dotychczasowego agenta oraz bramki zgód.
- Pamięć: zapis notatki z oznaczeniem marki i opcjonalnym źródłem. Link zapisany jako źródło nie jest automatycznie pobierany. Odczyt dokumentów/zdjęć i dyktowanie korzystają z istniejących funkcji czatu.
- Historia: `PM_panel_events`, tylko metadane decyzji i zapisów; oprócz tego widok pokazuje zapisane zdarzenia systemowe, wykonania zgód oraz wyniki publikacji. Nie przechowuje pełnych treści w technicznych logach.

## Zoho — przygotowane, czeka na połączenie

Workflow: https://pmresearch.app.n8n.cloud/workflow/qLjTnqtyXj1DKq5E

Stan: nieaktywny. Brak poświadczeń Zoho; nie wykonano odczytu z konta ani testu odświeżania tokenu.

1. W Zoho API Console utwórz aplikację Server-based. Homepage: `https://dona.probatum.pl`. Redirect URI skopiuj dokładnie z poświadczenia OAuth2 w n8n.
2. Utwórz Generic OAuth2 API credential `Zoho Calendar OAuth2` w n8n. Grant: Authorization Code; Authentication: Body. Authorization URL: `https://accounts.zoho.com/oauth/v2/auth`; Access Token URL: `https://accounts.zoho.com/oauth/v2/token`. Dla konta w europejskim centrum danych użyj odpowiednich adresów `.eu`. Ustal region z konta, nie z lokalizacji użytkownika.
3. Scope: `ZohoCalendar.calendar.READ,ZohoCalendar.event.READ`. Auth query parameters: `access_type=offline&prompt=consent`. Client ID i Client Secret wpisz bezpośrednio w poświadczeniu; połącz konto. Ten sam credential przypisz do Read Zoho Calendars oraz Read Zoho Events.
4. W Zoho Configuration ustaw właściwy `apiBase`. Puste `calendarIds` wybiera jeden kalendarz oznaczony przez Zoho jako domyślny. Można podać jawne UID kalendarzy z wyniku autoryzowanego odczytu.
5. Uruchom Connect and Test Zoho. Zweryfikuj daty, cykle, wydarzenia całodniowe i zapis `READ_OK`; sprawdź panel. Dopiero po potwierdzeniu włącz workflow.

Synchronizacja jest przygotowana co 15 minut, zakres od dzisiaj do 30 dni naprzód (API dopuszcza maksymalnie 31 dni). Wystąpienia cykliczne rozwija Zoho (`byinstance=true`), żądania stosują UTC, panel pokazuje Europe/Warsaw. Błędy i dane starsze niż 30 minut są sygnalizowane. Nie ma tworzenia, usuwania, zapraszania uczestników ani synchronizacji do Google.

Oficjalne źródła, sprawdzone 8.09.2026:
- https://www.zoho.com/calendar/help/api/get-calendar-list.html
- https://www.zoho.com/calendar/help/api/get-events-list.html
- https://www.zoho.com/calendar/help/api/oauth2-user-guide.html

Dokument OAuth Calendar opisuje Bearer i dodatkowo osobny prefiks `Zoho-oauthtoken` dla Zoho Mail. Przygotowano Generic OAuth2/Bearer dla Calendar zgodnie z opisem Calendar; ostateczne potwierdzenie wymaga autoryzowanego testu.

## Weryfikacja

39 testów lokalnych: snapshot, uwierzytelnienie, trwałe logowanie, audio, zakres marek, daty/cykle, decyzje i błąd odczytu Zoho.

Rzeczywista weryfikacja API `50448`: wszystkie 11 sprawdzeń true; snapshot 200, błędne hasło 401, obce konto 403, trzy zapisy rzeczywistych zasad marek 200, nieistniejący post 404, obca marka w pamięci 400. Wynik zawierał 4 wpisy drugiego mózgu, 30 pamięci projektowej, 50 maili, 14 szkiców, 3 wpisy historii. Wyniki w audycie zawierają tylko statusy/liczby, bez danych uwierzytelnienia i treści wiadomości.

Nie testowano fizycznego mikrofonu ani działania na rzeczywistym telefonie. Facebook pozostaje niepodłączony; workflow publikacji nie został aktywowany. Przestrzenie marek są filtrami i kontekstem rozmowy w koncie właściciela, nie oddzielnymi kontami klientów SaaS.
