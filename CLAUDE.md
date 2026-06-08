# CeramicFest

## Project overview

Статический промо-сайт ежегодного Международного фестиваля современной керамики «Млечный путь» (г. Калуга). Сайт обновляется раз в год: под каждый сезон создаётся отдельная ветка git и обновляются контент, фото и программа.

Текущий сезон: **2026**, выставка «Вне Земли». Основная ветка: `main`. Сайт мигрирован с Gulp на Astro: текущий сезон и архивы 2021–2025 (через `set:html` shortcut) живут в `main`.

**Деплой:** Vercel, production branch `main`. Конфиг авто-детект Astro: `npm run build` → `dist/`, никакого adapter'а — чистая статика.

**Страницы:**

| Маршрут | Назначение |
|---|---|
| `/` | Главная (философия, участники, программа, партнёры, карта) |
| `/photos` | Фотогалерея |
| `/reviews` | Отзывы |
| `/team` | Участники/команда |
| `/{year}/`, `/{year}/{photos,team,reviews}` | Архивы 2021–2025 (inline-HTML через `set:html`) |

## Tech stack

| Слой | Технология |
|---|---|
| Фреймворк | Astro 5 |
| Шаблонизация | `.astro` компоненты с TypeScript frontmatter |
| Стили | SCSS (через `src/styles/`) |
| Контент | JSON в `src/content/seasons/` и `src/content/members/`, Zod-валидация |
| Скрипты | Ванильный TypeScript в `src/scripts/client.ts` |
| Картинки | `scripts/img-convert.js` (sharp) — конвертация в WebP |
| Dev-сервер | Astro dev (`npm run dev`), HMR |

## Commands

```bash
npm install

npm run dev      # http://localhost:4321 с HMR
npm run build    # продакшн-билд → dist/
npm run preview  # локальный просмотр dist/
npm run check    # astro check (TS + .astro lint)

# Конвертация изображений в WebP (обязательно перед добавлением новых фото)
node scripts/img-convert.js ./путь/к/папке
node scripts/img-convert.js ./источник -o ./output
node scripts/img-convert.js ./источник --width 1920
node scripts/img-convert.js ./источник --grayscale
npm run img -- ./путь/к/папке
npm run img:bw -- ./путь/к/папке
```

> **Важно:** все новые фото прогонять через `scripts/img-convert.js` до добавления в проект. Оригиналы (JPG/PNG/GIF/TIFF) после конвертации удалять. Качество WebP по умолчанию: 82.

> **Case-sensitive имена файлов.** Деплой на Vercel (Linux, case-sensitive FS), локальная разработка на macOS (APFS, case-insensitive по умолчанию). Имена файлов в `public/` и пути в коде/JSON/HTML должны совпадать по регистру **байт-в-байт**. Локально расхождения не видны — на проде 404. Особенно касается кириллицы (`Андрианова.webp` ≠ `андрианова.webp`) и camelCase (`nikaTV.webp` ≠ `nikatv.webp`). Конвенция для архивов: фамилии участников/команды — Capitalized первая буква. Если меняешь регистр через `git mv` на macOS, делай в два шага через `.tmp`, иначе git не увидит разницы. Рекомендуется однократно: `git config core.ignorecase false` — git начнёт замечать такие изменения локально.

## Architecture

```
dist/                   ← собранный сайт (output astro build, не редактировать)
public/
  img/                  ← изображения (WebP), доступны как /img/...
  fonts/                ← шрифты
  favicon.png
  2021/ … 2025/         ← архивные ассеты (css/js/img/fonts/data) — HTML вынесены в src/legacy/
src/
  config.ts             ← CURRENT_SEASON = 2026, ARCHIVE_YEARS
  env.d.ts              ← типы Astro
  content/
    config.ts           ← Zod-схема коллекций
    seasons/2026.json   ← данные текущего сезона (секции, тексты, программа, партнёры)
    members/2026.json   ← участники текущего сезона
    members/all.json    ← мастер-база всех участников за все годы
  legacy/
    titles.json         ← мапа year × page → title для архивных страниц
    {year}/*.body.html  ← извлечённый <body> оригинального сайта; ссылки переписаны под Astro-маршруты
  layouts/
    BaseLayout.astro    ← общий каркас (Header, Footer, Popup, SCSS, client.ts)
    Year2026Layout.astro ← тема 2026
    ArchiveLayout.astro ← автономная HTML-оболочка для архивов (грузит /{slug}/css/style.min.css)
  components/
    Header.astro, Footer.astro, Popup.astro, HistoryWidget.astro
    sections/shared/    ← Intro, Philosophy, Media, Members, Program,
                           Partners, Map, PhotoGallery, MembersFull, ReviewsList
    sections/year-specific/{year}/ ← переопределения секций для конкретного года
  lib/
    seasons.ts          ← loadSeason(year)
    members.ts          ← loadMembersSplit(dataFile, previewCount)
    sections.ts         ← resolveSection(year, name) — section registry
  styles/
    global.scss         ← точка входа: импортирует _base и _components
    _base.scss          ← mixins, fonts, глобальные переменные, reset
    _components.scss    ← стили компонентов и страниц
    legacy/             ← перенесённые из старого Gulp-проекта SCSS-партиалы
    years/2026.scss     ← тема-акцент сезона 2026
  scripts/
    client.ts           ← ванильный JS: меню, участники toggle, history widget
  pages/
    index.astro         ← главная
    photos.astro
    team.astro
    reviews.astro
    [year]/[...slug].astro ← динамический маршрут архивов (set:html через ArchiveLayout)
scripts/img-convert.js  ← конвертация изображений (Node.js + sharp)
astro.config.mjs        ← конфиг Astro
```

**Данные участников:**
- `src/content/members/all.json` — мастер-база, все участники за все годы.
- `src/content/members/2026.json` — список участников текущего сезона.

Структура записи:
```json
{
  "id": 4,
  "name": "Имя Фамилия",
  "position": "",
  "photo": "/img/members/Фамилия.webp",
  "altText": "Имя Фамилия",
  "description": "Биография...",
  "additionalDescription": "Дополнительно..."
}
```

**Новый сезон** — создать ветку от `main`, обновить `CURRENT_SEASON` в `src/config.ts`, добавить `src/content/seasons/{year}.json`, `src/content/members/{year}.json`, фото в `public/img/`, создать `Year{N}Layout.astro` и `src/styles/years/{year}.scss`. Ветки по годам: `2021`, `2022`, `2022_2`, `2023`, `2024`, `2025`, `2026`.

**По окончании сезона** — добавить год в `ARCHIVE_YEARS` (`src/config.ts`), извлечь `<body>` свежесобранного сайта в `src/legacy/{year}/*.body.html` (см. формат соседних архивов: переписать `./img/` → `/{year}/img/`, `*.html` → `/{path}/`), добавить заголовки в `src/legacy/titles.json`. Маршруты `/{year}/*` появятся автоматически через `[year]/[...slug].astro`. Если планируется полный порт в JSON/компоненты — см. `docs/superpowers/plans/2026-06-06-phase2-archive-2021-design.md`.
