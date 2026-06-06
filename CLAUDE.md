# CeramicFest

## Project overview

Статический промо-сайт ежегодного Международного фестиваля современной керамики «Млечный путь» (г. Калуга). Сайт обновляется раз в год: под каждый сезон создаётся отдельная ветка git и обновляются контент, фото и программа.

Текущий сезон: **2026**, выставка «Вне Земли». Основная ветка: `main`.
Сайт мигрирован с Gulp на Astro (Phase 1 завершена в ветке `astro-migration`). Phase 2 — динамические маршруты для архивных сезонов.

**Страницы:**

| Маршрут | Назначение |
|---|---|
| `/` | Главная (философия, участники, программа, партнёры, карта) |
| `/photos` | Фотогалерея |
| `/reviews` | Отзывы |
| `/team` | Участники/команда |

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

## Architecture

```
dist/                   ← собранный сайт (output astro build, не редактировать)
public/
  img/                  ← изображения (WebP), доступны как /img/...
  fonts/                ← шрифты
  favicon.png
  2021/ … 2025/         ← архивные сезоны (замороженная статика)
src/
  config.ts             ← CURRENT_SEASON = 2026, ARCHIVE_YEARS
  env.d.ts              ← типы Astro
  content/
    config.ts           ← Zod-схема коллекций
    seasons/2026.json   ← данные текущего сезона (секции, тексты, программа, партнёры)
    members/2026.json   ← участники текущего сезона
    members/all.json    ← мастер-база всех участников за все годы
  layouts/
    BaseLayout.astro    ← общий каркас (Header, Footer, Popup, SCSS, client.ts)
    Year2026Layout.astro ← тема 2026
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

**Новый сезон** — создать ветку от `main`, обновить `src/content/seasons/{year}.json`, `src/content/members/{year}.json`, фото в `public/img/`, создать `Year{N}Layout.astro` и `src/styles/years/{year}.scss`. Ветки по годам: `2021`, `2022`, `2022_2`, `2023`, `2024`, `2025`, `2026`.

**Phase 2 (будущее)** — динамические маршруты для архивов (`src/pages/[year]/index.astro`), перенос `public/2021/`...`public/2025/` в content collections.
