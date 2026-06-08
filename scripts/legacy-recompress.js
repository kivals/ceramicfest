#!/usr/bin/env node

/**
 * Recompresses .jpg/.png images inside archive snapshots (public/{year}/)
 * in-place, keeping the same extension so HTML/CSS references stay valid.
 *
 * - JPEG  → JPEG, mozjpeg, q=80, max-width 1920
 * - PNG   → PNG, palette + adaptive, max-width 1920
 * - GIF   → skipped (animations + sharp gif support is limited)
 * - SVG   → skipped
 *
 * Usage:
 *   node scripts/legacy-recompress.js --dry-run
 *   node scripts/legacy-recompress.js
 *   node scripts/legacy-recompress.js --quality 75 --max-width 1600
 *   node scripts/legacy-recompress.js --no-backup
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const YEARS = ['2021', '2022', '2022_2', '2023', '2024', '2025'];
const BACKUP_DIR_DEFAULT = '.media-backup';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    backupDir: BACKUP_DIR_DEFAULT,
    quality: 80,
    maxWidth: 1920,
    dryRun: false,
    backup: true,
    minSavingsBytes: 1024,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run')                          { opts.dryRun = true; }
    else if (a === '--no-backup')                   { opts.backup = false; }
    else if (a === '-q' || a === '--quality')       { opts.quality = parseInt(args[++i]); }
    else if (a === '--max-width')                   { opts.maxWidth = parseInt(args[++i]); }
    else if (a === '--backup-dir')                  { opts.backupDir = args[++i]; }
    else if (a === '-h' || a === '--help')          { printHelp(); process.exit(0); }
  }
  return opts;
}

function printHelp() {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 18).join('\n'));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir))           { return out; }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())         { walk(full, out); }
    else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
        out.push(full);
      }
    }
  }
  return out;
}

async function recompress(srcPath, { quality, maxWidth }) {
  const lower = srcPath.toLowerCase();
  const isJpeg = lower.endsWith('.jpg') || lower.endsWith('.jpeg');
  const pipeline = sharp(srcPath);
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > maxWidth) {
    pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  if (isJpeg) {
    return await pipeline.jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
  }
  return await pipeline.png({ quality, palette: true, compressionLevel: 9 }).toBuffer();
}

function fmtBytes(n) {
  if (n < 1024)              { return n + ' B'; }
  if (n < 1024 * 1024)       { return (n / 1024).toFixed(1) + ' KB'; }
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

async function main() {
  const opts = parseArgs();
  const projectRoot = process.cwd();
  const backupAbs = path.resolve(projectRoot, opts.backupDir);

  console.log(`Mode:       ${opts.dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log(`Quality:    ${opts.quality}`);
  console.log(`Max width:  ${opts.maxWidth}`);
  console.log(`Backup:     ${opts.backup && !opts.dryRun ? backupAbs : 'no'}`);
  console.log(`Min saving: ${fmtBytes(opts.minSavingsBytes)} (smaller savings → keep original)`);
  console.log('');

  const tasks = [];
  for (const year of YEARS) {
    const dir = path.resolve(projectRoot, 'public', year);
    const files = walk(dir);
    for (const f of files) {
      tasks.push({ year, path: f });
    }
  }
  console.log(`Found ${tasks.length} JPG/PNG files in archives.\n`);

  const groups = new Map();
  let totalBefore = 0;
  let totalAfter = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < tasks.length; i++) {
    const { year, path: src } = tasks[i];
    const before = fs.statSync(src).size;

    let buf = null;
    try {
      buf = await recompress(src, opts);
    } catch (e) {
      console.error(`  ! fail ${path.relative(projectRoot, src)}: ${e.message}`);
      failed++;
      continue;
    }
    const after = buf.length;

    if (before - after < opts.minSavingsBytes) {
      skipped++;
      totalBefore += before;
      totalAfter += before;
      const g = groups.get(year) || { count: 0, kept: 0, before: 0, after: 0 };
      g.kept++; g.before += before; g.after += before;
      groups.set(year, g);
      continue;
    }

    if (!opts.dryRun) {
      if (opts.backup) {
        const rel = path.relative(projectRoot, src);
        const backupPath = path.join(backupAbs, rel);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(src, backupPath);
        }
      }
      fs.writeFileSync(src, buf);
    }

    totalBefore += before;
    totalAfter += after;
    const g = groups.get(year) || { count: 0, kept: 0, before: 0, after: 0 };
    g.count++; g.before += before; g.after += after;
    groups.set(year, g);

    if ((i + 1) % 50 === 0 || i === tasks.length - 1) {
      const pct = totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0';
      process.stdout.write(`  ${i + 1}/${tasks.length}  saved ${pct}%\r`);
    }
  }
  console.log('');
  console.log('');

  console.log('Per-year breakdown:');
  for (const k of YEARS) {
    if (!groups.has(k))                              { continue; }
    const g = groups.get(k);
    const pct = g.before ? ((1 - g.after / g.before) * 100).toFixed(1) : '0';
    console.log(`  ${k.padEnd(8)} ${String(g.count).padStart(4)} recompressed, ${String(g.kept).padStart(3)} kept   ${fmtBytes(g.before).padStart(10)} → ${fmtBytes(g.after).padStart(10)}  (-${pct}%)`);
  }

  console.log('');
  const totalPct = totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0';
  console.log(`Total:     ${fmtBytes(totalBefore)} → ${fmtBytes(totalAfter)}  (-${totalPct}%)`);
  console.log(`Saved:     ${fmtBytes(totalBefore - totalAfter)}`);
  console.log(`Skipped:   ${skipped} (already efficient — savings below threshold)`);
  if (failed)                                         { console.log(`Failed:    ${failed}`); }
  if (opts.dryRun)                                    { console.log('\n(dry run, no files were modified)'); }
}

main().catch((e) => { console.error(e); process.exit(1); });
