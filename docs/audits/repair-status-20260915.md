# DONA — zweryfikowany stan i kolejność napraw, 15.09.2026

## Źródła i granice

Aktualny odczyt metadanych n8n, kod opublikowanych workflowów wskazanych niżej, sześć tabel rejestrów Canon/Zenit, repozytorium main i przeglądarka panelu w trybie demo. Liczby dotyczą workflowów, nie liczby samodzielnych agentów. Aktywność nie dowodzi sprawnego wykonania. Rejestry integracji są deklaracjami, nie testem API. Nie uruchomiono produkcyjnych publikacji, wysyłek ani agentów na Macu.

Pełna lista: workflow-inventory-20260915.json. Dona: 292 (205 aktywnych, 87 nieaktywnych); Canon: 45 (1 aktywny logger); Zenit: 57 (0 aktywnych); Nikon: 11 (1 aktywny logger). Dla Dony połączono dwa odczyty po 200 rekordów z przeciwnym sortowaniem i usunięto duplikaty: 292 unikalne ID, zgodnie z count.

## Korekta poprzedniego podsumowania

- Marketing ObpDDShSy1rw11KK ma już produkuj_rolke, sprawdz_zadania_rolek, przygotuj_posty_do_kolejki i renderuj_rolke_ze_zdjec_drive. Odczytano graf, nie tylko nazwy.
- Główna Dona vE77e9dXD2e93jBW ma instrukcje wykonawcze, wykorzystania istniejących abonamentów, decyzji właściciela, zlec_claude_code, sprawdz_claude_code i zanfia_odczyt. Nie dodawać tych reguł ponownie.
- Publikator j781hsS6dVKdWFxh jest aktywny; obecny prompt Dony uznaje jednoznaczne polecenie za zatwierdzenie wybranej wersji. Publikacji nie testowano w tym etapie.
- Archiwista WRo95VQNwbb3Ww6f: wykonania 67009, 66822 i 66361 mają status success; 66822 było harmonogramowe. Pełne odtworzenie pozostaje nieprzetestowane. Kod obejmuje workflowy, wskazane tabele i dona_work_jobs_v1; nie oznacza to backupu wszystkich nowych kolejek ani sekretów.

## Naprawione w main

1. Snapshot: odświeżenie wywołane w trakcie wcześniejszego odczytu jest kolejowane i wykonuje się po nim. Kilka żądań podczas tego samego odczytu łączy się w jeden kolejny odczyt. Unieważniony wynik po wylogowaniu nie przywraca danych.
2. Ręczna odpowiedź: formularz pozostaje otwarty podczas i po przekazaniu polecenia, dzięki czemu przy błędzie można skopiować tekst. Kolejne kliknięcie jest blokowane dla tej samej próby. Sukces rozmowy nie jest nazywany sukcesem zapisu szkicu. Wylogowanie czyści formularz. Nie jest to trwałe przechowywanie szkiców ani bezpośrednia wysyłka bez AI; te wymagania pozostają otwarte.
3. Mapy: usunięto nieobsługiwane optimize:true z Maps URLs i fałszywą obietnicę najkrótszej kolejności. Do 10 wizyt dzieli się na etapy po maks. 4 miejsca (3 waypointy i cel). Każdy kolejny etap zaczyna się na końcu poprzedniego. Użytkownik widzi komplet miejsc i wybiera link etapu. Zbyt długie URL-e, nadmiar miejsc i separator | nie powodują cichego pomijania celu.

Google Maps URLs zachowują kolejność wpisaną w URL, obsługują do 3 waypointów w przeglądarkach mobilnych, do 9 w innych obsługiwanych produktach; nie wszystkie produkty obsługują waypointy. Źródło sprawdzone 15.09: https://developers.google.com/maps/documentation/urls/get-started . Optymalizacja rzeczywistej kolejności pozostaje do wykonania osobnym, uzasadnionym rozwiązaniem; nie kupiono API.

## Weryfikacja

- 32 testy snapshotu, uprawnień, nawigacji, poczty i nowych przypadków odświeżania: PASS.
- 10 testów tras oraz dotychczasowej pogody: PASS.
- Opublikowany panel demo: otwarto pocztę, ręczną odpowiedź, wprowadzono tekst przykładowy i sprawdzono pozostanie formularza po niepotwierdzonym wyniku. Nie wysłano maila.
- Pogoda w tym panelu pobrała prognozę dla Rzeszowa; mapa i formularz tras były dostępne.
- Lokalny podgląd przeglądarka odrzuciła ERR_BLOCKED_BY_CLIENT; skorzystano z niezależnej kontroli opublikowanego panelu. Fizyczny telefon nie był testowany.

## Canon: co blokuje według odczytanych rejestrów

- GitHub: exists_not_shared; Vercel: not_found; Playwright runner: not_configured.
- Service Registry: DEPLOY_PREVIEW i DEPLOY_PRODUCTION mają puste workflow_id. Puste są też wskazania MEDIA_ASSET_CREATE, MARKETING_STRATEGY i LEAD_ROUTING. Sprawdzić właściciela i tryb każdej usługi przed kwalifikowaniem jako obowiązkowa.
- Modele CLAUDE_FRONTEND i OPENAI_GENERAL są zadeklarowane jako gateway_available. ASTRA_BUILDER i V0_PROTOTYPE są wyłączone/unbound. Nie potwierdzono połączeń realnym zadaniem.
- Ocena readiness ufa deklaracjom statusów. PASS nie może oznaczać sprawdzonego deployu lub API.

## Zenit: co blokuje według odczytanych rejestrów

- Wszystkie 10 pozycji integrations ma awaiting_share_to_zenit.
- Inventory deklaruje istniejące Drive, GitHub, Buffer, GA4, Creatomate, ElevenLabs i Runway, ale not_shared_to_zenit. Vercel, Meta Graph i Brevo oznaczono not_found.
- Siedem integracji oznaczono required_for_live, w tym Brevo i Meta. To za szeroki warunek dla pilota przygotowania materiału: nie należy kupować usług tylko po to, żeby cała tabela miała ready. Zdefiniować wymagania dla konkretnej zdolności.
- Readiness jest agregacją rejestrów, nie testem połączeń. Nie nadawano dostępu i nie aktywowano projektów w tym etapie.

## Kolejność dalszego wykonania

### P0 — wynik z polecenia

- Zweryfikować na konkretnych zadaniach już podłączone narzędzia Dony. Oddzielić sukces odpowiedzi agenta od potwierdzenia wykonawcy.
- Domknąć jedno zadanie Codex na kopii strony: ograniczone uruchomienie, odbiór z kolejki, zmiana, niezależna weryfikacja, podgląd w panelu. Obecny blocker: izolowany login Codexa nieczytelny; przygotowany test wyświetla zredagowany błąd. Claude również nie widzi logowania w izolacji. Nie otwierać całego HOME/Keychain ani nie kopiować tokenów jako obejścia.
- Zastąpić polecenia tekstowe przy prostych akcjach poczty deterministycznymi endpointami, z zachowaniem uprawnień i dokładnego message_id. Utrzymać 10 najnowszych wiadomości z potwierdzonego odczytu skrzynek. Bez automatycznych powtórek niepewnej wysyłki.

### P1 — niezawodność i głos

- Zweryfikować komplet backupu dla nowych kolejek i wspólnej pamięci; wykonać odtworzenie do oddzielnego środowiska, nie na produkcję.
- Audyt głosu: timeouty, przerwanie, długie wywołania narzędzi, historia, zapis ustaleń. Nie zmieniać modelu bez pomiaru źródła opóźnienia.
- Sprawdzić faktyczne funkcje posiadanych planów Zoho i ograniczenie API Zanfii. Stan płatności Akademii zależy od fundacji.
- Sprawdzić strukturę pamięci projektowej, katalog narzędzi i uprawnienia per zadanie. Nie wdrażać nieograniczonego samonaprawiania.

### P2 — produkcja i sprzedaż

- Proste MP4 ze zdjęć przez istniejący host z FFmpeg/Remotion: najpierw sprawdzić dostępny host i istniejące wdrożenia, potem adapter; nie wracać automatycznie do zakupu kredytów Creatomate.
- Publikacja: potwierdzić rzeczywisty kanał Probatum; obecny publikator ma dwa zweryfikowane profile. Meta Ads i Messenger wymagają osobnej weryfikacji narzędzi, zgód i uprawnień.
- Canon: najpierw jeden sprawdzony podgląd strony, potem release. Zenit: najpierw jeden pakiet treści z dowodami i wynikiem w Donie. Nikon: workery i storage, finalizacja, heartbeat/fencing, odzyskiwanie kosztów i kontrola jakości wyniku. Nie włączać wszystkich workflowów zbiorczo.
- Kontynuować mobilny UX i zaakceptowany kierunek wizualny. Nie przebudowywać sprawnych modułów bez powodu.

## Cofnięcie zmian tego etapu

Przywrócić z historii Git poprzednie pilot/workspace.js i pilot/features.js oraz odpowiadające im wersje skryptów w pilot/index.html. Bazowe bloby: workspace 8409239db2b24ab132f9b9d71a5368f96111cf35; features bd96ed75c0dde87482afc7d53ff421311d53ae1d. Nie cofać całego repozytorium, gdy pojawiły się inne zmiany. W tym etapie nie zmieniono grafów produkcyjnego n8n ani danych biznesowych.
