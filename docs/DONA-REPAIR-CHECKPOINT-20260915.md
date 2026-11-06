# DONA — checkpoint napraw 15.09.2026

## Decyzja wyglądu
Piotr zaakceptował makietę grafit / koral / dona. z listą spraw i rozmową pod ręką. Odrzucony wariant zielony pozostaje tylko wcześniejszym podglądem. Nowy projekt nie jest jeszcze wdrożony. Najnowsza dyspozycja: funkcjonalność ma pierwszeństwo przed wyglądem.

## Zrobione w pilocie
Parser odpowiedzi Claude JSON i Codex JSONL: wykrywa niekompletne wyniki, błędy providerów, timeout i anulowanie. Nie interpretuje dowolnej wypowiedzi modelu jako polecenia fallbacku. Nie przedstawia szacunkowego kosztu Claude jako faktycznego rachunku. Codex ma jawne opcje pracy z migawką bez .git i ignorowania konfiguracji użytkownika. Host nadal musi zapewniać izolację.
38 testów przeszło: router i parser testowane na fixture, procesy przez lokalny Node, snapshoty przez Git. Nie wykonano rzeczywistych zadań CLI ani nowych płatnych testów.
Parser jest modułem do podłączenia, nie działającą produkcyjną usługą. Adapter hosta i połączenie z panelem nadal wymagają dokończenia.

## Odczyt n8n
Archiwista WRo95VQNwbb3Ww6f: 66822 (harmonogram 15.09 02:00 UTC), 67009 i 66361 mają success. Nie weryfikowano w tej turze treści kopii ani odtwarzania.
Rolki krcO4JxDOe7bBlgg: 67144 miał błąd literalnego \\n w kodzie Waliduj wejscie. W bieżącej aktywnej wersji 439a914c-8457-43e2-99ea-2f3b560cd78c pierwszy podział linii jest już poprawny; późniejsze wykonanie 67146 ma success. Nie jest to dowód renderu MP4.
Zlecenia rolek 2x8JIYNHGu43seJc: 67118 to test z za krótkim tekstem narracji, odrzucony BRIEF_INCOMPLETE; nie stanowi sam w sobie awarii zwykłego zlecenia.
Zanfia TG2L7ZlaNFcP0vB5: wykonanie 67186 otrzymało HTTP403, API access is disabled for this workspace. Aktualna aktywna wersja b448964e-bec2-4201-adef-0f10df5a32e8 obsługuje błąd i zwraca konkretny blocker. Nie wykonano nowego testu stanu uprawnienia. Wymaga potwierdzenia aktywacji API u dostawcy, bez kupowania nowego narzędzia.
Runner EZGJIPd70YVOp9ER: odczyt zwrócił jedno wykonanie 67060, manual, success. Nie potwierdza to pracującego procesu na Macu.

## Źródła protokołu
https://code.claude.com/docs/en/headless
https://learn.chatgpt.com/docs/non-interactive-mode

## Następne prace
Połączyć proces, parser i istniejący mechanizm lease w adapter hosta, sprawdzić logowanie i izolację na komputerze, wykonać jedno rzeczywiste zadanie z niezależną kontrolą wyniku. Zweryfikować scenariusze użytkowe poczty, publikacji i rolki zamiast samych zielonych wykonań. Przenieść zaakceptowaną makietę do panelu bez duplikowania jego modułów.
