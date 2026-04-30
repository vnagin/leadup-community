# leadup-community

Хост: **community.leadup.guru** (GitHub Pages, кастомный домен через CNAME).

Репозиторий содержит лендинги и ивент-страницы для community-продуктов LeadUp AI:

| Путь | Назначение | Статус |
|---|---|---|
| `/` (`index.html`) | Корневой хаб community-продуктов | placeholder |
| `/neurosborka/` | Бесплатный лендинг «Нейросборка» — точка входа в TG-чат | placeholder |
| `/neurosborka/pro/` | Платный лендинг «Нейросборка PRO» (50 €/5 000 ₽ в месяц, Tribute) | placeholder |
| `/mastermind/` | Лендинг ивента «Мастермайнд для PRO» (будет позже) | TBD |

## Деплой

GitHub Pages → branch `main`, root `/`. После пуша в `main` страницы публикуются автоматически (1–2 минуты).

DNS: CNAME `community.leadup.guru` → `vnagin.github.io.` (стандартный таргет GitHub Pages для user/org pages). После настройки CNAME у регистратора и включения Pages в Settings → Pages → Source = main, GitHub автоматически выпустит SSL через Let's Encrypt.

## Стек

- **HTML/CSS/JS**, vanilla. Без сборщиков на старте.
- **Brand v3 design tokens** — `vault/company/brand/leadup-ai-design-system` (приватный репо, токены вшиваем в собственный `assets/css/brand.css`).
- **CTA на действия наружу:**
  - Free → Telegram-чат `https://t.me/+a4YGH9rdoJRjMTE1`.
  - PRO → Tribute checkout (URL получит Дима в LEA-675) → авто-добавление в `https://t.me/+4muWaxiEim8yNDU1`.
- **Аналитика:** Plausible/GA на каждый путь отдельно (см. ADR-002).

## Структура

```
.
├── CNAME                        → community.leadup.guru
├── index.html                   → root hub
├── neurosborka/
│   ├── index.html               → free лендинг (CTA: TG-чат)
│   └── pro/
│       └── index.html           → платный (CTA: Tribute)
├── assets/
│   ├── css/                     → стили (brand.css, page-specific)
│   ├── js/                      → опциональный JS
│   └── img/                     → изображения, логотипы, иконки
└── .github/                     → workflows (опц.: lint, превью)
```

## Контент-источники

- Скрипт-копия лендингов: `vault/projects/neurosborka/deliverables/landing-pages/copy-v2.md` (production-ready).
- Бриф: `vault/projects/neurosborka/deliverables/landing-pages/brief-2026-04-30.md`.
- ADR по платежам и стеку: `vault/projects/neurosborka/decisions/adr-002-landing-payments-stack.md`.

## Roadmap

- 2026-05-04 — Дима ([LEA-675](https://github.com/vnagin/leadup-community/issues)) поднимает скелет HTML, подключает CNAME, проверяет SSL.
- 2026-05-06 — v1 обоих лендингов на community.leadup.guru/neurosborka и /pro.
- 2026-05-15 — финал, прод.
- Q3 2026 — `/mastermind/` ивентовая страница.

## Owners

- CEO / strategy: Алекс / Владимир Нагин
- Build / deploy: Дима (AutomationEngineer) — LEA-675
- Web verstka: Миша (WebDeveloper)
- Copy: Марина (ContentManager) — copy-v2.md
- Methodology: Ирина (EduMethodologist) — pro-program-2026-04-30.md
