# img-convert refactor + grayscale flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `img-convert.js` to `scripts/img-convert.js`, добавить флаг `--grayscale` / `-g` и npm-алиасы.

**Architecture:** Скрипт переезжает в папку `scripts/` без изменения логики. В `parseArgs()` добавляется флаг `grayscale`, в `convertFile()` — вызов `pipeline.grayscale()` перед `.webp()`. В `package.json` регистрируются два npm-скрипта.

**Tech Stack:** Node.js, sharp ^0.34.5

---

### Task 1: Создать `scripts/img-convert.js` с флагом `--grayscale`

**Files:**
- Create: `scripts/img-convert.js`
- Delete: `img-convert.js` (после проверки)

- [ ] **Шаг 1: Создать папку и новый файл**

Создать `scripts/img-convert.js` со следующим содержимым (полная копия оригинала с добавленными изменениями):

```js
#!/usr/bin/env node

/**
 * Конвертирует изображения в WebP с оптимизацией для web.
 *
 * Использование:
 *   node scripts/img-convert.js <источник> [опции]
 *
 * Примеры:
 *   node scripts/img-convert.js ./photos
 *   node scripts/img-convert.js ./photos -o ./output
 *   node scripts/img-convert.js ./photos -q 75 --width 1920
 *   node scripts/img-convert.js photo.jpg -o ./out
 *   node scripts/img-convert.js ./img/members --grayscale
 *   node scripts/img-convert.js photo.jpg -o ./out -g -q 85
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SUPPORTED = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp', '.avif', '.webp'];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: null,
    output: null,
    quality: 82,
    width: null,
    height: null,
    keepStructure: true,
    grayscale: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output')        { opts.output = args[++i]; }
    else if (arg === '-q' || arg === '--quality')  { opts.quality = parseInt(args[++i]); }
    else if (arg === '--width')                    { opts.width = parseInt(args[++i]); }
    else if (arg === '--height')                   { opts.height = parseInt(args[++i]); }
    else if (arg === '-g' || arg === '--grayscale'){ opts.grayscale = true; }
    else if (!arg.startsWith('-'))                 { opts.input = arg; }
  }

  return opts;
}

function collectFiles(inputPath) {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) {
    const ext = path.extname(inputPath).toLowerCase();
    return SUPPORTED.includes(ext) ? [inputPath] : [];
  }

  const files = [];
  for (const entry of fs.readdirSync(inputPath, { withFileTypes: true })) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED.includes(ext)) {
        files.push(path.join(inputPath, entry.name));
      }
    }
  }
  return files;
}

function resolveOutput(inputFile, inputBase, outputBase) {
  const rel = path.relative(inputBase, inputFile);
  const dir = outputBase
    ? path.join(outputBase, path.dirname(rel))
    : path.dirname(inputFile);

  const name = path.basename(inputFile, path.extname(inputFile)) + '.webp';
  return path.join(dir, name);
}

async function convertFile(inputFile, outputFile, opts) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  let pipeline = sharp(inputFile);

  if (opts.grayscale) {
    pipeline = pipeline.grayscale();
  }

  if (opts.width || opts.height) {
    pipeline = pipeline.resize(opts.width || null, opts.height || null, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  await pipeline.webp({ quality: opts.quality }).toFile(outputFile);

  const inSize  = fs.statSync(inputFile).size;
  const outSize = fs.statSync(outputFile).size;
  const saved   = Math.round((1 - outSize / inSize) * 100);
  const sign    = saved >= 0 ? '-' : '+';
  const bwTag   = opts.grayscale ? '  [grayscale]' : '';

  console.log(
    `  ${path.basename(inputFile).padEnd(40)} → ${path.basename(outputFile)}  ` +
    `${sign}${Math.abs(saved)}%  (${kb(inSize)} → ${kb(outSize)} KB)${bwTag}`
  );
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

async function main() {
  const opts = parseArgs();

  if (!opts.input) {
    console.error('Использование: node scripts/img-convert.js <файл или папка> [-o <output>] [-q <качество 1-100>] [--width <px>] [--height <px>] [-g | --grayscale]');
    process.exit(1);
  }

  if (!fs.existsSync(opts.input)) {
    console.error(`Не найдено: ${opts.input}`);
    process.exit(1);
  }

  const inputStat = fs.statSync(opts.input);
  const inputBase = inputStat.isDirectory() ? opts.input : path.dirname(opts.input);
  const files = collectFiles(opts.input);

  if (files.length === 0) {
    console.log('Нет поддерживаемых изображений.');
    process.exit(0);
  }

  const outputBase = opts.output || null;
  const bwNote = opts.grayscale ? ', grayscale' : '';
  console.log(`\nКонвертация ${files.length} файл(ов) → WebP (quality: ${opts.quality}${bwNote})\n`);

  let ok = 0, fail = 0;
  for (const file of files) {
    const outFile = resolveOutput(file, inputBase, outputBase);
    try {
      await convertFile(file, outFile, opts);
      ok++;
    } catch (err) {
      console.error(`  ОШИБКА ${file}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nГотово: ${ok} конвертировано${fail ? `, ${fail} ошибок` : ''}.`);
}

main();
```

- [ ] **Шаг 2: Проверить, что скрипт запускается без ошибок (dry-run)**

```bash
node scripts/img-convert.js 2>&1 | head -3
```

Ожидаемый вывод (справка об использовании):
```
Использование: node scripts/img-convert.js <файл или папка> ...
```

- [ ] **Шаг 3: Удалить старый файл из корня**

```bash
git rm img-convert.js
```

- [ ] **Шаг 4: Закоммитить**

```bash
git add scripts/img-convert.js
git commit -m "refactor: move img-convert.js to scripts/, add --grayscale flag"
```

---

### Task 2: Добавить npm-скрипты в `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Шаг 1: Добавить секцию `scripts` в `package.json`**

Открыть `package.json` и добавить секцию `"scripts"` перед `"devDependencies"`:

```json
{
  "name": "fls_start_gulp",
  "version": "1.0.0",
  "description": "Start template with Gulp",
  "author": "FLS",
  "private": true,
  "license": "GNU General Public License (GPL)",
  "scripts": {
    "img": "node scripts/img-convert.js",
    "img:bw": "node scripts/img-convert.js --grayscale"
  },
  "devDependencies": {
```

- [ ] **Шаг 2: Проверить, что алиасы работают**

```bash
npm run img 2>&1 | head -3
```

Ожидаемый вывод:
```
Использование: node scripts/img-convert.js <файл или папка> ...
```

```bash
npm run img:bw 2>&1 | head -3
```

Ожидаемый вывод (то же сообщение):
```
Использование: node scripts/img-convert.js <файл или папка> ...
```

- [ ] **Шаг 3: Закоммитить**

```bash
git add package.json
git commit -m "chore: add npm scripts img and img:bw"
```

---

### Task 3: Обновить документацию `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Шаг 1: Обновить раздел Commands в CLAUDE.md**

Найти блок с примерами команд `img-convert.js` и заменить его:

**Было:**
```markdown
# Конвертация изображений в WebP (обязательно перед добавлением новых фото)
node img-convert.js ./путь/к/папке            # сохраняет рядом с оригиналами
node img-convert.js ./источник -o ./output    # в отдельную папку
node img-convert.js ./источник --width 1920   # с ограничением ширины
```

**Стало:**
```markdown
# Конвертация изображений в WebP (обязательно перед добавлением новых фото)
node scripts/img-convert.js ./путь/к/папке             # сохраняет рядом с оригиналами
node scripts/img-convert.js ./источник -o ./output     # в отдельную папку
node scripts/img-convert.js ./источник --width 1920    # с ограничением ширины
node scripts/img-convert.js ./источник --grayscale     # чёрно-белые WebP
# Или через npm:
npm run img -- ./путь/к/папке
npm run img:bw -- ./путь/к/папке
```

- [ ] **Шаг 2: Проверить, что CLAUDE.md не содержит старый путь `img-convert.js`**

```bash
grep -n 'node img-convert' CLAUDE.md
```

Ожидаемый вывод: пусто (нет совпадений).

- [ ] **Шаг 3: Закоммитить**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — new script path and --grayscale example"
```

---

### Task 4: Финальная проверка

- [ ] **Шаг 1: Убедиться, что `img-convert.js` в корне не существует**

```bash
ls img-convert.js 2>&1
```

Ожидаемый вывод:
```
ls: img-convert.js: No such file or directory
```

- [ ] **Шаг 2: Убедиться, что новый скрипт лежит на месте**

```bash
ls scripts/img-convert.js
```

Ожидаемый вывод:
```
scripts/img-convert.js
```

- [ ] **Шаг 3: Запустить реальную конвертацию для smoke-test (если есть тестовое изображение)**

```bash
# Создать тестовый PNG и конвертировать в grayscale WebP
node -e "
const sharp = require('sharp');
sharp({ create: { width: 10, height: 10, channels: 3, background: {r:200,g:100,b:50} } })
  .png().toFile('/tmp/test_img.png', () => {});
"
node scripts/img-convert.js /tmp/test_img.png -o /tmp/out_color
node scripts/img-convert.js /tmp/test_img.png -o /tmp/out_bw --grayscale
ls -lh /tmp/out_color/ /tmp/out_bw/
```

Ожидаемый вывод: два WebP-файла, в строке для `--grayscale` есть метка `[grayscale]`.

- [ ] **Шаг 4: Убедиться, что граyscale WebP действительно чёрно-белый**

```bash
node -e "
const sharp = require('sharp');
sharp('/tmp/out_bw/test_img.webp').stats().then(s => {
  const ch = s.channels;
  console.log('R mean:', ch[0].mean.toFixed(1));
  console.log('G mean:', ch[1] ? ch[1].mean.toFixed(1) : 'n/a');
  console.log('B mean:', ch[2] ? ch[2].mean.toFixed(1) : 'n/a');
});
"
```

Ожидаемый вывод: если файл grayscale — каналы R/G/B будут равны (или один канал).
