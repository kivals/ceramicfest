# Tech Debt

Список найденных проблем и долгов, которые не нужно чинить прямо сейчас, но стоит держать в виду.

Формат записи:

```
## <Короткое название>
- **Где:** путь(и) к файлам / зона
- **Симптом:** что не так / что выглядит/работает не идеально
- **Почему отложено:** причина не чинить сейчас
- **Как починить:** короткий план / ссылка на спеку
- **Найдено:** YYYY-MM-DD
```

Новые пункты добавлять в конец.

---

## Dead Popup component

- **Где:** `src/components/Popup.astro`, `BaseLayout.astro` (импорт + рендер), `#src/scss/popup.scss`
- **Симптом:** Компонент рендерится в DOM на всех страницах, но триггеров (`_popup-link`, `popup_open()`) в новых компонентах нет — он невидим и не открывается.
- **Почему отложено:** Не мешает, не ломает UX. Возможно, понадобится в будущих сезонах (видео-попап, регистрация).
- **Как починить:** Удалить компонент и импорт, если в текущем сезоне попапы не нужны. Либо реализовать триггер и логику открытия в `client.ts` (`._popup-link` → toggle `.popup.show`).
- **Найдено:** 2026-06-04

## Sass `@import` deprecation

- **Где:** `src/styles/_base.scss`, `src/styles/_components.scss`, `src/styles/global.scss`, все партиалы в `#src/scss/`
- **Симптом:** При билде Dart Sass пишет `DEPRECATION WARNING [import]: Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.` (≈12 раз).
- **Почему отложено:** Работает, не блокирует. Миграция на `@use`/`@forward` затронет много партиалов и переменные (`$fontFamily`, `$md1`–`$md4`, миксин `adaptiv-value`).
- **Как починить:** Перевести все `@import` на `@use`/`@forward`. Завести единый `_mixins.scss` через `@forward`, в каждом партиале `@use 'mixins' as *`. Параллельно вытащить старые SCSS из `#src/scss/` в `src/styles/` и убрать `loadPaths` из `astro.config.mjs`.
- **Найдено:** 2026-06-04

## Sass `slash-div` deprecation

- **Где:** `#src/scss/*.scss` (например, `home.scss`, `mixins.scss`)
- **Симптом:** `DEPRECATION WARNING [slash-div]: Using / for division outside of calc() is deprecated and will be removed in Dart Sass 2.0.0.` Появляется ≈9 раз.
- **Почему отложено:** Чисто legacy-синтаксис, работает. Решится вместе с переписыванием на `@use`/`@forward` (см. выше).
- **Как починить:** Заменить `a / b` на `math.div(a, b)` (с `@use 'sass:math'`) или `calc(a / b)`.
- **Найдено:** 2026-06-04

## `body_lock` без компенсации скроллбара

- **Где:** `src/scripts/client.ts` (`toggleMenu`)
- **Симптом:** При открытии бургер-меню на десктопе с обычным скроллбаром (не overlay) контент может дёрнуться вправо, потому что `overflow: hidden` на `body` убирает скролл.
- **Почему отложено:** На macOS скроллбар overlay — не видно. На Windows/Linux заметнее.
- **Как починить:** Перед добавлением `_lock` посчитать `window.innerWidth - document.documentElement.clientWidth` и записать как `padding-right` на body (и снять после убирания `_lock`). См. старый `body_lock_add` в `#src/js/files/functions.js`.
- **Найдено:** 2026-06-04

## Year hardcode в shared SCSS

- **Где:** `#src/scss/home.scss`
- **Симптом:** `.intro__container { background-image: url(../img/intro/2026/desktop.webp) }` — путь к фону прибит к 2026. При создании ветки 2027 фон не сменится без правки SCSS.
- **Почему отложено:** В текущей ветке `astro-migration` фестиваль 2026 — это правильное значение. Архитектурный долг проявится при следующей ежегодной миграции.
- **Как починить:** Вынести фон-интро в `src/styles/years/{year}.scss` через `.intro__container { background-image: url(...) }` или через CSS-переменную, переопределяемую в Year{N}Layout. Альтернатива — задавать через data (поле в seasons JSON + inline-стиль в `Intro.astro`).
- **Найдено:** 2026-06-04

## PhotoGallery `webkitallowfullscreen` TS error

- **Где:** `src/components/sections/shared/PhotoGallery.astro:23`
- **Симптом:** `astro check` падает с 1 ошибкой: `Property 'webkitallowfullscreen' does not exist on type 'IframeHTMLAttributes'`. Билд проходит (это ошибка только TS check'а).
- **Почему отложено:** Атрибут полезен только для очень старых iOS Safari. Современный iframe и так открывает Vimeo в fullscreen через `allowfullscreen`.
- **Как починить:** Убрать `webkitallowfullscreen` и `mozallowfullscreen` — оставить только стандартный `allowfullscreen`. Или подавить ошибку через `is:inline` шаблон / `// @ts-expect-error`.
- **Найдено:** 2026-06-04

## `frameborder` deprecated warnings

- **Где:** `src/components/sections/shared/Map.astro:11`, `src/components/sections/shared/PhotoGallery.astro:23`
- **Симптом:** `astro check` выдаёт warning `'frameborder' is deprecated`. Не блокирует ничего.
- **Почему отложено:** Косметика. iframe рендерится корректно.
- **Как починить:** Удалить атрибут `frameborder` — границ у iframe и так нет по умолчанию в современных браузерах. Если нужна явная — `style="border: 0"`.
- **Найдено:** 2026-06-04

## `@types/node` отсутствует — `src/lib/members.ts` падает на astro check

- **Где:** `src/lib/members.ts:1,2,14`
- **Симптом:** `astro check` выдаёт 3 ошибки: `Cannot find module 'node:fs/promises'`, `Cannot find module 'node:path'`, `Cannot find name 'process'`. Билд работает (Vite/Astro своими типами разруливают), но `npm run check` красный.
- **Почему отложено:** Не блокирует билд и dev-сервер. Простой фикс, но требует одного решения.
- **Как починить:** `npm i -D @types/node` и добавить `"types": ["node"]` в `tsconfig.json` (или просто установить — Astro подхватит).
- **Найдено:** 2026-06-07

## Шум `astro check` от legacy JS в `public/*/js/`

- **Где:** `public/{2021,2022,2022_2,2023,2024,2025}/js/{app,vendors}.{js,min.js}`, `public/2026/...`
- **Симптом:** `astro check` лазит в минифицированные legacy JS архивов и выдаёт ~195 hints/warnings (`is deprecated`, `is declared but never read`). Сигнал в реальном коде тонет в шуме.
- **Почему отложено:** Это валидно работающий статический ассет под /{year}/, его нельзя удалить — на него ссылаются inline-HTML архивов. TS-проверять его не нужно.
- **Как починить:** В `tsconfig.json` добавить `"exclude": ["public/**/*.js"]` или в `astro.config.mjs` исключить через `vite.optimizeDeps.exclude` / отдельный `.tsconfig` под check. Минимальный путь — `exclude` в tsconfig.
- **Найдено:** 2026-06-07

## Архивные сезоны: set:html shortcut вместо порта в JSON+компоненты

- **Где:** `src/pages/[year]/[...slug].astro`, `src/legacy/{2021,2022,2022_2,2023,2024,2025}/*.body.html`, `src/layouts/ArchiveLayout.astro`, `src/legacy/titles.json`
- **Симптом:** Маршруты `/{year}/*` инлайнят сохранённый `<body>` оригинальных сайтов через `set:html`. Контент не разбит на JSON, не использует shared-секции / Header / Footer / HistoryWidget — это намеренно. `ArchiveLayout` — автономная HTML-оболочка, не наследует `BaseLayout`, грузит legacy CSS из `/{year}/css/style.min.css`.
- **Почему отложено:** Полный порт в JSON+компоненты (как описано в `docs/superpowers/plans/2026-06-06-phase2-archive-2021-design.md`) — многочасовая ручная работа на каждый год без визуальных гарантий. Corner-cut даёт pixel-perfect архивы за один проход и не блокирует HistoryWidget на современной части (`ARCHIVE_YEARS` в `src/config.ts` автоматом даёт ссылки на все мигрированные годы).
- **Как починить:** Если когда-то понадобится редактировать контент архивов через JSON или подключить shared Header — переписать конкретный архив по полному плану. Архивы заморожены, дешевле оставить как есть.
- **Найдено:** 2026-06-07

## Битая ссылка `url(../img/loading.gif)` в legacy popover.min.scss

- **Где:** `src/styles/legacy/popover.min.scss:264`
- **Симптом:** Селектор использует `background: url(../img/loading.gif)`, файла `loading.gif` нет в `public/img/`. После переезда на абсолютные пути остальных ассетов это место не правил, потому что файла всё равно нет — нужно решить, что с ним делать.
- **Почему отложено:** Скорее всего, popover loading-индикатор не используется в текущем UI; визуально ничего не сломано. Правка пути без файла бессмысленна.
- **Как починить:** Либо вернуть `loading.gif` в `public/img/` и поправить путь на `/img/loading.gif`, либо убрать декларацию (и проверить, что `popover.min.scss` вообще нужен — это минифицированный legacy-партиал).
- **Найдено:** 2026-06-08
