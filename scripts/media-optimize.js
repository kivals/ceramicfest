#!/usr/bin/env node

/**
 * Re-encodes "fake" .webp files in public/ (actually JPEG/PNG/GIF/SVG renamed)
 * into real WebP with web-optimized quality and max width.
 *
 * Real WebP files are left untouched.
 *
 * Usage:
 *   node scripts/media-optimize.js                # real run, in-place, backup to .media-backup/
 *   node scripts/media-optimize.js --dry-run      # measure savings without writing
 *   node scripts/media-optimize.js --quality 82 --max-width 1920
 *   node scripts/media-optimize.js --no-backup    # skip backup (NOT recommended)
 *   node scripts/media-optimize.js --root public  # custom root
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT_DEFAULT = 'public';
const BACKUP_DIR_DEFAULT = '.media-backup';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    root: ROOT_DEFAULT,
    backupDir: BACKUP_DIR_DEFAULT,
    quality: 82,
    maxWidth: 1920,
    dryRun: false,
    backup: true,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run')                          { opts.dryRun = true; }
    else if (a === '--no-backup')                   { opts.backup = false; }
    else if (a === '-q' || a === '--quality')       { opts.quality = parseInt(args[++i]); }
    else if (a === '--max-width')                   { opts.maxWidth = parseInt(args[++i]); }
    else if (a === '--root')                        { opts.root = args[++i]; }
    else if (a === '--backup-dir')                  { opts.backupDir = args[++i]; }
    else if (a === '-h' || a === '--help')          { printHelp(); process.exit(0); }
  }
  return opts;
}

function printHelp() {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 16).join('\n'));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())      { walk(full, out); }
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) {
      out.push(full);
    }
  }
  return out;
}

/** Detect actual format by magic bytes. Returns 'webp' | 'jpeg' | 'png' | 'gif' | 'svg' | 'other'. */
function detectFormat(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  if (buf[0] === 0x89 && buf.slice(1, 4).toString('ascii') === 'PNG') {
    return 'png';
  }
  if (buf.slice(0, 6).toString('ascii') === 'GIF87a' || buf.slice(0, 6).toString('ascii') === 'GIF89a') {
    return 'gif';
  }
  const head = buf.toString('utf8').trim().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    return 'svg';
  }
  return 'other';
}

async function convert(srcPath, { quality, maxWidth }) {
  const pipeline = sharp(srcPath, { animated: true });
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > maxWidth) {
    pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  return await pipeline.webp({ quality, effort: 5 }).toBuffer();
}

function fmtBytes(n) {
  if (n < 1024)              { return n + ' B'; }
  if (n < 1024 * 1024)       { return (n / 1024).toFixed(1) + ' KB'; }
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function groupKey(relPath) {
  const parts = relPath.split(path.sep);
  return /^\d{4}/.test(parts[0]) ? parts[0] : '<current>';
}

async function main() {
  const opts = parseArgs();
  const projectRoot = process.cwd();
  const rootAbs = path.resolve(projectRoot, opts.root);
  const backupAbs = path.resolve(projectRoot, opts.backupDir);

  if (!fs.existsSync(rootAbs)) {
    console.error(`Root not found: ${rootAbs}`);
    process.exit(1);
  }

  console.log(`Mode:       ${opts.dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log(`Root:       ${rootAbs}`);
  console.log(`Quality:    ${opts.quality}`);
  console.log(`Max width:  ${opts.maxWidth}`);
  console.log(`Backup:     ${opts.backup && !opts.dryRun ? backupAbs : 'no'}`);
  console.log('');

  const all = walk(rootAbs);
  console.log(`Found ${all.length} .webp files. Detecting fakes…`);

  const targets = [];
  for (const f of all) {
    const fmt = detectFormat(f);
    if (fmt !== 'webp' && fmt !== 'svg' && fmt !== 'other') {
      targets.push({ path: f, format: fmt });
    }
  }
  console.log(`To convert: ${targets.length} (JPEG/PNG/GIF)`);
  console.log('');

  const groups = new Map();
  let totalBefore = 0;
  let totalAfter = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const { path: src, format } = targets[i];
    const rel = path.relative(rootAbs, src);
    const key = groupKey(rel);
    const before = fs.statSync(src).size;

    let after = 0;
    let buf = null;
    try {
      buf = await convert(src, opts);
      after = buf.length;
    } catch (e) {
      console.error(`  ! fail ${rel}: ${e.message}`);
      failed++;
      continue;
    }

    if (!opts.dryRun) {
      if (opts.backup) {
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
    const g = groups.get(key) || { count: 0, before: 0, after: 0 };
    g.count++; g.before += before; g.after += after;
    groups.set(key, g);

    if ((i + 1) % 50 === 0 || i === targets.length - 1) {
      const pct = totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0';
      process.stdout.write(`  ${i + 1}/${targets.length}  saved ${pct}%\r`);
    }
  }
  console.log('');
  console.log('');

  console.log('Per-year breakdown:');
  const keys = [...groups.keys()].sort();
  for (const k of keys) {
    const g = groups.get(k);
    const pct = g.before ? ((1 - g.after / g.before) * 100).toFixed(1) : '0';
    console.log(`  ${k.padEnd(12)} ${String(g.count).padStart(4)} files  ${fmtBytes(g.before).padStart(10)} → ${fmtBytes(g.after).padStart(10)}  (-${pct}%)`);
  }

  console.log('');
  const totalPct = totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0';
  console.log(`Total:        ${fmtBytes(totalBefore)} → ${fmtBytes(totalAfter)}  (-${totalPct}%)`);
  console.log(`Saved:        ${fmtBytes(totalBefore - totalAfter)}`);
  if (failed)                  { console.log(`Failed:       ${failed}`); }
  if (opts.dryRun)             { console.log('\n(dry run, no files were modified)'); }
}

main().catch((e) => { console.error(e); process.exit(1); });
