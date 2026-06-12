# leadup-community — лендинги Нейросборка + LeadUp AI Daily (v2)

Лендинги и opt-in воронка для `community.leadup.guru`. Brand v3 (D2 Cold Technical · Geist · Electric Teal `#00E5C7`).

> **v2 (2026-05-06):** добавлены Vercel Edge функции `/api/subscribe` + `/api/subscribe/confirm` для community-newsletter (LEA-1174 / parent LEA-1164). Деплой переходит с GitHub Pages на Vercel, чтобы Edge-функции жили same-origin с лендингами.

## Структура

```
.
├── index.html                       # community.leadup.guru/ (хаб)
├── neurosborka/
│   ├── index.html                   # /neurosborka/ (free лендинг + opt-in форма)
│   └── pro/
│       └── index.html               # /neurosborka/pro/ (PRO лендинг + opt-in форма)
├── confirm-email/
│   └── index.html                   # /confirm-email — 4 state'а подтверждения подписки
├── legal/
│   └── privacy/
│       └── index.html               # /legal/privacy — политика 152-ФЗ (placeholder, swap по LEA-1170)
├── api/                             # Vercel Edge runtime
│   ├── subscribe.ts                 # POST /api/subscribe — proxy → n8n с HMAC, rate-limit, honeypot
│   └── subscribe/
│       └── confirm.ts               # POST /api/subscribe/confirm — proxy → n8n
├── lib/
│   ├── rate-limit.ts                # 5/min + 30/hour per-IP, in-memory edge bucket
│   ├── validation.ts                # email regex, source allowlist, masked-email
│   └── forward.ts                   # n8n webhook helper (HMAC header)
├── assets/
│   ├── css/{tokens.css,landing.css}
│   └── js/{analytics.js,pro-checkout.js,optin.js,confirm-email.js}
├── package.json + tsconfig.json + vercel.json
├── CNAME                            # community.leadup.guru
└── .github/workflows/lint.yml       # HTML/CSS lint + broken-links
```

## Деплой через Vercel (CEO)

> Миграция с GitHub Pages на Vercel требуется, потому что `/api/*` — это Edge functions, а GH Pages — пуристически статика.

1. **Создать Vercel-проект** `community-leadup-guru` в команде `vnagins-projects`. Framework — `Other` (детектится по `vercel.json`). Root — корень репо.
2. **Привязать домен** `community.leadup.guru` (DNS уже на Cloudflare, поменять CNAME на `cname.vercel-dns.com` или `A @ 76.76.21.21`). SSL — авто.
3. **GitHub App.** Поставить https://github.com/apps/vercel на `vnagin/leadup-community`. После этого пуш в `main` → авто-деплой prod.
4. **Env vars (production):**
   - `LE_OPTIN_WEBHOOK_URL` = `https://n8n.leadup.guru/webhook/community-opt-in-request` (даёт Дима)
   - `LE_OPTIN_CONFIRM_WEBHOOK_URL` = `https://n8n.leadup.guru/webhook/community-opt-in-confirm` (даёт Дима)
   - `LE_OPTIN_WEBHOOK_SECRET` = 32+ байт случайных (общий с Димой, сверяет в первой Code-node)
5. Если env-vars пустые — `/api/subscribe` уходит в **mock-mode** (логирует payload + возвращает 202). Удобно для preview-деплоев до того, как n8n поднялся.

### Старый GH Pages деплой

Можно оставить как fallback (CNAME в этом репо живой), но `/api/*` там не работает — форма получит 404. Решение CEO — мигрируем на Vercel целиком.

## Прод-чек-лист (что заполнить перед запуском)

| Где | Что | Кто |
|---|---|---|
| `assets/js/pro-checkout.js` → `NS_CONFIG.tribute.monthlyEur` / `annualEur` | Реальные ссылки Tribute checkout (EUR + крипта) | Дима / CEO |
| `assets/js/pro-checkout.js` → `NS_CONFIG.cloudpayments.publicId` | Public ID из CloudPayments dashboard (`pk_…`) | Дима |
| `assets/img/og-neurosborka.png` (1200×630) | OG-обложка free | Марина / Артём |
| `assets/img/og-neurosborka-pro.png` (1200×630) | OG-обложка PRO | Марина / Артём |
| Plausible dashboard | Создать сайт `community.leadup.guru`, добавить goals: `free_join_click`, `pro_upsell_click`, `pro_checkout_click`, `pro_checkout_success`, `hub_card_click` | Дима |
| Free CTA url `https://t.me/+a4YGH9rdoJRjMTE1` | Подтвердить актуальность invite-link с Катей | Катя |
| PRO success redirect `https://t.me/+4muWaxiEim8yNDU1` (в `pro-checkout.js`) | Подтвердить с Катей, что invite автоматически сработает после оплаты | Катя / Дима |
| `pro/index.html` body atribute `data-pending-founder-pass="true"` | После финального pass-а Владимира удалить (или оставить `false`) | Дима |
| Vercel env: `LE_OPTIN_WEBHOOK_URL`, `LE_OPTIN_CONFIRM_WEBHOOK_URL`, `LE_OPTIN_WEBHOOK_SECRET` | Прод-секреты для n8n proxy (LEA-1174) | Дима |
| `legal/privacy/index.html` | Финальный текст политики 152-ФЗ | Катя (LEA-1170) |
| `neurosborka/{,pro/}index.html` секция `#newsletter` (h2 / lead / labels / consent text) | Финальная копия opt-in формы | Катя (LEA-1170) |

## Аналитика и retargeting

Plausible сидит на `community.leadup.guru` (один домен). Разделение **по событиям**, не по доменам:

- `free_join_click` — клик «Вступить в Telegram-чат» на `/neurosborka/`.
- `pro_upsell_click` — клик апсейл-CTA на free.
- `pro_checkout_click` — открытие чекаута на PRO (с props `plan: pro_eu_monthly | pro_eu_annual | pro_ru_monthly | pro_ru_annual`).
- `pro_checkout_success` — успешная оплата (только CloudPayments, callback из виджета).
- `pro_checkout_fail` — отмена/ошибка оплаты.
- `hub_card_click` — клик по карточкам на `community.leadup.guru/`.

Для retargeting в Yandex/VK Ads (если потребуется) — добавить отдельный pixel в `<head>`. Plausible сам по себе ретаргетинг не делает (privacy-first).

**Альтернатива GA4:** заменить `analytics.js` на стандартный gtag-снипет, события маппятся 1-в-1 (event names такие же).

## Tribute checkout (EUR + крипта)

Tribute checkout — внешняя ссылка, открывается в новой вкладке (`window.open(...)`).
Создание SKU — в Tribute Author Dashboard (REST API не покрывает subscription-продукты, см. `vault/.../reference_tribute_api.md`).

Шаги Димы:
1. В Tribute Dashboard создать продукт «Нейросборка PRO Monthly» (50 EUR / month).
2. Создать продукт «Нейросборка PRO Annual» (510 EUR / year).
3. Скопировать checkout URL в `NS_CONFIG.tribute.{monthlyEur, annualEur}`.
4. Webhook от Tribute → n8n → авто-добавление в чат `t.me/+4muWaxiEim8yNDU1` (Тribute-MCP / `paperclip` workflow).

## CloudPayments (RUB recurring)

Виджет CloudPayments подгружается lazy при клике на ₽-кнопку. Подписка — через `recurrent: { interval: 'Month'/'Year', period: 1 }`.

Шаги Димы:
1. В CloudPayments dashboard завести сайт `community.leadup.guru`, получить `publicId`.
2. Настроить чек-сервер для онлайн-кассы (54-ФЗ) — отдельная задача (LEA-?).
3. Подставить `publicId` в `NS_CONFIG.cloudpayments.publicId`.
4. Webhook `Pay` → n8n → авто-добавление в PRO-чат.

## Pending decision-points

- **§B.7 — финальный pass Владимира.** Текст-черновик от Марины утверждён CEO. Финальная редактура — Владимиром до 06.05. Если не успевает — оставить `data-pending-founder-pass="true"` (показывает notice-bar) + footer-пометка.
- **§B.9 — годовая подписка.** Если annual billing в Tribute / CloudPayments не успевает к 15.05 — скрыть кнопки `Год за ...` (закомментировать в `pro/index.html`) + добавить FAQ-формулировку «годовая опция появится в течение 30 дней после запуска».

## Локальный preview

**Static-only (без API):**

```bash
python3 -m http.server 4000
# http://localhost:4000/neurosborka/  — форма получит 404 при submit, но рендер ОК
```

**С Edge функциями (`vercel dev`):**

```bash
npm install
npx vercel dev    # http://localhost:3000
# /api/subscribe работает в mock-mode без env vars — payload логируется, 202 возвращается
```

## Newsletter opt-in поток (LEA-1174)

```
[/neurosborka/  или  /neurosborka/pro/]
   form data-optin → POST /api/subscribe (Vercel Edge)
       ├─ rate-limit (5/min, 30/hour per IP)        → 429
       ├─ honeypot != "" → silent 202 (drop)
       ├─ email regex + consent_152fz + source allowlist
       └─ forward + HMAC X-Webhook-Secret → n8n
              ↓
       [n8n WF-5a] HMAC-token + Resend confirm-email
              ↓
       email-link → /confirm-email?email=&ts=&token=
              ↓
       confirm-email.js → POST /api/subscribe/confirm → n8n WF-5b → Resend audience
              ↓
       UI рендерит один из 4 state'ов: success | already_confirmed | expired | invalid
```

Контракты — `vault/projects/n8n-automations/deliverables/workflow-specs/inbound-2026/05-daily-digest-broadcast.spec.md` §2 + LEA-1174 issue body.

## Lint (опц.)

Action `.github/workflows/lint.yml` запускает HTMLHint + Stylelint + linkinator на каждый push в `main`. Это soft-чек (broken-links не падает CI, чтобы не блокировать деплой при флаках сторонних доменов).
