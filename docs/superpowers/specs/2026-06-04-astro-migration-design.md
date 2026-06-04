# Astro migration: ceramicfest

## Context

Сайт CeramicFest — статический промо-сайт фестиваля современной керамики «Млечный путь» (Калуга). Сейчас построен на Gulp + gulp-file-include + SCSS + ванильный JS. Каждый сезон живёт в отдельной git-ветке (`2021`, `2022`, ..., `2026`), архивы прошлых лет хранятся как замороженные независимые копии в `#src/2021/`–`#src/2025/` со своими CSS/JS/img/data.

Боли текущей модели:
1. **Подготовка нового сезона** — много правок в разных местах `#src/index.html` (333 строки): философия, СМИ, программа, партнёры, карта захардкожены прямо в HTML.
2. **Правки прошлых лет** — каждый архив автономен, плюс лежит в своей ветке. Опечатка в 2023 = переключение веток + правка зашитого HTML + сборка + ребейз.
3. **Виджет истории фестиваля устаревает** — при добавлении нового года нужно править его во всех архивах вручную, иначе старые годы не знают о новом.

Альтернативы рассматривались:
- **Остаться на Gulp с pre-build генератором фрагментов** — спек `2026-06-02-content-refactor-design.md` решает боль (1) и частично (3), но не убирает Gulp и ветвление по годам. Решение отвергнуто пользователем.
- **Next.js** — отвергнут как избыточный: React-рантайм (~85 KB gzip) на странице без интерактива деградирует Core Web Vitals; SSR/ISR/API routes выключены через `output: 'export'` и не используются; кривая обучения выше.
- **Astro** — выбрано. Генератор статики с компонентной DX, ноль клиентского JS по умолчанию, встроенный image pipeline, content collections с типизацией, динамические маршруты для архивов.

**Стратегическое направление:** единый репозиторий на ветке `main`, все годы рендерятся из общего кодбейза, контент каждого года описывается JSON-конфигом, виджет истории автогенерируется.

## Goals и Non-Goals

**Goals:**
- Уйти с Gulp на Astro (новый фундамент).
- Каждый сезон описывается одним JSON-файлом (`seasons/{year}.json`).
- Каждый сезон имеет свой Layout (визуальная идентичность сохраняется).
- Банк общих компонентов секций + папка для year-specific компонентов.
- Section registry: имя секции в JSON → компонент.
- HistoryWidget автоматически перечисляет все годы из `seasons/`.
- Подготовка нового сезона: правка одной константы (`CURRENT_SEASON`) + новый JSON + новый Layout + контент. Виджет истории и архивы — автоматически.
- Архивы (2021–2025) в Phase 1 живут в `public/` как замороженная статика — Phase 2 портирует их по одному в Astro.

**Non-Goals:**
- Не пишем backend, API, базу данных, админку.
- Не вводим CMS (Strapi, Sanity, Decap). Контент остаётся в файлах репозитория.
- Не используем React-острова (`client:load`) ради React. Интерактивный JS — ванильный.
- Не меняем визуальный дизайн 2026 — DOM-вывод секций должен соответствовать текущему.
- Не делаем i18n (русский остаётся единственным языком).
- Не настраиваем CI/CD на этом этапе.

## Архитектура высокого уровня

```
seasons/{year}.json  →  Section registry  →  Year{N}Layout  →  BaseLayout  →  HTML
                            │                     │
                       year-specific          per-year SCSS
                       + shared                    +
                                              styles/_base
```

1. Маршрут (страница) загружает JSON сезона.
2. По имени из `pages.{page}.sections[]` Section registry находит компонент — сначала в `year-specific/{year}/`, иначе в `shared/`.
3. Компонент получает `data` через props и рендерит HTML.
4. Страница оборачивается в `Year{N}Layout`, который extends `BaseLayout`.
5. `BaseLayout` содержит `<Header>` (с `<HistoryWidget>`) и `<Footer>`.
6. На выходе — статический HTML.

## Структура проекта

```
ceramicfest/
├── astro.config.mjs                  # конфиг Astro
├── package.json
├── tsconfig.json
├── public/                           # абсолютная статика, доступная по корню сайта
│   ├── favicon.ico
│   ├── img/                          # все изображения (members, partners, intro, photos, aboutus)
│   ├── fonts/                        # шрифты
│   └── 2021/                         # ВРЕМЕННО: архивы как статика (Phase 1)
│       └── (содержимое текущего #src/2021/ после gulp build)
│   ├── 2022/ ... 2025/
├── src/
│   ├── config.ts                     # CURRENT_SEASON = 2026
│   ├── content/
│   │   ├── config.ts                 # Zod-схема для seasons + members
│   │   ├── seasons/
│   │   │   └── 2026.json
│   │   └── members/
│   │       ├── all.json              # мастер-база всех участников (бывший members_all.json)
│   │       └── 2026.json             # участники сезона 2026
│   ├── layouts/
│   │   ├── BaseLayout.astro          # общий <html>/<head>/header/footer
│   │   └── Year2026Layout.astro      # обёртка вокруг BaseLayout + импорт styles/years/2026.scss
│   ├── components/
│   │   ├── Header.astro              # навигация + HistoryWidget
│   │   ├── Footer.astro
│   │   ├── HistoryWidget.astro       # автогенерация списка годов
│   │   ├── Popup.astro
│   │   └── sections/
│   │       ├── shared/               # БАНК ОБЩИХ КОМПОНЕНТОВ СЕКЦИЙ
│   │       │   ├── Intro.astro
│   │       │   ├── Philosophy.astro
│   │       │   ├── Media.astro
│   │       │   ├── Members.astro
│   │       │   ├── Program.astro
│   │       │   ├── Partners.astro
│   │       │   ├── Map.astro
│   │       │   ├── PhotoGallery.astro    # для /photos
│   │       │   ├── ReviewsList.astro     # для /reviews
│   │       │   └── MembersFull.astro     # для /team
│   │       └── year-specific/        # уникальные блоки конкретных годов (пусто в Phase 1)
│   │           └── .gitkeep
│   ├── lib/
│   │   ├── sections.ts               # resolveSection(year, name) → компонент
│   │   ├── members.ts                # split на main/additional
│   │   └── seasons.ts                # утилиты загрузки и валидации JSON
│   ├── styles/
│   │   ├── _base.scss                # reset, типографика, переменные общие
│   │   ├── _components.scss          # стили общих компонентов
│   │   ├── global.scss               # точка входа: импортирует _base + _components
│   │   └── years/
│   │       └── 2026.scss             # тема сезона 2026 (цвета, фоны, специфика)
│   ├── scripts/
│   │   └── client.ts                 # ванильный JS: попап участника, «показать остальных», history toggle
│   └── pages/
│       ├── index.astro               # /
│       ├── photos.astro              # /photos
│       ├── team.astro                # /team
│       └── reviews.astro             # /reviews
├── scripts/
│   └── img-convert.js                # переносим существующий скрипт (sharp + WebP)
└── dist/                             # output, .gitignore
```

**Удаляются:** `#src/`, `gulpfile.js`, все gulp-зависимости из `package.json`. **Удаляются в Phase 2 (по мере портирования):** `public/{year}/` — после миграции каждого архива в Astro.

## Слой данных: `content/seasons/{year}.json`

**Полная схема:**

```json
{
  "year": 2026,
  "title": "Вне Земли",
  "layout": "Year2026Layout",
  "pages": {
    "index": {
      "sections": ["intro", "philosophy", "media", "members", "program", "partners", "map"]
    },
    "photos":  { "sections": ["photoGallery"] },
    "team":    { "sections": ["membersFull"] },
    "reviews": { "sections": ["reviewsList"] }
  },
  "intro": {
    "title": "...",
    "subtitle": "...",
    "bgDesktop": "/img/intro/2026/desktop.webp",
    "bgMobile":  "/img/intro/2026/mobile.webp"
  },
  "philosophy": {
    "title": "Философия...",
    "paragraphs": ["...", "...", "..."]
  },
  "media": {
    "title": "Что пишут о нас в СМИ",
    "items": [
      { "url": "...", "logo": "/img/aboutus/vk.jpg", "alt": "..." }
    ]
  },
  "members": {
    "title": "Участники",
    "dataFile": "./members/2026.json",
    "previewCount": 3,
    "moreButtonLabel": "Показать остальных"
  },
  "program": {
    "title": "Программа фестиваля",
    "status": "placeholder",
    "placeholderText": "Программа будет объявлена..."
  },
  "partners": {
    "groups": [
      { "title": "Партнеры", "intro": "...", "items": [...] },
      { "title": "Информационные партнеры", "items": [...] }
    ]
  },
  "map": {
    "title": "Место проведения",
    "description": "...",
    "embedUrl": "https://yandex.ru/map-widget/v1/?um=..."
  },
  "photoGallery": {
    "categories": [
      { "label": "2026", "folder": "/img/photos/2026/", "thumbnails": [...] }
    ]
  },
  "reviewsList": {
    "items": [
      { "author": "...", "role": "...", "text": "...", "avatar": "/img/reviews/..." }
    ]
  },
  "membersFull": {
    "dataFile": "./members/2026.json",
    "mode": "full"
  }
}
```

**Управление составом страниц:** массив `pages.{page}.sections[]` определяет порядок и набор. Чтобы убрать блок — убрать строку. Чтобы добавить уникальный для года блок — добавить имя, создать соответствующий компонент в `components/sections/year-specific/{year}/`.

**Zod-схема** (`src/content/config.ts`) валидирует JSON при загрузке и даёт TS-автокомплит в `.astro` файлах. Обязательные поля: `year`, `title`, `layout`, `pages`. Все секционные блоки — optional (наличие проверяется только если секция упомянута в `sections[]`).

## Слой Layout

**`BaseLayout.astro`** — общий каркас:

```astro
---
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import Popup from '../components/Popup.astro';
import '../styles/global.scss';

interface Props { year: number; title: string; pageTitle?: string; }
const { year, title, pageTitle } = Astro.props;
---
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{pageTitle || `Фестиваль Млечный путь ${year}`}</title>
</head>
<body>
  <div class="wrapper">
    <Header year={year} />
    <main class="page"><slot /></main>
    <Footer />
  </div>
  <Popup />
  <script>
    import { initClient } from '../scripts/client';
    initClient();
  </script>
</body>
</html>
```

**`Year2026Layout.astro`** — обёртка с темой года:

```astro
---
import BaseLayout from './BaseLayout.astro';
import '../styles/years/2026.scss';

interface Props { year: number; title: string; pageTitle?: string; }
---
<BaseLayout {...Astro.props}>
  <slot />
</BaseLayout>
```

Каждый следующий год создаёт свой `Year{N}Layout.astro` по тому же шаблону. Импорт `styles/years/{N}.scss` — только в этом layout, поэтому стили года подгружаются **только на страницах этого года** (Astro делает per-page code splitting CSS).

## Component bank: shared + year-specific

**Общий банк** (`components/sections/shared/`) — компоненты, переиспользуемые между годами. Принимают `data` через props.

Пример `Philosophy.astro`:

```astro
---
interface Props { data: { title: string; paragraphs: string[] }; }
const { data } = Astro.props;
---
<section class="philosophy" id="philosophy">
  <div class="philosophy__container _container">
    <h2 class="philosophy__title">{data.title}</h2>
    <div class="philosophy__text">
      {data.paragraphs.map(p => <p>{p}</p>)}
    </div>
  </div>
</section>
```

**Year-specific** (`components/sections/year-specific/{year}/`) — компоненты, существующие только для одного года. В Phase 1 папка пустая, появляется по мере необходимости в Phase 2/3.

**Правило DRY-after-three:** если year-specific компонент копируется в третий год — он переезжает в `shared/`.

## Section registry

**`src/lib/sections.ts`** — карта `(year, sectionName) → ComponentType`:

```typescript
import Intro from '../components/sections/shared/Intro.astro';
import Philosophy from '../components/sections/shared/Philosophy.astro';
import Media from '../components/sections/shared/Media.astro';
import Members from '../components/sections/shared/Members.astro';
import Program from '../components/sections/shared/Program.astro';
import Partners from '../components/sections/shared/Partners.astro';
import Map from '../components/sections/shared/Map.astro';
import PhotoGallery from '../components/sections/shared/PhotoGallery.astro';
import MembersFull from '../components/sections/shared/MembersFull.astro';
import ReviewsList from '../components/sections/shared/ReviewsList.astro';

const sharedSections: Record<string, any> = {
  intro: Intro, philosophy: Philosophy, media: Media,
  members: Members, program: Program, partners: Partners, map: Map,
  photoGallery: PhotoGallery, membersFull: MembersFull, reviewsList: ReviewsList,
};

// Astro поддерживает eager glob-import — все year-specific компоненты загружаются на этапе билда:
const yearSpecific = import.meta.glob(
  '../components/sections/year-specific/*/*.astro',
  { eager: true }
);

export function resolveSection(year: string | number, name: string) {
  // 1) Year-specific имеет приоритет
  const ySKey = Object.keys(yearSpecific).find(
    k => k.includes(`/year-specific/${year}/`) && k.endsWith(`/${capitalize(name)}.astro`)
  );
  if (ySKey) return (yearSpecific[ySKey] as any).default;

  // 2) Общий банк
  if (sharedSections[name]) return sharedSections[name];

  // 3) Не найдено — кидаем понятную ошибку на этапе билда
  throw new Error(`Section "${name}" not found for year ${year}`);
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
```

Соглашение об именах: в `seasons/{year}.json` секция указывается `camelCase` (`photoGallery`), компонент назван `PascalCase` (`PhotoGallery.astro`).

## Routing: текущий сезон и архивы

**Текущий сезон** (Phase 1 — только это):

```astro
---
// src/pages/index.astro
import { CURRENT_SEASON } from '../config';
import { loadSeason } from '../lib/seasons';
import { resolveSection } from '../lib/sections';
import Year2026Layout from '../layouts/Year2026Layout.astro';

const season = await loadSeason(CURRENT_SEASON);
const sections = season.pages.index.sections;
---
<Year2026Layout year={season.year} title={season.title}>
  {sections.map(name => {
    const Section = resolveSection(season.year, name);
    const data = season[name];
    return <Section data={data} year={season.year} />;
  })}
</Year2026Layout>
```

Аналогично `pages/photos.astro`, `pages/team.astro`, `pages/reviews.astro` — отличаются только тем, какую страницу (`pages.photos.sections` etc) разворачивают.

**Архивные годы** (Phase 2 — добавляется позже):

```astro
---
// src/pages/[year]/index.astro
export async function getStaticPaths() {
  const allSeasons = import.meta.glob('../../content/seasons/*.json', { eager: true });
  const { CURRENT_SEASON } = await import('../../config');

  return Object.values(allSeasons)
    .map((s: any) => s.default)
    .filter(s => s.year !== CURRENT_SEASON)
    .map(season => ({ params: { year: String(season.year) }, props: { season } }));
}

const { season } = Astro.props;
const Layout = (await import(`../../layouts/Year${season.year}Layout.astro`)).default;
import { resolveSection } from '../../lib/sections';
---
<Layout year={season.year} title={season.title}>
  {season.pages.index.sections.map(name => {
    const Section = resolveSection(season.year, name);
    return <Section data={season[name]} year={season.year} />;
  })}
</Layout>
```

В Phase 1 этого файла **нет** — архивы 2021–2025 доступны через `public/{year}/` как замороженная статика.

## HistoryWidget

Автогенерирует список годов на основе содержимого `content/seasons/`:

```astro
---
// src/components/HistoryWidget.astro
import { CURRENT_SEASON } from '../config';

const seasons = import.meta.glob('../content/seasons/*.json', { eager: true });
const years = Object.values(seasons)
  .map((s: any) => s.default.year)
  .sort((a, b) => b - a);

const { currentYear } = Astro.props;
---
<nav class="history">
  {years.map(y => (
    y === currentYear
      ? <span class="history__current">{y}</span>
      : y === CURRENT_SEASON
        ? <a href="/" class="history__link">{y}</a>
        : <a href={`/${y}/`} class="history__link">{y}</a>
  ))}
  {/* В Phase 1 для архивов 2021–2025 рендерим прямые ссылки на /2021/, /2022/ — это public/ */}
</nav>
```

**Ключевое:** добавление `seasons/2027.json` автоматически добавляет пункт «2027» в виджет на всех страницах, включая архивы (в Phase 2, когда архивы тоже Astro). В Phase 1 архивы — статика в `public/`, и виджет в них **не обновляется автоматически** — это явный временный долг.

## Стили

- **`_base.scss`** — глобальное: reset, типографика, общие переменные (контейнер, точки брейкпоинтов, базовый шрифт).
- **`_components.scss`** — стили общих компонентов (`.philosophy`, `.members`, `.partners` etc).
- **`global.scss`** — точка входа, импортируется в `BaseLayout.astro`. Подключает `_base` + `_components`.
- **`styles/years/{year}.scss`** — тема года: цвет акцента, фоновые изображения интро, шрифт заголовков. Импортируется **только** в `Year{N}Layout.astro`. На странице 2021 загружается только `years/2021.scss`, не `years/2026.scss`.

**Правило приоритета:** глобальные переменные определяются только в `_base.scss` как defaults. Year-specific темы могут переопределять (через CSS custom properties или SCSS overrides).

Существующие SCSS из `#src/scss/` переносятся в новую структуру: `null.scss` → выкидывается (Astro делает свой reset через `global.scss`), `mixins.scss` → переезжает в `_base.scss`, `common.scss` → в `_components.scss`, `home.scss` → разбивается на стили секций внутри `_components.scss`, `header.scss`/`footer.scss`/`popup.scss` → в `_components.scss`, фичевые стили (`photos.scss`, `reviews.scss`, `team.scss`) — туда же.

## Картинки

**Phase 1: текущий пайплайн остаётся.** `scripts/img-convert.js` (Node + sharp) переносится в Astro-проект как есть. Команды `npm run img -- ./путь` работают. Фото лежат в `public/img/...` и подключаются обычным `<img src="/img/members/...">` в шаблонах.

**Phase 3 (опционально, не сейчас):** миграция на `astro:assets`. Компонент `<Image src={import('...')} />` оптимизирует на билде, генерирует множественные ширины и `<picture>` автоматически. Не делаем в Phase 1, чтобы не раздувать scope.

## Клиентский JS

Минимум интерактива: попап участника, кнопка «показать остальных», history toggle в header. Кладём в `src/scripts/client.ts`, подключаем одним блоком в `BaseLayout`:

```astro
<script>
  import { initClient } from '../scripts/client';
  initClient();
</script>
```

Astro сам бандлит, минифицирует, выдаёт один JS-файл на страницу. Вендорные библиотеки (Swiper, Slick, LightGallery, baguetteBox, Tippy и т.д.) **не переносим автоматически** — переносим только те, которые реально используются на 2026:
- LightGallery / baguetteBox — для `/photos`. Импортируем как npm-зависимости или подключаем со CDN.
- Остальные — выкидываем как мёртвый груз.

Аудит делается при имплементации Members/Photos.

## Сборка и деплой

```bash
npm install
npm run dev       # http://localhost:4321 с HMR
npm run build     # → dist/ (статика)
npm run preview   # локальный просмотр продакшн-билда
```

`dist/` — то же самое, что было папкой `ceramicfest/` в Gulp. Текущая инфра деплоя (статик-хостинг) работает без изменений. Папка `dist/` добавляется в `.gitignore`.

## Phasing

**Phase 1 (этот спек):** 
- Создать Astro-проект в репо (новая ветка `astro-migration`, в дальнейшем мерджится в `main`).
- Переписать **4 страницы текущего сезона 2026** на data-driven через `seasons/2026.json` + общие компоненты + `Year2026Layout`.
- Реализовать Section registry, BaseLayout, HistoryWidget.
- Архивы 2021–2025 копируются в `public/2021/`...`public/2025/` как замороженная статика (артефакты текущих `gulp build` для каждой ветки). Виджет истории в архивах **не обновляется** в Phase 1 — это явный временный долг, помечается комментарием в `HistoryWidget.astro`.
- Удалить `#src/`, `gulpfile.js`, gulp-зависимости.

**Phase 2 (по одному архиву):** 
- Для каждого года 2021–2025 — отдельный мини-проект:
  - Извлечь контент из его HTML в `content/seasons/{year}.json`.
  - Создать `Year{N}Layout.astro` со стилями того года (`styles/years/{N}.scss`).
  - При необходимости — компоненты в `components/sections/year-specific/{year}/`.
  - Добавить маршрут `[year]/index.astro` (один раз, обслуживает все архивные годы).
  - Удалить `public/{year}/` после миграции.
- После последнего архива виджет истории становится полностью автоматическим везде.

**Phase 3 (опционально):**
- Миграция на `astro:assets`.
- `@astrojs/sitemap`, OG-генерация, JSON-LD для structured data (SEO).
- Аудит вендорных библиотек.

## Сценарий: запуск сезона 2027 после Phase 1

1. `src/config.ts`: `CURRENT_SEASON = 2027`.
2. `cp src/content/seasons/2026.json src/content/seasons/2027.json`, отредактировать тексты/партнёров/программу.
3. `cp src/layouts/Year2026Layout.astro src/layouts/Year2027Layout.astro`, заменить импорт стилей.
4. `cp src/styles/years/2026.scss src/styles/years/2027.scss`, отредактировать тему.
5. Добавить новые изображения в `public/img/`, прогнать через `scripts/img-convert.js`.
6. `npm run build`, деплой.

Автоматически: 2026 становится архивом на `/2026/`, виджет истории показывает «2027» во всех годах (которые в Astro), главная отдаёт сезон 2027.

## Риски и митигация

- **Кривая входа Astro.** Пользователь не знает Astro. Митигация: в плане имплементации каждый шаг сопровождается объяснением синтаксиса `.astro`, JSX-выражений в шаблонах, props, slot.
- **Конфликты SCSS-переменных между годами.** Митигация: правило приоритета (defaults в `_base.scss`, year-overrides в `styles/years/*.scss`). Год-специфичные стили **не** утекают глобально — импорт только в Year-layout.
- **Year-specific компоненты, которые повторяются в третьем году.** Митигация: DRY-after-three rule — переезжают в `shared/` при третьем повторе.
- **Изменение схемы `seasons/{year}.json`.** Если через год потребуется новое обязательное поле — Zod ругнётся на старые архивы. Митигация: новые поля помечать optional с разумными defaults, либо мигрировать архивы при изменении схемы.
- **Архивы в Phase 1 не получают новый виджет истории.** Митигация: в `HistoryWidget.astro` помечен TODO с указанием Phase 2 как срок; в архивах виджет остаётся в исходном (захардкоженном) виде до миграции конкретного года.
- **Деплой-пайплайн.** Если деплой настроен на папку `ceramicfest/`, нужно либо переименовать `dist/` → `ceramicfest/` через `astro.config.mjs` (`outDir: 'ceramicfest'`), либо обновить деплой. Митигация: установить `outDir` в конфиге, чтобы output-путь не менялся.
- **Git-история.** Текущие ветки 2021–2026 остаются как теги/ветки на случай отката. Astro-миграция идёт в новой ветке `astro-migration`, которая мерджится в `main` после Phase 1.

## Verification (Phase 1)

1. **`npm run build`** проходит без ошибок, генерирует `dist/index.html`, `dist/photos/index.html`, `dist/team/index.html`, `dist/reviews/index.html`.
2. **Визуальный diff против текущего gulp-билда 2026:** сохраняем `ceramicfest/index.html` как baseline перед удалением Gulp, после Astro-билда диффим dist/ против baseline. Допустимы:
   - различия в порядке атрибутов;
   - whitespace;
   - комментированные блоки СМИ (намеренно выброшены).
   Недопустимо: потеря секций, ссылок, текстов.
3. **Архивы доступны:** `/2021/`, `/2022/`, `/2023/`, `/2024/`, `/2025/` открываются и показывают замороженный HTML из `public/`.
4. **Главная** `/` показывает сезон 2026.
5. **HistoryWidget** на главной 2026 содержит «2021», «2022», «2023», «2024», «2025», «2026»; «2026» помечен как текущий и не является ссылкой; остальные ведут на `/2021/`...`/2025/` (статика).
6. **Контентная правка:** меняем имя партнёра в `seasons/2026.json` → `npm run dev` пересобирает HMR → имя обновляется в браузере.
7. **Order правка:** убираем `"map"` из `pages.index.sections[]` → блок карты исчезает с главной.
8. **Section not found:** добавляем `"nonexistent"` в `sections[]` → билд падает с понятной ошибкой `Section "nonexistent" not found for year 2026`.
9. **Year-specific приоритет:** создаём `components/sections/year-specific/2026/Philosophy.astro` с маркером — главная использует его вместо `shared/Philosophy.astro`. Удаляем после проверки.
10. **CSS code splitting:** в `dist/2026.html` (если бы существовал) подгружается `years/2026.css`, на главной `/` подгружается тоже только `years/2026.css`. На страницах архивов (Phase 1 — `public/`) — их собственные CSS, не Astro-сборка.
11. **Интерактив:** попап участника, кнопка «показать остальных» работают.
12. **Сравнение Web Vitals:** Lighthouse-отчёт по `localhost:4321/` — LCP/CLS не хуже текущего gulp-билда.

## Branch и git

Phase 1 разработка ведётся в ветке `astro-migration`, созданной от `2026`. Ветка содержит и новый Astro-код, и удаляет старый Gulp-код. После приёмки — мерж в `main`. Старые ветки `2021`–`2026` остаются как исторические артефакты (можно конвертировать в теги после миграции архивов в Phase 2, чтобы не путали).

## Open questions (Phase 1)

Нет открытых вопросов на момент написания спека. Все архитектурные выборы зафиксированы.

## Next

Implementation plan — через writing-plans skill.
