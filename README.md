# leadup-community — лендинги Нейросборка (v1)

Static-сайт для `community.leadup.guru` на GitHub Pages. Brand v3 (D2 Cold Technical · Geist · Electric Teal `#00E5C7`).

## Структура

```
.
├── index.html                 # community.leadup.guru/  (хаб)
├── neurosborka/
│   ├── index.html             # /neurosborka/  (free лендинг)
│   └── pro/
│       └── index.html         # /neurosborka/pro/  (PRO лендинг)
├── assets/
│   ├── css/
│   │   ├── tokens.css         # brand v3 — копия vault/company/brand/colors_and_type.css
│   │   └── landing.css        # секции и компоненты лендингов
│   ├── js/
│   │   ├── analytics.js       # Plausible (один домен community.leadup.guru, custom events)
│   │   └── pro-checkout.js    # Tribute (EUR + crypto) + CloudPayments (RUB recurring)
│   └── img/                   # OG-картинки + ассеты
├── CNAME                      # community.leadup.guru
├── .nojekyll                  # отключает Jekyll (важно для папок с подчёркиваниями)
└── .github/workflows/lint.yml # HTML/CSS lint + broken-links на push в main
```

## Деплой (для CEO/Дима)

1. Скопировать содержимое этой папки в корень репо `vnagin/leadup-community` (replace existing skeleton).
2. Push в `main` → GitHub Pages автоматически выкатит на `community.leadup.guru` (CNAME уже задан).
3. Через 1–24 часа после CNAME проверить SSL и включить «Enforce HTTPS» в Settings → Pages.

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

```bash
cd /path/to/leadup-community
python3 -m http.server 4000
# открыть http://localhost:4000/
# открыть http://localhost:4000/neurosborka/
# открыть http://localhost:4000/neurosborka/pro/
```

## Lint (опц.)

Action `.github/workflows/lint.yml` запускает HTMLHint + Stylelint + linkinator на каждый push в `main`. Это soft-чек (broken-links не падает CI, чтобы не блокировать деплой при флаках сторонних доменов).
