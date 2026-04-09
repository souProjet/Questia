const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/** Marge horizontale (dp) — un peu moins pour ne pas trop rétrécir le logo. */
const INSET_HORIZONTAL_DP = 14;
/** Marge verticale (dp) — plus forte pour laisser voir le fond en haut / bas du masque. */
const INSET_VERTICAL_DP = 32;

/**
 * Réduit visuellement le foreground de l’icône adaptative pour laisser respirer le fond
 * (sinon le PNG remplit tout le masque launcher / squircle).
 */
function withAdaptiveIconForegroundInset(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const resDir = path.join(androidRoot, 'app', 'src', 'main', 'res');
      if (!fs.existsSync(resDir)) {
        return config;
      }

      const drawableDir = path.join(resDir, 'drawable');
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }

      const insetXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item
    android:top="${INSET_VERTICAL_DP}dp"
    android:bottom="${INSET_VERTICAL_DP}dp"
    android:left="${INSET_HORIZONTAL_DP}dp"
    android:right="${INSET_HORIZONTAL_DP}dp">
    <bitmap
      android:src="@mipmap/ic_launcher_foreground"
      android:gravity="center" />
  </item>
</layer-list>
`;
      fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground_inset.xml'), insetXml, 'utf8');

      const mipmapV26 = path.join(resDir, 'mipmap-anydpi-v26');
      if (!fs.existsSync(mipmapV26)) {
        return config;
      }

      for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
        const filePath = path.join(mipmapV26, name);
        if (!fs.existsSync(filePath)) continue;
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('@drawable/ic_launcher_foreground_inset')) continue;
        if (!content.includes('@mipmap/ic_launcher_foreground')) continue;
        content = content.replace(
          /android:drawable="@mipmap\/ic_launcher_foreground"/g,
          'android:drawable="@drawable/ic_launcher_foreground_inset"',
        );
        fs.writeFileSync(filePath, content, 'utf8');
      }

      return config;
    },
  ]);
}

module.exports = withAdaptiveIconForegroundInset;
