# CeramicFest

## Project overview

Статический промо-сайт ежегодного Международного фестиваля современной керамики «Млечный путь» (г. Калуга). Сайт обновляется раз в год: под каждый сезон создаётся отдельная ветка git и обновляются контент, фото и программа.

Текущий сезон: **2026**, выставка «Вне Земли». Основная ветка: `main`.

**Страницы:**

| Файл | Назначение |
|---|---|
| `index.html` | Главная (философия, участники, программа, партнёры, карта) |
| `photos.html` | Фотогалерея |
| `reviews.html` | Отзывы |
| `team.html` | Участники/команда |

## Tech stack

| Слой | Технология |
|---|---|
| Шаблонизация | `gulp-file-include` — директива `@@include` для переиспользуемых фрагментов |
| Стили | SCSS → autoprefixer → group-media-queries → clean-css (минификация) |
| Скрипты | Ванильный JS + сторонние библиотеки → uglify-es |
| Изображения | Конвертация в WebP через `sharp` / `webp-converter`; `gulp-webp-html` и `gulp-webpcss` подставляют WebP-версии автоматически |
| Dev-сервер | BrowserSync с live-reload |
| Сборщик | Gulp |

**Сторонние JS-библиотеки** (в `#src/js/libs/`): Swiper, Slick, Isotope, LightGallery, baguetteBox, Tippy, Datepicker, noUiSlider, Typed, SmoothScroll и др.

## Commands

```bash
# Первый запуск (обязательно — нужна точная версия webp-converter)
npm i
npm install webp-converter@2.2.3 --save-dev

# Разработка — watch + BrowserSync
gulp

# Продакшн-сборка в папку ceramicfest/
gulp build

# Конвертация изображений в WebP (обязательно перед добавлением новых фото)
node scripts/img-convert.js ./путь/к/папке             # сохраняет рядом с оригиналами
node scripts/img-convert.js ./источник -o ./output     # в отдельную папку
node scripts/img-convert.js ./источник --width 1920    # с ограничением ширины
node scripts/img-convert.js ./источник --grayscale     # чёрно-белые WebP
# Или через npm:
npm run img -- ./путь/к/папке
npm run img:bw -- ./путь/к/папке
```

> **Важно:** все новые фото прогонять через `img-convert.js` до добавления в проект. Оригиналы (JPG/PNG/GIF/TIFF) после конвертации удалять. Качество WebP по умолчанию: 82. Папка `photos/` — staging для новых фотографий.

## Architecture

```
ceramicfest/          ← собранный сайт (output, не редактировать вручную)
#src/
  *.html              ← страницы (index, photos, reviews, team)
  _*.html             ← переиспользуемые фрагменты: _head, _header, _footer,
                         _popup, _icons, _js, _pagging
  scss/
    style.scss        ← точка входа, импортирует все модули
    null.scss         ← CSS reset
    mixins.scss       ← адаптивные миксины (adaptiv-value и др.)
    common.scss       ← общие стили (типография, контейнер, утилиты)
    home.scss         ← стили главной страницы
    header.scss, footer.scss, popup.scss, ...  ← компоненты
    photos.scss, reviews.scss, team.scss       ← стили страниц
  js/
    app.js            ← точка входа JS, подключает файлы из files/
    vendors.js        ← сборка сторонних библиотек из libs/
    files/            ← собственные модули: script.js, sliders.js,
                         forms.js, scroll.js, map.js, functions.js,
                         dynamic_adapt.js, regular.js
    libs/             ← сторонние библиотеки (не трогать)
  data/
    members.json      ← данные участников фестиваля
  img/                ← изображения (WebP)
    intro/2026/       ← фоновые изображения интро (desktop.webp, mobile.webp)
    members/          ← фото участников
    partners/, aboutus/, ...
  2021/ … 2024/       ← архивные версии прошлых сезонов
img-convert.js        ← скрипт конвертации изображений в WebP (Node.js + sharp)
gulpfile.js           ← конфигурация Gulp-пайплайна
```

**Данные участников** — `#src/data/members.json`, структура записи:
```json
{
  "id": 4,
  "name": "Имя Фамилия",
  "position": "",
  "photo": "./img/members/Фамилия.webp",
  "altText": "Имя Фамилия",
  "description": "Биография...",
  "additionalDescription": "Дополнительно..."
}
```

**Новый сезон** — создать ветку от `main`, обновить контент страниц, `members.json`, фото и программу. Ветки по годам: `2021`, `2022`, `2022_2`, `2023`, `2024`, `2025`, `2026`.
