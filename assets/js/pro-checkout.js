// PRO checkout — Tribute single-provider (EUR + RUB + crypto)
//
// ADR-002 rev4 (CEO 2026-04-30): Tribute закрывает все валюты одним пайплайном,
// CloudPayments убран. Конфиг — четыре checkout-ссылки от CEO/Vladimir,
// раздельно по cycle (Monthly / Annual) для чистой attribution
// (LEA-751 CEO comment 2026-04-30).
//
// HTML wires (Premium-only, 4 SKU):
//   <button class="btn btn-checkout" data-region="eu" data-plan="monthly">
//   <button class="btn btn-checkout" data-region="eu" data-plan="annual">
//   <button class="btn btn-checkout" data-region="ru" data-plan="monthly">
//   <button class="btn btn-checkout" data-region="ru" data-plan="annual">

(function () {
  // Заполняется production-ссылками от Vladimir (LEA-751).
  // Формат: https://t.me/tribute/app?startapp=<id>
  // Раздельные SKU monthly/annual — интент пользователя сохраняется при переходе.
  window.NS_CONFIG = window.NS_CONFIG || {
    tribute: {
      monthlyEur: 'https://t.me/tribute/app?startapp=seYI',
      annualEur:  'https://t.me/tribute/app?startapp=sU3a',
      monthlyRub: 'https://t.me/tribute/app?startapp=siNS',
      annualRub:  'https://t.me/tribute/app?startapp=sU38'
    }
  };

  function track(name, props) {
    if (typeof window.plausible === 'function') {
      window.plausible(name, props ? { props: props } : undefined);
    }
  }

  function resolveCheckoutUrl(region, plan) {
    var t = window.NS_CONFIG.tribute;
    if (region === 'ru') {
      return plan === 'annual' ? t.annualRub : t.monthlyRub;
    }
    return plan === 'annual' ? t.annualEur : t.monthlyEur;
  }

  function handleClick(e) {
    var btn = e.target.closest('.btn-checkout');
    if (!btn) return;
    e.preventDefault();
    var region = btn.getAttribute('data-region') || 'eu';
    var plan = btn.getAttribute('data-plan') || 'monthly';
    var planKey = (region === 'ru' ? 'pro_ru_' : 'pro_eu_') + plan;
    var props = { page: 'pro', plan: planKey };
    if (window.NS_UTM) {
      Object.keys(window.NS_UTM).forEach(function (k) { props[k] = window.NS_UTM[k]; });
    }
    track('pro_checkout_click', props);
    var url = resolveCheckoutUrl(region, plan);
    window.open(url, '_blank', 'noopener');
  }

  document.addEventListener('click', handleClick);
})();
