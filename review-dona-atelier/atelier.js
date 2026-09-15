/* Review-only presentation. No provider discovery, secrets, or new network calls. */
(() => {
  'use strict';
  const root = document.getElementById('viewContent');
  const enhance = () => {
    const hero = root.querySelector('.biz-hero');
    if (hero && !hero.dataset.atelier) {
      hero.dataset.atelier = 'true';
      hero.querySelector('h2').textContent = 'Mniej na głowie. Więcej zrobione.';
      hero.querySelector('p').textContent = 'Powiedz, czego potrzebujesz. Tutaj wrócisz po wynik.';
      hero.querySelector('.biz-talk').innerHTML = 'Porozmawiajmy <span aria-hidden="true">↗</span>';
    }
  };
  const engine = document.createElement('details');
  engine.className = 'atelier-engine';
  engine.innerHTML = `<summary><strong>Wykonawca</strong><span>Dona · obecne połączenie</span></summary>
    <fieldset><legend>Kto zajmie się zadaniem?</legend>
    <label><input type="radio" name="dona-executor" value="current" checked><span>Dona<small>Obecne połączenie. W podglądzie nie wysyłamy zadań.</small></span></label>
    <label><input type="radio" name="dona-executor" value="auto" disabled><span>Automatycznie<small>W przygotowaniu. Dobór według zadania i dostępności.</small></span></label>
    <label><input type="radio" name="dona-executor" value="codex" disabled><span>Codex na komputerze<small>Niepołączony. Wymaga uruchomienia lokalnego wykonawcy.</small></span></label>
    <label><input type="radio" name="dona-executor" value="claude" disabled><span>Claude Code na komputerze<small>Niepołączony. Wymaga uruchomienia lokalnego wykonawcy.</small></span></label></fieldset>
    <p>Wybór będzie dotyczył zadań tekstowych. Rozmowa na żywo korzysta z osobnego połączenia głosowego.</p>
    <a href="#connections">Sprawdź połączenia</a>`;
  document.querySelector('.assistant-chat .phead').after(engine);
  new MutationObserver(enhance).observe(root,{childList:true});
  enhance();
})();
