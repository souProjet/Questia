/**
 * Prend apps/web/src/app/icon.png et produit un carré 512×512 (PNG, fond transparent).
 * Le logo est redimensionné pour occuper toute la hauteur (512 px) ; de la largeur
 * est ajoutée sur les côtés si le pictogramme est plus haut que large.
 *
 * Usage :
 *   node scripts/square-icon-512.mjs
 *   node scripts/square-icon-512.mjs --input chemin/vers.png --output chemin/sortie.png
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SIDE = 512;

function parseArgs() {
  const argv = process.argv.slice(2);
  let input = join(root, 'apps/web/src/app/icon.png');
  let output = join(root, 'apps/mobile/assets/icon-512-play.png');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) {
      input = argv[++i];
    } else if (argv[i] === '--output' && argv[i + 1]) {
      output = argv[++i];
    }
  }
  return { input, output };
}

async function main() {
  const { input, output } = parseArgs();

  if (!existsSync(input)) {
    console.error('Fichier introuvable :', input);
    process.exit(1);
  }

  const base = await sharp(input).ensureAlpha();

  /** Redimensionnement : hauteur = SIDE, largeur proportionnelle */
  const resizedBuf = await base.resize({ height: SIDE }).png().toBuffer();
  let meta = await sharp(resizedBuf).metadata();
  let w = meta.width ?? SIDE;
  let h = meta.height ?? SIDE;

  /** Si le logo est très large, limiter à SIDE de large et réduire la hauteur, puis centrer verticalement */
  let contentBuf = resizedBuf;
  if (w > SIDE) {
    contentBuf = await sharp(input)
      .ensureAlpha()
      .resize({ width: SIDE })
      .png()
      .toBuffer();
    meta = await sharp(contentBuf).metadata();
    w = meta.width ?? SIDE;
    h = meta.height ?? SIDE;
  }

  const left = Math.floor((SIDE - w) / 2);
  const top = Math.floor((SIDE - h) / 2);

  mkdirSync(dirname(output), { recursive: true });

  await sharp({
    create: {
      width: SIDE,
      height: SIDE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: contentBuf, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log('OK —', SIDE, '×', SIDE, 'px');
  console.log('Entrée :', input);
  console.log('Sortie :', output);
  console.log(`Contenu redimensionné : ${w}×${h}, offset (${left}, ${top})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
