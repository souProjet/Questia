/**
 * PNG 96×96 blanc sur transparence pour expo-notifications (Android).
 * @see https://docs.expo.dev/versions/latest/sdk/notifications/#configurable-properties
 *
 * Usage : node scripts/generate-android-notification-icon.mjs
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SIDE = 96;
const INNER = 80; /** marge pour le masque circulaire système */

const DEFAULT_INPUT = join(root, 'apps/mobile/assets/icon.png');
const DEFAULT_OUTPUT = join(root, 'apps/mobile/assets/notification-icon.png');

function parseArgs() {
  const argv = process.argv.slice(2);
  let input = DEFAULT_INPUT;
  let output = DEFAULT_OUTPUT;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) input = argv[++i];
    else if (argv[i] === '--output' && argv[i + 1]) output = argv[++i];
  }
  return { input, output };
}

/**
 * Passe le logo en glyphe blanc : alpha = combinaison du canal alpha et de la luminance
 * (icônes couleur opaques restent lisibles).
 */
function toWhiteGlyphRgba(data) {
  const out = Buffer.alloc(data.length);
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const a = data[p + 3];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const shape = (a / 255) * Math.min(1, Math.max(lum, 0.04));
    const ao = Math.round(255 * shape);
    out[p] = 255;
    out[p + 1] = 255;
    out[p + 2] = 255;
    out[p + 3] = ao;
  }
  return out;
}

async function main() {
  const { input, output } = parseArgs();

  if (!existsSync(input)) {
    console.error('Fichier introuvable :', input);
    process.exit(1);
  }

  const resized = await sharp(input)
    .ensureAlpha()
    .resize(INNER, INNER, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = resized.info;
  const left = Math.floor((SIDE - w) / 2);
  const top = Math.floor((SIDE - h) / 2);

  const glyph = toWhiteGlyphRgba(resized.data);

  mkdirSync(dirname(output), { recursive: true });

  await sharp(glyph, {
    raw: { width: w, height: h, channels: 4 },
  })
    .extend({
      top,
      bottom: SIDE - h - top,
      left,
      right: SIDE - w - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log('OK —', SIDE, '×', SIDE, 'px (glyphe blanc + transparence)');
  console.log('Entrée :', input);
  console.log('Sortie :', output);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
