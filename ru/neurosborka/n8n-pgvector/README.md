---
title: "Стартовый пак n8n-workflows под PGVector / RAG — Нейросборка Free"
project: neurosborka
type: workflow-pack
status: ready-for-review
revision: 1
owner: "Дима (AutomationEngineer)"
approver: "Алекс (CEO)"
created: "2026-05-09"
related_issue: LEA-1408
related_phase2: LEA-1296
related_must_honor: "id 2411 (substitute) — заменяет cross-promo на курсы Ледовских"
target_audience: "AI-фрилансеры 40+, исполнители (не программисты), русскоязычные"
hosting: "Google Drive (открытая ссылка); миграция на GitHub — фаза 3+"
license: "CC BY 4.0 — Нейросборка / leadup.ai"
tags: [community, must-honor-2411-substitute, n8n, pgvector, rag, free, phase-2]
---

# Стартовый пак n8n-workflows под PGVector / RAG

> Четыре готовых workflow для типовых RAG-сценариев на бесплатном PGVector. Импортируете — заполняете credentials — работает. Собрано для участников Free Нейросборки, которые хотят попробовать локальный RAG без Pinecone и сложной обвязки.

## Что внутри

| # | Файл | Что делает | Триггер |
|---|---|---|---|
| 1 | `pgvector-ingest-from-folder.json` | Загружает PDF / TXT / MD из папки в PGVector с эмбеддингами OpenAI | Manual (запускаешь руками) |
| 2 | `pgvector-retrieval-basic.json` | Принимает POST-запрос, ищет топ-N релевантных чанков, отдаёт JSON | Webhook |
| 3 | `pgvector-rag-chat.json` | Telegram-бот: вопрос → retrieval → LLM-ответ по найденным фрагментам | Telegram Trigger |
| 4 | `pgvector-metadata-tagging.json` | LLM-классификатор присваивает теги/категорию и пишет их в metadata чанков | Manual |

> Пятый workflow (`pgvector-update-document.json`) **отложен** до v2 — инкрементальная диффинг-логика требует кастомного Code-узла, плохо ложится на «не-программистов».

## Для кого это

Ты — AI-фрилансер 40+, ставишь n8n локально или в облаке, хочешь сделать первый рабочий RAG-проект для клиента (или для себя). Программистом тебе быть не надо — узлы готовы, нужно только подключить ключи.

Если ты уже работал с n8n: пропусти раздел «Что нужно для запуска» и сразу переходи к импорту.

## Что нужно для запуска

### Обязательно

1. **n8n** — self-hosted (Docker / Beget / VDS) или [Cloud](https://n8n.io). Версия ≥ 1.50 (LangChain-узлы стабильны).
2. **PostgreSQL** с расширением **pgvector** ≥ 0.5.0. Подойдёт:
   - облачный Postgres (Supabase, Neon, Aiven — у всех pgvector «из коробки»);
   - свой VDS с Postgres и установленным `pgvector`.
3. **OpenAI API key** — для эмбеддингов и (опционально) GPT-ответов.

### Опционально

- **Anthropic API key** или **Ollama** — если не хочешь OpenAI. Замены — внутри workflow в стикерах.
- **Telegram-бот** — для workflow #3 (RAG chat). Создаётся через `@BotFather` за минуту.

## Шаг 0 — Проверь, что pgvector установлен

Откроем psql или любой Postgres-клиент (DBeaver / TablePlus / pgAdmin) и выполним:

```sql
-- 1) Установить расширение, если ещё нет
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Проверить версию
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

Должно вернуть строку вида `vector | 0.7.0`. Если получаешь ошибку «extension not available» — pgvector не установлен на сервере. Решения:

- **Supabase / Neon / Aiven**: pgvector уже есть, просто включи в Database → Extensions.
- **Свой Postgres**: `apt install postgresql-15-pgvector` (Debian / Ubuntu) или собрать из исходников по [инструкции](https://github.com/pgvector/pgvector#installation).

Если всё ок — иди дальше.

## Шаг 1 — Импорт workflow в n8n

Для каждого `.json` файла:

1. В n8n зайди в **Workflows** (левое меню).
2. Нажми кнопку **Add Workflow → Import from File** (правый верхний угол, иконка трёх точек на самой кнопке).
3. Выбери `.json` файл с диска.
4. n8n откроет workflow в редакторе. Нажми **Save** (Ctrl/Cmd + S).

> Альтернатива: на странице Workflows есть кнопка **+ Workflow → from File** (формулировка зависит от версии n8n).

После импорта в красных бейджах будут узлы, которым не хватает credentials — это нормально, заполним на следующем шаге.

## Шаг 2 — Подключить credentials

В каждом workflow есть стикер с указанием, какие credentials нужны. В сумме по всему паку понадобится:

| Credential type | Где взять | Используется в |
|---|---|---|
| `OpenAI API` | https://platform.openai.com → API Keys | 1, 2, 3, 4 |
| `Postgres` | хост / порт / база / юзер / пароль твоего Postgres | 1, 2, 3, 4 |
| `Telegram API` | токен от @BotFather | 3 |

Чтобы добавить credential:

1. Кликни на узел в красном бейдже.
2. В правой панели — поле «Credential to connect with» → клик → «Create New».
3. Заполни поля, нажми **Save**.

n8n хранит credentials отдельно от workflow — один раз создал, дальше выбираешь из списка.

## Шаг 3 — Где менять переменные

| Workflow | Узел | Что поменять |
|---|---|---|
| 1 (ingest) | «Прочитать файлы из папки» | `fileSelector` — путь и маска. Дефолт: `/data/docs/**/*.{pdf,txt,md}` |
| 1 (ingest) | «Записать в PGVector» | `tableName` — имя таблицы. Дефолт: `n8n_vectors`. Если таблицы нет — n8n создаст |
| 2 (retrieval) | «Поиск в PGVector» | `tableName` — то же, что в ingest. ОБЯЗАТЕЛЬНО совпадение |
| 3 (RAG chat) | «База знаний (PGVector)» | `tableName`, `topK` (5 — норма для большинства задач) |
| 3 (RAG chat) | «RAG-ассистент» | `systemMessage` — подстрой под свою задачу |
| 4 (tagging) | «Сгенерировать теги» | промпт + `jsonSchemaExample` в «Схема тегов» |
| 4 (tagging) | «Собрать документ + теги» | свои поля (например, `client_id`) — добавь и в metadataValues узла «Загрузить с метаданными» |

## Шаг 4 — Прогон через все 4 workflow

Минимальный сценарий «всё работает»:

1. **Ingest**: положи 1–2 PDF / TXT в папку, запусти workflow #1, дождись «Success». В Postgres появится таблица `n8n_vectors` с N строк.
2. **Retrieval**: активируй workflow #2 (тумблер вверху). Скопируй webhook URL, отправь POST через curl/Postman:
   ```bash
   curl -X POST https://your-n8n.example.com/webhook/pgvector-search \
     -H 'Content-Type: application/json' \
     -d '{"query": "вопрос по содержимому твоих документов", "topK": 4}'
   ```
   Получишь JSON с топ-4 фрагментами.
3. **RAG chat**: в workflow #3 подключи Telegram credentials, активируй. Напиши боту в Telegram — должен ответить по твоим документам.
4. **Tagging**: запусти #4 на новых документах — они попадут в ту же таблицу с дополнительными metadata.

## Что НЕ делает этот пак (и не сделает в v1)

- Не использует платный Pinecone / Weaviate. Только PGVector — для бесплатного старта.
- Не поддерживает Russian-only модели (BGE-m3, GigaChat) из коробки. Замена возможна — см. стикер в workflow #3. Перевести пак на BGE-m3 — задача v2.
- Не делает инкрементальное обновление документов (workflow #5). Сейчас при изменении файла нужно удалить старые чанки руками и прогнать ingest заново.
- Не делает деплой / docker-compose. Подразумевается, что n8n + Postgres у тебя уже подняты.

## Лицензия

CC BY 4.0 — копируйте, переделывайте, продавайте, главное — упомяните **Нейросборка / leadup.ai**.

См. `LICENSE.md` рядом.

## Куда писать, если что-то сломалось

- В Free-чате Нейросборки в топике «Вопросы n8n» (id 128) — самое активное место за всё время чата, там ответят быстро.
- Лично [@leadupai](https://t.me/leadupai) (Катя) — она маршрутизирует к Диме (AutomationEngineer).

## Что дальше

- v1.1 (если соберём фидбек): подложим вариант на Ollama + локальные эмбеддинги (отдельный JSON-набор).
- v2 (июнь+): пятый workflow (incremental update), вариант под BGE-m3, шаблон docker-compose «n8n + Postgres + pgvector» для тех, у кого ничего не поднято.

## Revision history

- v1 (2026-05-09, Дима) — собран пакет из 4 workflow, описаны setup-шаги, диагностика pgvector, лицензия CC BY 4.0. Ждём ✅ CEO пакетом с шаблон-паком.
