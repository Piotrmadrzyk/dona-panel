// This review page always uses existing demo guards; never starts an authenticated session.
(() => {
  const url = new URL(location.href);
  url.searchParams.set('demo', '1');
  history.replaceState(null, '', url);
})();
