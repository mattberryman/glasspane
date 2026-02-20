// Apply saved theme/accent before first paint to prevent flash of unstyled content.
// Loaded as a synchronous (non-deferred) script so it runs before the browser
// renders any content. Covered by script-src 'self' — no inline hash needed.
(function () {
  var t = localStorage.getItem("gp-theme");
  var a = localStorage.getItem("gp-accent");
  if (t) document.documentElement.dataset.theme = t;
  if (a) document.documentElement.dataset.accent = a;
})();
