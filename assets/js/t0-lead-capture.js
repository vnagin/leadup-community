// T0 PGVector lead-capture form (LEA-1299)
//
// Архитектура (CEO 2026-05-08, LEA-1299 comment 789eacd6):
//   <form> POST → n8n webhook (t0-pgvector-lead-capture)
//     → Supabase upsert (тег t0-pgvector-2026-06, idempotent email+source)
//     → Resend EU письмо с PDF-гайдом + ссылкой на пак
//   2xx → редирект на /free/pgvector/thanks/
//
// Webhook URL — единственный конфиг. До go-live n8n workflow держим в NS_CONFIG;
// при ошибке/недоступности форма даёт fallback на прямой вход в чат (лид не теряем).

(function () {
  window.NS_CONFIG = window.NS_CONFIG || {};
  // Production webhook (n8n.flowstudio.cloud, тот же инстанс, что quiz/lead-magnet workflow'ы).
  window.NS_CONFIG.t0Webhook =
    window.NS_CONFIG.t0Webhook || 'https://n8n.flowstudio.cloud/webhook/t0-pgvector-lead-capture';

  var THANKS_URL = '/free/pgvector/thanks/';
  var TG_FALLBACK = 'https://t.me/+a4YGH9rdoJRjMTE1';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function track(name, props) {
    if (typeof window.plausible === 'function') {
      window.plausible(name, props ? { props: props } : undefined);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('t0-form');
    if (!form) return;
    var nameEl = document.getElementById('t0-name');
    var emailEl = document.getElementById('t0-email');
    var consentEl = document.getElementById('t0-consent');
    var submitEl = document.getElementById('t0-submit');
    var statusEl = document.getElementById('t0-status');

    function setStatus(kind, html) {
      statusEl.className = 't0-status t0-status--' + kind;
      statusEl.innerHTML = html;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (nameEl.value || '').trim();
      var email = (emailEl.value || '').trim().toLowerCase();
      nameEl.setAttribute('aria-invalid', 'false');
      emailEl.setAttribute('aria-invalid', 'false');

      if (!name) {
        nameEl.setAttribute('aria-invalid', 'true');
        nameEl.focus();
        setStatus('error', 'Подскажите, как к вам обращаться.');
        return;
      }
      if (!EMAIL_RE.test(email)) {
        emailEl.setAttribute('aria-invalid', 'true');
        emailEl.focus();
        setStatus('error', 'Проверьте адрес почты — кажется, в нём опечатка.');
        return;
      }
      if (!consentEl.checked) {
        setStatus('error', 'Поставьте галочку согласия — без неё мы не можем прислать материалы.');
        return;
      }

      // UTM + источник из analytics.js (window.NS_UTM)
      var payload = {
        name: name,
        email: email,
        consent: true,
        tag: 't0-pgvector-2026-06',
        source: 'community.leadup.guru/free/pgvector',
        page_url: window.location.href,
        referrer: document.referrer || null,
        submitted_at: new Date().toISOString()
      };
      if (window.NS_UTM) {
        Object.keys(window.NS_UTM).forEach(function (k) { payload[k] = window.NS_UTM[k]; });
      }

      submitEl.disabled = true;
      var originalLabel = submitEl.textContent;
      submitEl.textContent = 'Отправляем…';
      setStatus('ok', 'Секунду…');

      var done = false;
      var timeout = setTimeout(function () {
        if (done) return;
        done = true;
        failGracefully();
      }, 12000);

      function failGracefully() {
        clearTimeout(timeout);
        submitEl.disabled = false;
        submitEl.textContent = originalLabel;
        track('t0_pgvector_submit_error', { page: 'free' });
        setStatus(
          'error',
          'Не получилось отправить прямо сейчас. Попробуйте ещё раз через минуту — ' +
          'или заходите в <a href="' + TG_FALLBACK + '" rel="noopener">чат Нейросборки</a>, ' +
          'гайд продублируем там.'
        );
      }

      fetch(window.NS_CONFIG.t0Webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          if (res.ok) {
            track('t0_pgvector_lead', { page: 'free', plan: 't0-pgvector' });
            window.location.href = THANKS_URL;
          } else {
            failGracefully();
          }
        })
        .catch(function () {
          if (done) return;
          done = true;
          failGracefully();
        });
    });
  });
})();
