// Confirm-email page — POSTs query-params to /api/subscribe/confirm and
// renders one of: success, already_confirmed, expired, invalid, error.

(function () {
  function track(name, props) {
    if (typeof window.plausible === 'function') {
      try { window.plausible(name, props ? { props: props } : undefined); } catch (e) {}
    }
  }

  function showState(name) {
    var states = document.querySelectorAll('.confirm__state');
    for (var i = 0; i < states.length; i++) {
      var el = states[i];
      var match = el.getAttribute('data-state') === name;
      if (match) el.setAttribute('data-active', 'true');
      else el.removeAttribute('data-active');
    }
  }

  function setEmailDisplay(value) {
    var nodes = document.querySelectorAll('[data-confirm-email]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = value;
    }
  }

  function getParams() {
    var qs = new URLSearchParams(window.location.search);
    return {
      email: (qs.get('email') || '').trim(),
      ts: (qs.get('ts') || '').trim(),
      token: (qs.get('token') || '').trim()
    };
  }

  function confirm() {
    var params = getParams();
    showState('loading');

    if (!params.email || !params.ts || !params.token) {
      track('confirm_invalid', { reason: 'missing_params' });
      showState('invalid');
      return;
    }

    setEmailDisplay(params.email);

    fetch('/api/subscribe/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(function (res) {
      return res.json().then(function (body) { return { status: res.status, body: body || {} }; });
    }).then(function (result) {
      var body = result.body;
      if (result.status === 200 && body.status === 'confirmed') {
        track('confirm_success');
        if (body.masked_email) setEmailDisplay(body.masked_email);
        showState('success');
        return;
      }
      if (result.status === 200 && body.status === 'already_confirmed') {
        track('confirm_already');
        if (body.masked_email) setEmailDisplay(body.masked_email);
        showState('already_confirmed');
        return;
      }
      if (result.status === 410 || body.error === 'expired') {
        track('confirm_expired');
        showState('expired');
        return;
      }
      if (result.status === 401 || body.error === 'invalid_token') {
        track('confirm_invalid', { reason: 'invalid_token' });
        showState('invalid');
        return;
      }
      track('confirm_error', { code: body.error || ('http_' + result.status) });
      showState('error');
    }).catch(function () {
      track('confirm_error', { code: 'network' });
      showState('error');
    });
  }

  function init() {
    confirm();
    var retry = document.querySelector('[data-confirm-retry]');
    if (retry) retry.addEventListener('click', confirm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
