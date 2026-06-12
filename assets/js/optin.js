// Opt-in form handler — community.leadup.guru
//
// Wires every <form data-optin> on the page to POST /api/subscribe.
// States: idle → submitting → success | error.
// Uses Plausible for events when available (loaded by analytics.js).

(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function track(name, props) {
    if (typeof window.plausible === 'function') {
      try { window.plausible(name, props ? { props: props } : undefined); } catch (e) {}
    }
  }

  function setStatus(form, state, headline, body) {
    var status = form.querySelector('[data-optin-status]');
    if (!status) return;
    status.setAttribute('data-state', state || '');
    status.innerHTML = '';
    if (!state) return;
    if (headline) {
      var h = document.createElement('strong');
      h.textContent = headline;
      status.appendChild(h);
    }
    if (body) {
      var p = document.createElement('span');
      p.textContent = body;
      status.appendChild(p);
    }
  }

  function setBusy(form, busy) {
    if (busy) form.setAttribute('data-busy', 'true');
    else form.removeAttribute('data-busy');
    var inputs = form.querySelectorAll('input, button');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].disabled = !!busy;
    }
  }

  function errorCopy(code) {
    switch (code) {
      case 'invalid_email':
        return ['Проверь email', 'Адрес не похож на правильный — например, иванов@почта.рф.'];
      case 'consent_required':
        return ['Нужно согласие', 'Поставь галочку — без неё мы не имеем права писать тебе по 152-ФЗ.'];
      case 'rate_limited':
        return ['Слишком частые попытки', 'Попробуй ещё раз через минуту.'];
      case 'invalid_source':
        return ['Что-то не так с формой', 'Перезагрузи страницу и попробуй снова.'];
      case 'invalid_content_type':
      case 'invalid_json':
        return ['Браузер не отправил данные', 'Перезагрузи страницу и попробуй снова.'];
      default:
        return ['Не получилось', 'Попробуй ещё раз через пару минут — или напиши нам в Telegram-чат.'];
    }
  }

  function handleSubmit(form) {
    return function (e) {
      e.preventDefault();

      var emailInput = form.querySelector('[name="email"]');
      var nameInput = form.querySelector('[name="first_name"]');
      var consentInput = form.querySelector('[name="consent_152fz"]');
      var honeypotInput = form.querySelector('[name="honeypot"]');
      var sourceAttr = form.getAttribute('data-source') || 'neurosborka-free';

      var email = emailInput && emailInput.value ? emailInput.value.trim().toLowerCase() : '';
      var firstName = nameInput && nameInput.value ? nameInput.value.trim() : '';
      var consent = !!(consentInput && consentInput.checked);
      var honeypot = honeypotInput && honeypotInput.value ? honeypotInput.value : '';

      if (emailInput) emailInput.setAttribute('aria-invalid', 'false');

      if (!EMAIL_RE.test(email) || email.length > 254) {
        if (emailInput) emailInput.setAttribute('aria-invalid', 'true');
        var msg = errorCopy('invalid_email');
        setStatus(form, 'error', msg[0], msg[1]);
        return;
      }
      if (!consent) {
        var msg2 = errorCopy('consent_required');
        setStatus(form, 'error', msg2[0], msg2[1]);
        return;
      }

      setBusy(form, true);
      setStatus(form, '', '', '');

      var payload = {
        email: email,
        first_name: firstName,
        consent_152fz: true,
        source: sourceAttr,
        honeypot: honeypot
      };

      track('optin_submit', { source: sourceAttr });

      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body }; });
      }).then(function (result) {
        var body = result.body || {};
        if (result.status === 202 && body.status === 'pending_confirm') {
          track('optin_success', { source: sourceAttr });
          var masked = body.masked_email || email;
          setStatus(
            form,
            'success',
            'Письмо ушло на ' + masked,
            'Открой почту и нажми «Подтвердить подписку» — ссылка живёт 48 часов. Не пришло? Проверь спам.'
          );
          if (emailInput) emailInput.value = '';
          if (nameInput) nameInput.value = '';
          if (consentInput) consentInput.checked = false;
          return;
        }
        if (result.status === 200 && body.status === 'already_subscribed') {
          track('optin_already', { source: sourceAttr });
          setStatus(
            form,
            'success',
            'Ты уже подписан',
            'Дайджест приходит на ' + (body.masked_email || email) + ' каждое утро в 10:00 МСК.'
          );
          return;
        }
        track('optin_error', { source: sourceAttr, code: body.error || ('http_' + result.status) });
        var copy = errorCopy(body.error);
        if (body.error === 'invalid_email' && emailInput) {
          emailInput.setAttribute('aria-invalid', 'true');
        }
        setStatus(form, 'error', copy[0], copy[1]);
      }).catch(function () {
        track('optin_error', { source: sourceAttr, code: 'network' });
        var copy = errorCopy('network');
        setStatus(form, 'error', copy[0], copy[1]);
      }).then(function () {
        setBusy(form, false);
      });
    };
  }

  function init() {
    var forms = document.querySelectorAll('form[data-optin]');
    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener('submit', handleSubmit(forms[i]));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
