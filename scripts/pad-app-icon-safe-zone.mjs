/**
 * Recadre l’icône app sur un canvas 1024×1024 avec marge « safe zone »
 * (évite le rognage par les masques circulaires / coins arrondis iOS & Android adaptive).
 *
 * Usage :
 *   node scripts/pad-app-icon-safe-zone.mjs
 *   node scripts/pad-app-icon-safe-zone.mjs --input chemin/in.png --output chemin/out.png
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** Cible Expo / stores : 1024 px. */
const CANVAS = 1024;
/** Part du canvas occupée au max par le logo (~76 % ≈ zone sûre adaptive icon + coins iOS). */
const SAFE_SCALE = 0.76;

function parseArgs() {
  const argv = process.argv.slice(2);
  let input = join(root, 'apps/mobile/assets/icon.png');
  let output = join(root, 'apps/mobile/assets/icon.png');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) input = argv[++i];
    else if (argv[i] === '--output' && argv[i + 1]) output = argv[++i];
  }
  return { input, output };
}

async function main() {
  const { input, output } = parseArgs();
  if (!existsSync(input)) {
    console.error('Fichier introuvable :', input);
    process.exit(1);
  }

  const img = sharp(input).ensureAlpha();
  const meta = await img.metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;

  const maxSide = Math.round(CANVAS * SAFE_SCALE);
  const scale = Math.min(maxSide / w, maxSide / h);
  const newW = Math.max(1, Math.round(w * scale));
  const newH = Math.max(1, Math.round(h * scale));

  const resized = await img.resize(newW, newH, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();

  const left = Math.floor((CANVAS - newW) / 2);
  const top = Math.floor((CANVAS - newH) / 2);

  mkdirSync(dirname(output), { recursive: true });

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log('OK —', CANVAS, '×', CANVAS, 'px, logo', newW, '×', newH, `(${SAFE_SCALE * 100}% max), offset (${left}, ${top})`);
  console.log('→', output);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
