// Applies the saved appearance (auto / light / dark) before the page paints.
// Loaded as a blocking script in <head> so there's no flash of the wrong theme.
(function () {
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function pref() {
    try {
      return localStorage.getItem('top10-theme') || 'auto';
    } catch (e) {
      return 'auto';
    }
  }
  function apply() {
    var p = pref();
    var dark = p === 'dark' || (p === 'auto' && media.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  window.top10Theme = {
    get: pref,
    set: function (p) {
      try {
        localStorage.setItem('top10-theme', p);
      } catch (e) {}
      apply();
    },
  };
  if (media.addEventListener) media.addEventListener('change', apply);
  apply();
})();
