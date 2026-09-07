# DONA — własny adres

Docelowa domena: `dona.probatum.pl`.

## Zakres

Cała istniejąca witryna GitHub Pages z repozytorium `Piotrmadrzyk/dona-panel`:

- `/` — obecny panel rozmowy;
- `/pilot/` — nowy panel z widokami biznesowymi, czatem i rozmową głosową;
- pozostałe ścieżki oraz pliki pozostają pod tą samą domeną.

Nie jest to przeniesienie bazy danych ani workflowów. Backend pozostaje w n8n.

## Stan przygotowania — 7 września 2026

- DNS probatum.pl: `dns.home.pl`, `dns2.home.pl`, `dns3.home.pl`.
- `dona.probatum.pl` przed zmianą nie ma rekordu DNS (NXDOMAIN).
- Repozytorium: gałąź `main`; punkt wyjścia `df3fa84639d0f38978745ebe1228eca93d747353`.
- Zasoby panelu korzystają z względnych ścieżek. Adresy API są bezwzględne.
- Workspace API wymaga dopuszczenia nowego origin: `https://dona.probatum.pl`.
- Ten plik i CNAME przygotowują konfigurację. Nie stanowią dowodu aktywnego DNS ani HTTPS.

## Wdrożenie

1. Upewnij się, że masz dostęp do DNS w home.pl i ustawień GitHub Pages.
2. W aktywnym workflow `QdyWx6Gudc4S00m7` ustaw w `Workspace Request`:
   `allowedOrigins = https://piotrmadrzyk.github.io,https://dona.probatum.pl`.
   Zachowaj pozostałe parametry oraz kontrolę hasła.
3. Sprawdź faktyczne źródło publikacji GitHub Pages. W Settings → Pages ustaw
   Custom domain na `dona.probatum.pl` przed dodaniem rekordu DNS. Dla publikacji
   z gałęzi plik CNAME należy do katalogu źródłowego; dla GitHub Actions
   wymagane jest ustawienie domeny w Pages, ponieważ CNAME jest ignorowany.
4. W home.pl → Domeny → probatum.pl → Hosting DNS → Zarządzaj rekordami DNS
   dodaj tylko nowy rekord: typ `CNAME`, nazwa `dona`, wartość
   `piotrmadrzyk.github.io.`. Nie zmieniaj rekordów domeny głównej, WWW ani poczty.
5. Po pozytywnym sprawdzeniu DNS i wystawieniu certyfikatu włącz Enforce HTTPS.
6. Zweryfikuj HTTPS, oba panele, zasoby statyczne, CORS, logowanie, historię,
   czat i rozmowę głosową. Dopiero wtedy oznacz przeniesienie jako zakończone.

## Co zmieni się dla użytkownika

W pasku adresu pojawi się domena Probatum. Repozytorium pozostaje publiczne
na obecnym koncie GitHub, a rekord CNAME również wskazuje nazwę tego konta;
zmiana adresu panelu nie oznacza anonimowości właściciela.

Nowa domena ma oddzielny magazyn przeglądarki. Użytkownik ponownie wpisze hasło
panelu i zezwoli na mikrofon. Dane przechowywane na serwerze pozostają w n8n;
lokalne ustawienia starej domeny nie przenoszą się automatycznie.

## Źródła

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- https://pomoc.home.pl/baza-wiedzy/rekord-dla-domeny-jak-dodac-usunac-lub-zmienic-rekord-dla-subdomeny
