// Plausible analytics — separate per-page goals for retargeting
// Plausible domain config: добавляем оба пути одним доменом, разделяем кастомными событиями
// Domain in dashboard: community.leadup.guru
(function () {
  if (window.__plausibleInit) return;
  window.__plausibleInit = true;

  var s = document.createElement('script');
  s.defer = true;
  s.setAttribute('data-domain', 'community.leadup.guru');
  // outbound + file-downloads + tagged-events extensions
  s.src = 'https://plausible.io/js/script.outbound-links.tagged-events.js';
  document.head.appendChild(s);

  window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
})();

// UTM persistence — захват из URL, хранение в localStorage 30 дней,
// проброс в события Plausible и в Tribute checkout-URL'ы (см. pro-checkout.js).
(function () {
  var KEY = 'ns_utm_v1';
  var TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'yclid', 'fbclid'];

  function readStored() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.t) return null;
      if (Date.now() - parsed.t > TTL_MS) { localStorage.removeItem(KEY); return null; }
      return parsed.v || null;
    } catch (e) { return null; }
  }

  function captureFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var any = false;
    FIELDS.forEach(function (f) {
      var v = params.get(f);
      if (v) { found[f] = v; any = true; }
    });
    if (!any) return null;
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: found })); } catch (e) {}
    return found;
  }

  window.NS_UTM = captureFromUrl() || readStored() || null;
})();

(function () {
  function track(name, props) {
    if (typeof window.plausible === 'function') {
      window.plausible(name, props ? { props: props } : undefined);
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var name = el.getAttribute('data-event');
    var props = {};
    var page = el.getAttribute('data-event-page');
    if (page) props.page = page;
    var plan = el.getAttribute('data-event-plan');
    if (plan) props.plan = plan;
    if (window.NS_UTM) {
      Object.keys(window.NS_UTM).forEach(function (k) { props[k] = window.NS_UTM[k]; });
    }
    track(name, props);
  });
})();
