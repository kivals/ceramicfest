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
  const grayscaleTag   = opts.grayscale ? '  [grayscale]' : '';

  console.log(
    `  ${path.basename(inputFile).padEnd(40)} → ${path.basename(outputFile)}  ` +
    `${sign}${Math.abs(saved)}%  (${kb(inSize)} → ${kb(outSize)} KB)${grayscaleTag}`
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
