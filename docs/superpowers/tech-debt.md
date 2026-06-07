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

## Архивные сезоны как замороженная статика

- **Где:** `public/2022/`, `public/2022_2/`, `public/2023/`, `public/2024/`, `public/2025/` (2021 уже мигрирован — см. ниже)
- **Симптом:** Архивы прошлых сезонов лежат как замороженные HTML/CSS/JS в `public/`. Не используют Astro, не разделяют общий хедер/футер.
- **Почему отложено:** Это запланированный Phase 2 миграции (см. `CLAUDE.md`). В Phase 1 цель — только текущий сезон на Astro.
- **Как починить:** Создать `src/pages/[year]/index.astro` с динамическим маршрутом, контент архивов перенести в Content Collections. Соответствующие layouts — `Year{N}Layout.astro`.
- **Найдено:** 2026-06-04

## 2021 архив: set:html shortcut вместо порта в JSON+компоненты

- **Где:** `src/pages/2021/[...slug].astro`, `src/legacy/2021/*.body.html`, `src/layouts/Year2021Layout.astro`
- **Симптом:** Маршруты `/2021/*` инлайнят сохранённый `<body>` оригинального сайта через `set:html`. Контент не разбит на JSON, не использует shared-секции/Header/Footer/HistoryWidget — это намеренно. Year2021Layout — автономная HTML-оболочка, не наследует `BaseLayout`.
- **Почему отложено:** Полный порт в JSON+компоненты (как описано в `docs/superpowers/plans/2026-06-06-phase2-archive-2021-design.md`) — многочасовая ручная работа без визуальных гарантий. Corner-cut даёт pixel-perfect архив за час и не блокирует будущую правку HistoryWidget (виджет в архиве не показывается, но `ARCHIVE_YEARS` на современной части автоматом получит ссылку на /2021/).
- **Как починить:** Если когда-то понадобится редактировать контент 2021 через JSON или подключить shared Header — переписать архив по полному плану. Сейчас архив заморожен, дешевле оставить как есть.
- **Найдено:** 2026-06-07
