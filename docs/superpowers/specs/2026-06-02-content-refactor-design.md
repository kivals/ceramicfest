# Content refactor: data-driven секции index.html

## Context

Сайт CeramicFest — статический промо-сайт, обновляется раз в год под новый сезон фестиваля. Сейчас каждый сезон живёт в отдельной git-ветке (`2021`, `2022`, ..., `2026`), а архивы прошлых лет хранятся как замороженные независимые копии в `#src/2021/`–`#src/2025/` со своими CSS/JS/img/data.

Текущая боль:

1. **Подготовка нового сезона** — много правок в разных местах `#src/index.html` (333 строки). Философия, СМИ, программа, партнёры, карта захардкожены прямо в HTML. Только участники уже вынесены в `#src/data/members.json` и рендерятся на клиенте через `fetch`.
2. **Правки прошлых лет** — каждый архив автономен, плюс лежит в своей ветке. Опечатка в 2023 = `git checkout 2023` + правка зашитого HTML + сборка + ребейз/мерж.

Стратегическое направление, согласованное в брейнсторминге:
- Уйти от модели «ветка-на-сезон» к единому `main`, где все годы живут вместе.
- Контент сезона описывается данными (JSON), а не разметкой.
- Общий каркас секций + escape hatch для уникальных блоков года (один из сезонов может ввести секцию, которой нет в других).

**Эта фаза** — узкий рефакторинг: переводим `index.html` сезона 2026 на data-driven архитектуру, готовим инфраструктуру (структура папок, JSON-схема, шаблонизатор, build-скрипт), которая в следующих фазах естественно расширится на `photos.html` / `reviews.html` / `team.html` и на портирование архивов 2021–2025.

Вне scope этой фазы:
- `photos.html`, `reviews.html`, `team.html`.
- Архивы 2021–2025 (остаются как сейчас).
- Миграция git-модели на `main` (физическое слияние веток) — делается отдельно после того, как новая архитектура устоится.

## Целевая архитектура

### Раскладка файлов

```
#src/
  index.html                      # оркестратор — только @@include секций
  sections/                       # шаблоны секций (Mustache)
    _intro.html
    _philosophy.html
    _media.html
    _members.html
    _program.html
    _partners.html
    _map.html
  data/
    members.json                  # как сейчас (per-year)
    members_all.json              # как сейчас (мастер-база)
    seasons/
      2026.json                   # все блоки сезона + порядок секций
  years/
    2026/
      extras/                     # кастомные HTML-блоки, уникальные для года
  generated/                      # артефакты pre-build, в .gitignore
    2026/
      index/                      # namespace страницы (Phase 2 добавит photos/, team/, reviews/)
        intro.html
        philosophy.html
        media.html
        members.html
        program.html
        partners.html
        map.html
        _sections.html            # список @@include в порядке из pages.index.sections[]
scripts/
  build-content.js                # читает seasons/2026.json + members.json,
                                  # рендерит #src/generated/2026/*.html
```

### Схема `data/seasons/2026.json`

```json
{
  "year": 2026,
  "title": "Вне Земли",
  "pages": {
    "index": {
      "sections": [
        "intro", "philosophy", "media", "members",
        "program", "partners", "map"
      ]
    }
  },
  "intro": {
    "title": "...",
    "subtitle": "...",
    "bgDesktop": "./img/intro/2026/desktop.webp",
    "bgMobile":  "./img/intro/2026/mobile.webp"
  },
  "philosophy": {
    "paragraphs": ["...", "...", "..."]
  },
  "media": {
    "items": [
      { "title": "...", "url": "...", "logo": "./img/aboutus/..." }
    ]
  },
  "members": {
    "dataFile": "./data/members.json"
  },
  "program": {
    "status": "announced",
    "days": [
      { "date": "2026-08-15", "events": [
          { "time": "12:00", "title": "...", "place": "..." }
      ]}
    ]
  },
  "partners": {
    "groups": [
      { "label": "Генеральный партнёр", "items": [
          { "name": "...", "logo": "./img/partners/...", "url": "..." }
      ]}
    ]
  },
  "map": {
    "address": "...",
    "description": "...",
    "embedUrl": "https://yandex.ru/map-widget/..."
  }
}
```

**Управление порядком и составом секций:** массив `pages.index.sections[]`. Чтобы убрать блок — убрать строку. Чтобы добавить уникальный — строка `"custom:my-block"`, сборщик подставит `#src/years/2026/extras/my-block.html` вместо генерируемого фрагмента.

**Программа:** в текущем 2026 закомментирована («Программа будет объявлена»). Поле `status: "announced"` / `"placeholder"` управляет, рендерить ли заглушку или раскрытое расписание (`days[]`). Шаблон `_program.html` обрабатывает оба варианта.

### `scripts/build-content.js`

Node-скрипт без рантайма, единственная внешняя зависимость — `mustache` (≈10 KB, logic-less).

Алгоритм:
1. Прочитать `#src/data/seasons/2026.json`.
2. Для каждой страницы из `pages` (Phase 1: только `index`):
   - Для каждого имени из `pages.{page}.sections[]`:
     - Если имя начинается с `custom:` → пропустить рендеринг, в `_sections.html` записать `@@include('../years/2026/extras/{name}.html')`.
     - Иначе:
       - Прочитать `#src/sections/_{name}.html` (Mustache-шаблон).
       - Для `members` дополнительно загрузить `data/members.json` и положить участников в контекст рендеринга.
       - Рендер → запись в `#src/generated/2026/{page}/{name}.html`.
       - В `_sections.html` записать `@@include('generated/2026/{page}/{name}.html')`.
   - Записать `#src/generated/2026/{page}/_sections.html` — список инклюдов в порядке `pages.{page}.sections[]`.

Параметр года передаётся через CLI: `node scripts/build-content.js --year 2026`. По умолчанию читает текущий год из переменной окружения или из дефолта в скрипте (на этой фазе — 2026). Скрипт обходит все страницы из `pages` за один запуск.

### `index.html` после рефакторинга

```html
@@include('_head.html')
<body>
  @@include('_header.html')
  <main>
    @@include('generated/2026/index/_sections.html')
  </main>
  @@include('_footer.html')
  @@include('_popup.html')
  @@include('_icons.html')
  @@include('_js.html')
</body>
```

Добавление/удаление блока → правка `2026.json`. Сам `index.html` больше не трогается.

### Gulp pipeline

- Новый task `content` запускает `node scripts/build-content.js --year 2026`.
- `gulp` (watch): добавить наблюдение за `#src/data/**/*.json`, `#src/sections/**/*.html`, `#src/years/**/*.html`, `scripts/build-content.js` → дёргает `content` → `html`.
- `gulp build`: `content` идёт первым, до `html`.
- `#src/generated/` добавить в `.gitignore`.

### JS-rendering участников

Сейчас `#src/js/files/script.js` делает `fetch('data/members.json')` и рендерит карточки на клиенте. После рефакторинга карточки уже в HTML — удаляем fetch и связанный код. Остаётся только клиентская логика попапа биографии; она читает данные из data-атрибутов карточки, которые ставит шаблон `_members.html`.

## Затронутые файлы

Изменяются:
- `#src/index.html` — превращается в оркестратор.
- `gulpfile.js` — новый task `content`, новые наблюдатели в watch.
- `#src/js/files/script.js` — убрать fetch + клиентский рендер участников.
- `.gitignore` — добавить `#src/generated/`.
- `package.json` — добавить зависимость `mustache`.

Создаются:
- `#src/sections/_intro.html`, `_philosophy.html`, `_media.html`, `_members.html`, `_program.html`, `_partners.html`, `_map.html`.
- `#src/data/seasons/2026.json`.
- `#src/years/2026/extras/.gitkeep`.
- `scripts/build-content.js`.

Не трогаются:
- Архивы `#src/2021/`–`#src/2025/`.
- `photos.html`, `reviews.html`, `team.html`.
- `#src/data/members.json`, `members_all.json` (формат сохраняется).
- Все стили SCSS — DOM-вывод секций должен бит в бит совпадать с текущим.

## Verification

1. **Build smoke:** `gulp build` отрабатывает без ошибок, `ceramicfest/index.html` создаётся.
2. **Визуальный diff:** `gulp` → открыть `localhost:3000`, пройти по всем секциям главной (интро, философия, СМИ, участники, программа-заглушка, партнёры, карта). Каждая выглядит и ведёт себя как до рефакторинга.
3. **Попап участника:** клик по карточке открывает попап с биографией — работает.
4. **WebP-подмена:** `gulp-webp-html` корректно подставил `<picture>` для новых сгенерированных фрагментов (проверить в DevTools, что грузятся `.webp`).
5. **Контентная правка:** в `data/seasons/2026.json` поменять имя любого партнёра → BrowserSync пересобирает → имя обновилось в браузере.
6. **Order правка:** убрать `"map"` из `pages.index.sections[]` → блок карты исчезает из HTML.
7. **Escape hatch:** добавить `"custom:test"` в `pages.index.sections[]`, создать `years/2026/extras/test.html` с `<div>HELLO</div>` → блок появляется в нужной позиции.
8. **Сравнение с прод-сборкой:** результирующий `ceramicfest/index.html` диффится против предыдущего билда — допустимы только различия в whitespace и порядке атрибутов.

## Extensibility (вне scope Phase 1, но контракт фиксируем)

Phase 1 покрывает только `index.html`. Phase 2 (отдельный спек) перенесёт `photos.html`, `team.html`, `reviews.html` на ту же модель без изменений архитектуры. Контракт, который Phase 1 обязан сохранить:

- **Schema namespace per page.** В `seasons/{year}.json` появляется ключ `pages`:
  ```json
  "pages": {
    "index":   { "sections": [...] },
    "photos":  { "sections": [...] },
    "team":    { "sections": [...] },
    "reviews": { "sections": [...] }
  }
  ```
  В Phase 1 присутствует только `pages.index`. Существующий `sections[]` верхнего уровня — это шорткат для `pages.index.sections`; в Phase 2 он мигрирует под `pages.index`.
- **Generated path namespace per page.** Артефакты лежат в `#src/generated/{year}/{page}/{section}.html` и `#src/generated/{year}/{page}/_sections.html`. В Phase 1 это `#src/generated/2026/index/...`.
- **Шаблоны секций переиспользуемые.** `_members.html` принимает `mode` (`preview` для главной, `full` для team). Шаблон в `#src/sections/` один, страница выбирает режим через данные.
- **Escape hatch работает на любой странице.** `"custom:foo"` в `pages.{any}.sections` подключает `#src/years/{year}/extras/foo.html`.
- **Оркестратор любой страницы** — один и тот же скелет, отличается только путём `@@include('generated/{year}/{page}/_sections.html')`.

Что это даёт: Phase 1 закладывает структуру `generated/2026/index/` (а не `generated/2026/` плоско) и `pages.index` (а не голый `sections[]`), чтобы Phase 2 не требовала переименований и миграции существующих файлов.

## Next

Implementation plan — через writing-plans skill.
