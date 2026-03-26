/**
 * Génère un PNG carré du logo Questia, fond transparent, en conservant tout le pictogramme.
 * Usage : node scripts/generate-questia-logo-square.mjs
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** Ordre : master HD d’abord, puis export courant. */
const CANDIDATE_SOURCES = [
  join(root, 'apps/web/public/brand/questia-logo-source.png'),
  join(root, 'apps/web/src/app/Questia.png'),
  join(root, 'apps/web/public/brand/questia-logo.png'),
];

function findSource() {
  for (const p of CANDIDATE_SOURCES) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Rend transparent le fond noir / gris très neutre ; ne touche pas aux pixels déjà semi-transparents (anti-crénelage). */
function removeDarkNeutralBackground(data) {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];
    if (a < 250) continue;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const max = Math.max(r, g, b);
    if (max < 48 && spread < 45) {
      out[i + 3] = 0;
    }
  }
  return out;
}

async function main() {
  const src = findSource();
  if (!src) {
    console.error(
      'Aucune source trouvée. Placez Questia.png dans apps/web/src/app/ ou public/brand/questia-logo-source.png',
    );
    process.exit(1);
  }
  console.log('Source:', src);

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const cleaned = removeDarkNeutralBackground(data);

  const afterClean = await sharp(cleaned, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const trimmed = await sharp(afterClean).trim({ threshold: 0 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const side = Math.max(w, h);

  const left = Math.floor((side - w) / 2);
  const top = Math.floor((side - h) / 2);

  const square = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const size1024 = await sharp(square)
    .resize(1024, 1024, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const outBrand = join(root, 'apps/web/public/brand/questia-logo.png');
  const outIcon = join(root, 'apps/web/src/app/icon.png');
  const outMobile = join(root, 'apps/mobile/assets/icon.png');

  mkdirSync(dirname(outBrand), { recursive: true });
  mkdirSync(dirname(outIcon), { recursive: true });
  mkdirSync(dirname(outMobile), { recursive: true });

  await sharp(size1024).toFile(outBrand);
  await sharp(size1024).toFile(outIcon);
  await sharp(size1024).toFile(outMobile);

  console.log('OK — carré', side, 'px → export 1024×1024, fond transparent.');
  console.log(outBrand);
  console.log(outIcon);
  console.log(outMobile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
