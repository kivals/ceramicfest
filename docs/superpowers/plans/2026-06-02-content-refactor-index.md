# Content refactor (index.html) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести `#src/index.html` сезона 2026 на data-driven архитектуру: контент в `#src/data/seasons/2026.json`, секции — Mustache-шаблоны, pre-build скрипт генерирует фрагменты для `gulp-file-include`.

**Architecture:** Node-скрипт `scripts/build-content.js` читает `seasons/2026.json` + `members.json`, рендерит Mustache-шаблоны из `#src/sections/_*.html` в `#src/generated/2026/index/*.html`, и собирает `_sections.html` со списком `@@include`. Gulp получает новый task `content`, запускаемый перед `html` и при изменениях в `data/`, `sections/`, `years/`. Существующий gulp-file-include pipeline не меняется.

**Tech Stack:** Node.js, Mustache (logic-less шаблонизатор), Gulp, gulp-file-include, gulp-webp-html. Без новых рантайм-зависимостей в браузере (наоборот — убираем клиентский fetch участников).

**Спек:** `docs/superpowers/specs/2026-06-02-content-refactor-design.md`

**Контекст для исполнителя:**
- Корень проекта — `/Users/kivals/code/ceramicfest`.
- Активная ветка — `2026`. Все коммиты идут в неё.
- Папка исходников — `#src/` (литеральная решётка в имени, требует кавычек в shell).
- Папка билда — `ceramicfest/` (генерируется gulp, в `.gitignore`).
- В проекте нет тест-фреймворка. Верификация — запуск `gulp build` и сверка с baseline.

---

## File Structure

**Создаются (новые):**
- `scripts/build-content.js` — pre-build генератор.
- `#src/sections/_intro.html`, `_philosophy.html`, `_media.html`, `_members.html`, `_program.html`, `_partners.html`, `_map.html` — Mustache-шаблоны секций.
- `#src/data/seasons/2026.json` — данные сезона.
- `#src/years/2026/extras/.gitkeep` — заготовка для escape hatch.
- `docs/superpowers/plans/baselines/2026-pre-refactor-index.html` — снапшот текущего билда для diff-сравнения.

**Модифицируются:**
- `#src/index.html` — оркестратор: только `@@include` секций.
- `gulpfile.js` — task `content`, путь `json` фикс (сейчас игнорирует подпапку `seasons/`), watch на `sections/` и `years/`.
- `#src/js/files/script.js` — убрать `initMembers()` и `loadData()`.
- `.gitignore` — добавить `#src/generated/`.
- `package.json` — добавить зависимость `mustache`.

**Не трогаются:**
- Архивы `#src/2021/`–`#src/2025/`.
- `photos.html`, `reviews.html`, `team.html`.
- `#src/data/members.json`, `members_all.json`.
- Все SCSS.

---

## Task 1: Snapshot baseline и установка зависимостей

**Files:**
- Create: `docs/superpowers/plans/baselines/2026-pre-refactor-index.html`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Собрать текущий билд и сохранить baseline**

```bash
cd /Users/kivals/code/ceramicfest
npx gulp build
mkdir -p docs/superpowers/plans/baselines
cp ceramicfest/index.html docs/superpowers/plans/baselines/2026-pre-refactor-index.html
```

Expected: `ceramicfest/index.html` создан, baseline-копия сохранена. Откроется в браузере: интро, философия, СМИ, участники (через JS), программа-заглушка, партнёры, карта.

- [ ] **Step 2: Установить mustache**

```bash
npm install --save-dev mustache
```

Expected: `package.json` содержит `"mustache"` в `devDependencies`, версия 4.x.

- [ ] **Step 3: Добавить generated/ в .gitignore**

Read `.gitignore`, добавить строку (если её нет):

```
#src/generated/
```

- [ ] **Step 4: Создать пустые директории-заготовки**

```bash
mkdir -p "#src/sections" "#src/data/seasons" "#src/years/2026/extras" scripts
touch "#src/years/2026/extras/.gitkeep"
```

- [ ] **Step 5: Закоммитить**

```bash
git add docs/superpowers/plans/baselines/ package.json package-lock.json .gitignore "#src/years/2026/extras/.gitkeep"
git commit -m "refactor(content): baseline snapshot + mustache + dir scaffold"
```

---

## Task 2: build-content.js — каркас и custom-prefix

**Files:**
- Create: `scripts/build-content.js`
- Test: `node scripts/build-content.js --year 2026` (smoke)

- [ ] **Step 1: Написать каркас build-content.js**

Содержимое `scripts/build-content.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const SRC = path.join(__dirname, '..', '#src');
const SECTIONS_DIR = path.join(SRC, 'sections');
const DATA_DIR = path.join(SRC, 'data');
const YEARS_DIR = path.join(SRC, 'years');
const GENERATED_DIR = path.join(SRC, 'generated');

function parseArgs() {
  const args = process.argv.slice(2);
  const yearIdx = args.indexOf('--year');
  const year = yearIdx >= 0 ? args[yearIdx + 1] : '2026';
  return { year };
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function loadSeason(year) {
  const file = path.join(DATA_DIR, 'seasons', `${year}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function renderSection(sectionName, season, year) {
  const tplPath = path.join(SECTIONS_DIR, `_${sectionName}.html`);
  const tpl = fs.readFileSync(tplPath, 'utf8');

  // Для секции members подмешиваем данные из members.json
  let context = season[sectionName] || {};
  if (sectionName === 'members' && context.dataFile) {
    const membersPath = path.join(SRC, context.dataFile.replace(/^\.\//, ''));
    const membersData = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    context = { ...context, ...membersData };
  }

  return Mustache.render(tpl, context);
}

function buildPage(year, pageName, sections) {
  const pageDir = path.join(GENERATED_DIR, year, pageName);
  ensureDir(pageDir);

  const includes = [];
  for (const entry of sections) {
    if (entry.startsWith('custom:')) {
      const customName = entry.slice('custom:'.length);
      includes.push(`@@include('../years/${year}/extras/${customName}.html')`);
      continue;
    }
    const html = renderSection(entry, loadSeason(year), year);
    fs.writeFileSync(path.join(pageDir, `${entry}.html`), html);
    includes.push(`@@include('generated/${year}/${pageName}/${entry}.html')`);
  }

  fs.writeFileSync(
    path.join(pageDir, '_sections.html'),
    includes.join('\n') + '\n'
  );
}

function main() {
  const { year } = parseArgs();
  const season = loadSeason(year);
  const pages = season.pages || {};
  for (const [pageName, pageCfg] of Object.entries(pages)) {
    buildPage(year, pageName, pageCfg.sections || []);
  }
  console.log(`[build-content] year=${year} pages=${Object.keys(pages).join(',')} done`);
}

main();
```

- [ ] **Step 2: Проверить, что скрипт падает с понятной ошибкой без данных**

```bash
node scripts/build-content.js --year 2026
```

Expected: ENOENT с указанием на отсутствие `#src/data/seasons/2026.json`. Это норма — данные создадим в Task 4.

- [ ] **Step 3: Закоммитить**

```bash
git add scripts/build-content.js
git commit -m "refactor(content): add build-content.js (mustache renderer)"
```

---

## Task 3: Подключить content task в gulpfile

**Files:**
- Modify: `gulpfile.js`

- [ ] **Step 1: Добавить task `content` и подключить его в pipeline**

Изменения в `gulpfile.js`:

В блок `let path = { ... watch: { ... } }` (строка ~50) добавить наблюдатели:
```javascript
watch: {
  html: src_folder + "/**/*.html",
  js: src_folder + "/**/*.js",
  css: src_folder + "/scss/**/*.scss",
  images: src_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
  json: src_folder + "/data/**/*.json",
  content: [
    src_folder + "/data/**/*.json",
    src_folder + "/sections/**/*.html",
    src_folder + "/years/**/*.html",
    "scripts/build-content.js"
  ]
},
```

(`json` тоже расширяем на `**/*.json`, чтобы видеть `seasons/2026.json` в подпапке.)

После функции `cb()` (≈строка 208) добавить:

```javascript
function content(done) {
  const { spawnSync } = require('child_process');
  const result = spawnSync('node', ['scripts/build-content.js', '--year', '2026'], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    return done(new Error('build-content.js failed'));
  }
  done();
}
```

В функцию `watchFiles()` (≈строка 212) добавить строку:

```javascript
gulp.watch(path.watch.content, gulp.series(content, html));
```

В сборку `build` (≈строка 219) включить `content` **перед** `html`:

```javascript
let build = gulp.series(
  clean,
  fonts_otf,
  content,
  gulp.parallel(html, css, js, json, favicon, images, videos),
  fonts,
  gulp.parallel(fontstyle)
);
```

В блок `exports.*` добавить:

```javascript
exports.content = content;
```

Также модифицировать функцию `json()` чтобы захватывать вложенный `seasons/`:

В блоке `path.src` найти `json: src_folder + "/data/*.*"` и заменить на:
```javascript
json: src_folder + "/data/**/*.json",
```

- [ ] **Step 2: Проверить, что gulp content падает на отсутствующих данных**

```bash
npx gulp content
```

Expected: gulp выводит ошибку `build-content.js failed`, stderr содержит ENOENT по `seasons/2026.json`. Норма — данные в Task 4.

- [ ] **Step 3: Закоммитить**

```bash
git add gulpfile.js
git commit -m "refactor(content): wire content task into gulp build + watch"
```

---

## Task 4: Создать seasons/2026.json с извлечённым контентом

**Files:**
- Create: `#src/data/seasons/2026.json`

- [ ] **Step 1: Создать файл со всеми блоками текущего index.html**

Содержимое `#src/data/seasons/2026.json`:

```json
{
  "year": 2026,
  "title": "Вне Земли",
  "pages": {
    "index": {
      "sections": [
        "intro",
        "philosophy",
        "media",
        "members",
        "program",
        "partners",
        "map"
      ]
    }
  },
  "intro": {},
  "philosophy": {
    "title": "Философия Международного фестиваля современной керамики «Млечный путь 2026». Выставка «Вне Земли»",
    "paragraphs": [
      "Философия фестиваля современной керамики «Млечный путь» в 2026 году основана на идее исследования границ человеческого творчества и восприятия мира через призму космоса, технологий и новых форм выражения, объединение керамики с темами межпланетных пространств, футуризма и взаимодействия человека с Космосом.",
      "Космос, как источник вдохновения. Керамика становится инструментом для визуализации космических образов, галактик, планет и других внеземных объектов. Работы участников отражают красоту и загадочность Вселенной, её бесконечность и многогранность.",
      "Космос, как источник трансформации и эволюции. Керамика как материал, подверженный изменениям в процессе создания (от глины до готового изделия), символизирует эволюцию идей и форм.",
      "Космос и Человечество. Тема «Вне Земли» открывает возможности для размышлений о месте человека во Вселенной, его связи с космосом и возможных сценариях жизни на других планетах.",
      "Такая философия подчеркивает современный характер фестиваля, его ориентацию на будущее и стремление преодолеть границы привычного восприятия керамики."
    ]
  },
  "media": {
    "title": "Что пишут о нас в СМИ",
    "items": [
      { "url": "https://vk.com/wall-218843344_775", "logo": "./img/aboutus/vk.jpg", "alt": "Млечный путь. VK" },
      { "url": "https://vk.com/wall-204533248_536", "logo": "./img/aboutus/vk.jpg", "alt": "Млечный путь. VK" },
      { "url": "https://nikatv.ru/tv/programs/novosti/AkCIqkzqxbeapaMdkM4i", "logo": "./img/aboutus/nikaTV.webp", "alt": "nikaTV" },
      { "url": "https://nedelya40.ru/tajny-kosmosa-i-sekrety-masterstva_260768/", "logo": "./img/aboutus/nedelya40.png", "alt": "неделя 40" },
      { "url": "https://gtrk-kaluga.ru/news/kultura/news-55283", "logo": "./img/aboutus/gtrk-russia.png", "alt": "Россия гтрк Калуга" },
      { "url": "http://gtrk-kaluga.ru/otkrytaya-studiya/audio-10702", "logo": "./img/aboutus/gtrk-russia.png", "alt": "Россия гтрк Калуга" }
    ]
  },
  "members": {
    "title": "Участники",
    "dataFile": "./data/members.json",
    "previewCount": 3,
    "moreButtonLabel": "Показать остальных"
  },
  "program": {
    "title": "Программа фестиваля",
    "status": "placeholder",
    "placeholderText": "Программа будет объявлена ближе к началу фестиваля.<br>Следите за обновлениями!"
  },
  "partners": {
    "groups": [
      {
        "title": "Партнеры",
        "intro": "Если вы хотите стать партнером фестиваля, свяжитесь с нами, мы обсудим детали.",
        "items": [
          { "logo": "./img/partners/13.png", "alt": "Танцевальная лаборатория Текст" },
          { "logo": "./img/partners/11.png", "alt": "Suhl гостиница" },
          { "logo": "./img/partners/12.png", "alt": "Инновационный театр балета" }
        ]
      },
      {
        "title": "Информационные партнеры",
        "items": [
          { "logo": "./img/partners/14.png", "alt": "Ника ТВ" },
          { "logo": "./img/partners/15.png", "alt": "Калужская неделя" },
          { "logo": "./img/partners/16.png", "alt": "Калужские губернские ведомости" },
          { "logo": "./img/partners/17.png", "alt": "Весть news" },
          { "logo": "./img/partners/18.png", "alt": "Твоя Калуга" },
          { "logo": "./img/partners/19.png", "alt": "Что Где Калуга" },
          { "logo": "./img/partners/27.png", "alt": "ГТРК Калуга" }
        ]
      }
    ]
  },
  "map": {
    "title": "Место проведения",
    "description": "ИКЦ — это современная многофункциональная площадка в Калуге, на которой регулярно проходят выставки, перформансы, спектакли, лекции, концерты и мастер-классы от экспертов в разных областях науки, культуры и искусства, ориентированные на широкую аудиторию.",
    "embedUrl": "https://yandex.ru/map-widget/v1/?um=constructor%3A2d908f740c698c42aa82662d371edc747f1f12a1d4a6412513dad9121f2b77b5&source=constructor"
  }
}
```

- [ ] **Step 2: Проверить, что build-content.js теперь падает на отсутствующих шаблонах (а не данных)**

```bash
node scripts/build-content.js --year 2026
```

Expected: ENOENT по `#src/sections/_intro.html` (или первой секции). Это значит, JSON прочитан и скрипт дошёл до рендеринга.

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/data/seasons/2026.json"
git commit -m "refactor(content): extract index.html content into seasons/2026.json"
```

---

## Task 5: Шаблон секции _intro.html

**Files:**
- Create: `#src/sections/_intro.html`

- [ ] **Step 1: Написать шаблон**

Содержимое `#src/sections/_intro.html`:

```html
<section class="intro">
	<div class="intro__container _container">
	</div>
</section>
```

Тег div пустой — фоновое изображение интро задаётся CSS. Будущие сезоны могут добавить заголовок/подзаголовок и расширить шаблон.

- [ ] **Step 2: Проверить рендер**

```bash
node scripts/build-content.js --year 2026
```

Expected: на этот раз скрипт упадёт уже на следующей секции (`_philosophy.html`), а файл `#src/generated/2026/index/intro.html` создан и побайтово равен шаблону.

```bash
cat "#src/generated/2026/index/intro.html"
```

Expected: вывод как в шаблоне (без замен — данных в `intro: {}` нет).

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/sections/_intro.html"
git commit -m "refactor(content): add _intro.html section template"
```

---

## Task 6: Шаблон секции _philosophy.html

**Files:**
- Create: `#src/sections/_philosophy.html`

- [ ] **Step 1: Написать шаблон**

Содержимое `#src/sections/_philosophy.html`:

```html
<section class="philosophy" id="philosophy">
	<div class="philosophy__container _container">
		<h2 class="philosophy__title">{{title}}</h2>
		<div class="philosophy__text">
			{{#paragraphs}}
			<p>{{.}}</p>
			{{/paragraphs}}
		</div>
	</div>
</section>
<section class="divider">
	<div class="divider__container _container">
		<div class="divider__line"></div>
	</div>
</section>
```

(Divider после философии — часть исходного потока в текущем index.html, переносим внутрь шаблона.)

- [ ] **Step 2: Проверить рендер**

```bash
node scripts/build-content.js --year 2026
```

Expected: упадёт на `_media.html`, файл `#src/generated/2026/index/philosophy.html` создан, содержит 5 абзацев и заголовок «Философия Международного...».

```bash
grep -c "<p>" "#src/generated/2026/index/philosophy.html"
```

Expected: `5`.

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/sections/_philosophy.html"
git commit -m "refactor(content): add _philosophy.html section template"
```

---

## Task 7: Шаблон секции _media.html (aboutus)

**Files:**
- Create: `#src/sections/_media.html`

- [ ] **Step 1: Написать шаблон**

Содержимое `#src/sections/_media.html`:

```html
<section class="aboutus">
	<div class="aboutus__container _container">
		<h3 class="aboutus__title title">{{title}}</h3>
		<div class="aboutus__content">
			{{#items}}
			<a href="{{url}}" class="aboutus__smi" target="_blank" rel="noopener">
				<img src="{{logo}}" alt="{{alt}}">
			</a>
			{{/items}}
		</div>
	</div>
</section>
```

- [ ] **Step 2: Проверить рендер**

```bash
node scripts/build-content.js --year 2026
grep -c "aboutus__smi" "#src/generated/2026/index/media.html"
```

Expected: `6` (по числу активных СМИ в JSON; все закомментированные исторические записи отброшены — это намеренно).

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/sections/_media.html"
git commit -m "refactor(content): add _media.html section template"
```

---

## Task 8: Шаблон секции _members.html

**Files:**
- Create: `#src/sections/_members.html`

Логика: рендеримся серверно, не на клиенте. Mustache получит `members[]` из `data/members.json` (подмешано в build-content.js). Шаблон делит на main (первые `previewCount`) и additional (остальные).

Mustache logic-less — нельзя сделать «первые 3, остальные потом» прямым синтаксисом. Решение: добавить в build-content.js шаг pre-split списка участников на `mainMembers` и `additionalMembers` перед рендерингом. Изменение делаем в этой же задаче.

- [ ] **Step 1: Доработать build-content.js — pre-split участников**

В `scripts/build-content.js` найти блок:

```javascript
  if (sectionName === 'members' && context.dataFile) {
    const membersPath = path.join(SRC, context.dataFile.replace(/^\.\//, ''));
    const membersData = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    context = { ...context, ...membersData };
  }
```

Заменить на:

```javascript
  if (sectionName === 'members' && context.dataFile) {
    const membersPath = path.join(SRC, context.dataFile.replace(/^\.\//, ''));
    const membersData = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    const all = membersData.members || [];
    const previewCount = context.previewCount || 3;
    context = {
      ...context,
      mainMembers: all.slice(0, previewCount),
      additionalMembers: all.slice(previewCount)
    };
  }
```

- [ ] **Step 2: Написать шаблон**

Содержимое `#src/sections/_members.html`:

```html
<section class="members" id="members">
	<div class="members__container _container">
		<div class="members__body">
			<h3 class="members__title title">{{title}}</h3>
			<div class="members__list">
				<div class="members__part members__part_main">
					{{#mainMembers}}
					<div class="members__item item-member">
						<div class="item-member__body">
							<div class="item-member__header">
								<div class="item-member__name">{{name}}</div>
								<div class="item-member__position"></div>
							</div>
							<div class="item-member__photo _ibg">
								<img src="{{photo}}" alt="{{altText}}">
							</div>
							<div class="item-member__description description-member">
								<div class="description-member__part">{{description}}</div>
								<div class="description-member__part description-member__part_hide">{{additionalDescription}}</div>
							</div>
							<div class="item-member__footer">
								<button class="item-member__expand _icon-expand-arrow"></button>
							</div>
						</div>
					</div>
					{{/mainMembers}}
				</div>
				<div class="members__part members__part_additional">
					{{#additionalMembers}}
					<div class="members__item item-member">
						<div class="item-member__body">
							<div class="item-member__header">
								<div class="item-member__name">{{name}}</div>
								<div class="item-member__position"></div>
							</div>
							<div class="item-member__photo _ibg">
								<img src="{{photo}}" alt="{{altText}}">
							</div>
							<div class="item-member__description description-member">
								<div class="description-member__part">{{description}}</div>
								<div class="description-member__part description-member__part_hide">{{additionalDescription}}</div>
							</div>
							<div class="item-member__footer">
								<button class="item-member__expand _icon-expand-arrow"></button>
							</div>
						</div>
					</div>
					{{/additionalMembers}}
				</div>
			</div>
			<button class="members__show-more btn">{{moreButtonLabel}}</button>
		</div>
	</div>
</section>
```

Важно: класс `_ibg` имеется в текущем рендере JS (`./js/files/script.js:114`), сохраняем.

- [ ] **Step 3: Проверить рендер**

```bash
node scripts/build-content.js --year 2026
```

Expected: упадёт уже на `_program.html`. Файл `#src/generated/2026/index/members.html` создан.

```bash
grep -c "members__item" "#src/generated/2026/index/members.html"
```

Expected: `39` (количество участников в `members.json` — Phase 1 проверь актуальное число через `node -e "console.log(require('./#src/data/members.json').members.length)"`).

- [ ] **Step 4: Закоммитить**

```bash
git add scripts/build-content.js "#src/sections/_members.html"
git commit -m "refactor(content): add _members.html template + members split logic"
```

---

## Task 9: Шаблон секции _program.html

**Files:**
- Create: `#src/sections/_program.html`

Шаблон поддерживает два режима: `placeholder` (текущее состояние) и `announced` (полный список дней — будет использован позже). Mustache logic-less: проверяем через `{{#placeholderText}}` и `{{#days}}`.

- [ ] **Step 1: Написать шаблон**

Содержимое `#src/sections/_program.html`:

```html
<section class="program" id="program">
	<div class="program-modal _hide">
		<span class="program-modal__close">×</span>
	</div>
	<div class="program__container _container">
		<h2 class="program__title title">{{title}}</h2>
		<div class="program__body">
			{{#placeholderText}}
			<div class="program__billboard billboard">
				<div class="billboard__content">
					<div class="billboard__program">
						<p>{{{.}}}</p>
					</div>
				</div>
			</div>
			{{/placeholderText}}
			{{#days}}
			<div class="program__billboard billboard">
				<div class="billboard__header">
					<div class="billboard__date">{{date}}</div>
					{{#location}}<div class="billboard__title">Локация: {{.}}</div>{{/location}}
				</div>
				<div class="billboard__content">
					<div class="billboard__program">
						{{#events}}
						<p>{{{html}}}</p>
						{{/events}}
					</div>
				</div>
			</div>
			{{/days}}
		</div>
	</div>
</section>
```

Тройные фигурные `{{{.}}}` и `{{{html}}}` — чтобы HTML-теги (`<br>`, `<b>`, `<a>`) не экранировались. Это намеренно: тексты программы содержат разметку.

- [ ] **Step 2: Проверить рендер**

```bash
node scripts/build-content.js --year 2026
grep "Программа будет объявлена" "#src/generated/2026/index/program.html"
```

Expected: строка найдена; `<br>` присутствует не как `&lt;br&gt;` а как `<br>`.

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/sections/_program.html"
git commit -m "refactor(content): add _program.html (placeholder + announced modes)"
```

---

## Task 10: Шаблон секции _partners.html

**Files:**
- Create: `#src/sections/_partners.html`

Между группами партнёров в исходнике есть `<section class="divider">` — переносим внутрь шаблона как разделитель «после каждой группы кроме последней». В Mustache это делается через массив с флагом `last`, проставленным на этапе build-content.js, либо проще — divider перед каждой группой кроме первой. Делаем второй вариант: в build-content проставляем `notFirst: true` всем группам кроме первой.

- [ ] **Step 1: Доработать build-content.js — флаг notFirst**

В `renderSection` после блока members добавить аналогичный pre-process для partners. Изменения в той же функции:

```javascript
  if (sectionName === 'partners' && Array.isArray(context.groups)) {
    context = {
      ...context,
      groups: context.groups.map((g, i) => ({ ...g, notFirst: i > 0 }))
    };
  }
```

- [ ] **Step 2: Написать шаблон**

Содержимое `#src/sections/_partners.html`:

```html
<section class="partners" id="partners">
	<div class="partners__container _container">
		{{#groups}}
		{{#notFirst}}
		<section class="divider">
			<div class="divider__container _container">
				<div class="divider__line"></div>
			</div>
		</section>
		{{/notFirst}}
		<div class="partners__item item-partners">
			<h3 class="item-partners__title title">{{title}}</h3>
			{{#intro}}<div class="item-partners__intro">{{.}}</div>{{/intro}}
			<div class="item-partners__logos">
				{{#items}}
				<div class="item-partners__image">
					<img src="{{logo}}" alt="{{alt}}">
				</div>
				{{/items}}
			</div>
		</div>
		{{/groups}}
	</div>
</section>
```

- [ ] **Step 3: Проверить рендер**

```bash
node scripts/build-content.js --year 2026
grep -c "item-partners__image" "#src/generated/2026/index/partners.html"
```

Expected: `10` (3 в первой группе + 7 во второй).

```bash
grep -c "divider__line" "#src/generated/2026/index/partners.html"
```

Expected: `1` (между группами).

- [ ] **Step 4: Закоммитить**

```bash
git add scripts/build-content.js "#src/sections/_partners.html"
git commit -m "refactor(content): add _partners.html template + group divider logic"
```

---

## Task 11: Шаблон секции _map.html

**Files:**
- Create: `#src/sections/_map.html`

- [ ] **Step 1: Написать шаблон**

Содержимое `#src/sections/_map.html`:

```html
<section class="map" id="map">
	<div class="map__container _container">
		<h3 class="map__title title">{{title}}</h3>
		<div class="map__description">{{description}}</div>
		<iframe class="map__dest" src="{{embedUrl}}" frameborder="2"></iframe>
	</div>
</section>
```

- [ ] **Step 2: Проверить полный рендер**

Теперь все 7 шаблонов на месте, build должен пройти без ошибок:

```bash
node scripts/build-content.js --year 2026
```

Expected: `[build-content] year=2026 pages=index done`.

```bash
ls "#src/generated/2026/index/"
```

Expected:
```
_sections.html
intro.html
map.html
media.html
members.html
partners.html
philosophy.html
program.html
```

```bash
cat "#src/generated/2026/index/_sections.html"
```

Expected: 7 строк `@@include('generated/2026/index/...')` в порядке `sections[]` из JSON.

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/sections/_map.html"
git commit -m "refactor(content): add _map.html section template"
```

---

## Task 12: Переписать index.html на оркестратор

**Files:**
- Modify: `#src/index.html`

- [ ] **Step 1: Заменить содержимое index.html**

Полностью переписать `#src/index.html` (был 333 строки → станет ~15):

```html
<!DOCTYPE html>
<html lang="ru">
	@@include('_head.html',{
	"title":"Фестиваль Млечный путь"
	})
	<body>
		<div class="wrapper">
			@@include('_header.html',{})
			<main class="page">
				@@include('generated/2026/index/_sections.html')
			</main>
			@@include('_footer.html',{})
		</div>
		@@include('_popup.html',{})
		@@include('_js.html',{})
	</body>
</html>
```

- [ ] **Step 2: Собрать и сверить с baseline**

```bash
npx gulp build
```

Expected: build проходит без ошибок, `ceramicfest/index.html` создан.

Diff с baseline (игнорируя whitespace):

```bash
diff -w -B docs/superpowers/plans/baselines/2026-pre-refactor-index.html ceramicfest/index.html | head -100
```

Expected: различия минимальные — могут быть:
- порядок атрибутов в `<img>` (gulp-webp-html может перестроить);
- закомментированные блоки СМИ отсутствуют в новой версии (это ОК — мы намеренно их выбросили);
- участники присутствуют сразу в HTML (вместо пустых `members__part`) — это ОК, серверный рендер.

Не должно быть:
- пропавших секций или классов;
- пустых текстов где были осмысленные;
- битых ссылок партнёров/СМИ.

- [ ] **Step 3: Проверить визуально через BrowserSync**

```bash
npx gulp
```

Открыть `http://localhost:3000`. Прокликать:
- все секции на месте и выглядят как раньше;
- кнопка «Показать остальных» раскрывает дополнительных участников;
- клик по стрелке на карточке участника раскрывает доп. описание;
- iframe карты грузится;
- ссылки СМИ и партнёров кликабельны.

Stop gulp (Ctrl+C).

- [ ] **Step 4: Закоммитить**

```bash
git add "#src/index.html"
git commit -m "refactor(content): rewrite index.html as section orchestrator"
```

---

## Task 13: Убрать клиентский рендеринг участников из script.js

**Files:**
- Modify: `#src/js/files/script.js`

После Task 12 участники уже в HTML. Клиентский `initMembers()` и `loadData()` теперь либо ничего не делают (если в DOM нет пустых `.members__part_main`), либо дублируют карточки. В любом случае — мёртвый код, убираем.

- [ ] **Step 1: Удалить функции initMembers, loadData, renderMembersCard**

В `#src/js/files/script.js`:

- Удалить вызов `initMembers();` из функции `ready()` (строка 4).
- Удалить функции `initMembers` (строки 67–83), `loadData` (строки 90–99), `renderMembersCard` (строки 106–127).

Финальный `script.js` сохраняет всю остальную логику (`documentActions`, обработка попапа программы, обработка `_active` у menu-link, раскрытие доп. описания, кнопка «Показать остальных» — она остаётся, поскольку доп. участники отрендерены, но скрыты CSS-классом).

- [ ] **Step 2: Пересобрать и проверить**

```bash
npx gulp build
npx gulp
```

Открыть `http://localhost:3000`. Проверить:
- участники грузятся БЕЗ flash (мгновенно, не появляются после JS);
- кнопка «Показать остальных» по-прежнему работает (раскрывает `.members__part_additional`);
- разворачивание доп. описания участника по стрелке работает;
- консоль браузера без ошибок (особенно — нет fetch к `data/members.json`, проверь в Network tab).

Stop gulp.

- [ ] **Step 3: Закоммитить**

```bash
git add "#src/js/files/script.js"
git commit -m "refactor(content): remove client-side members rendering (now server-side)"
```

---

## Task 14: Финальная верификация

**Files:** none

- [ ] **Step 1: Чистая полная сборка**

```bash
rm -rf ceramicfest "#src/generated"
npx gulp build
```

Expected: build проходит без ошибок, `ceramicfest/index.html` создан.

- [ ] **Step 2: Прогон всех verification-кейсов из спека**

Из `docs/superpowers/specs/2026-06-02-content-refactor-design.md` секция Verification:

1. **Build smoke** ✓ (Step 1).
2. **Визуальный diff** — `npx gulp` → `localhost:3000` → пройти по секциям.
3. **Попап участника** — клик по карточке/стрелке открывает доп. описание.
4. **WebP-подмена** — в DevTools Network проверить, что картинки СМИ/партнёров грузятся в `.webp` (или `.png`/`.jpg` fallback).
5. **Контентная правка** — отредактировать имя партнёра в `seasons/2026.json` (например, заменить "Ника ТВ" на "Ника ТВ ТЕСТ"), сохранить. BrowserSync должен пересобрать, имя обновиться в браузере без перезагрузки. После проверки откатить правку.
6. **Order правка** — убрать `"map"` из `pages.index.sections[]`, проверить, что блок карты исчез. Откатить.
7. **Escape hatch** — добавить `"custom:test"` в конец `pages.index.sections[]`, создать `#src/years/2026/extras/test.html` с содержимым `<div data-test="hello">HELLO ESCAPE</div>`. Проверить через DevTools, что элемент появился в DOM. Откатить (убрать строку из JSON, удалить файл).
8. **Сравнение с baseline:**

```bash
diff -w -B docs/superpowers/plans/baselines/2026-pre-refactor-index.html ceramicfest/index.html > /tmp/refactor-diff.txt
wc -l /tmp/refactor-diff.txt
```

Просмотреть `/tmp/refactor-diff.txt`. Допустимые различия — порядок атрибутов и отсутствие закомментированных блоков. Любые потери осмысленного контента (отсутствующая ссылка, пропавшая фраза, не та картинка) — баг.

- [ ] **Step 3: Финальный коммит-маркер (если потребуется)**

Если в процессе верификации не пришлось ничего править — никакого коммита не нужно. Если правил — отдельный коммит с описанием фикса.

- [ ] **Step 4: Обновить план — все шаги отмечены**

В этом файле проставить `[x]` всем чекбоксам после выполнения.

---

## Post-Phase-1 notes (вне scope, для следующей итерации)

- Phase 2 расширяет `pages` на `photos`, `team`, `reviews`. Архитектура уже готова — нужны только новые шаблоны секций (`_photoGallery.html`, `_reviewsList.html`, `_teamFull.html` или переиспользование `_members.html` с `mode: full`) и записи в `pages.{name}.sections`.
- Перенос архивов 2021–2025 на единый main делается отдельным проектом: для каждого года создаётся `seasons/{year}.json` из их захардкоженного HTML, и оркестратор `{year}/index.html` (или подмаршрут).
- Миграция git-модели (слияние всех веток в main) — отдельная операция, делается после стабилизации архитектуры.
