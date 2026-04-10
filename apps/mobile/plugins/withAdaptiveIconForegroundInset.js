const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/** Marge horizontale (dp) — icône adaptative (canvas ≈ 108 dp). */
const INSET_HORIZONTAL_DP = 18;
/**
 * Marge verticale (dp) — icône adaptative ; au-delà de ~46 dp le pictogramme devient très petit.
 */
const INSET_VERTICAL_DP = 46;

/**
 * Splash (`windowBackground`) : sans boîte en dp fixe, Android étire le foreground sur tout l’écran et les
 * marges « icône » ne suffisent plus — le logo déborde. On centre un carré en dp puis on inset le bitmap dedans.
 */
const SPLASH_LOGO_BOX_DP = 300;
const SPLASH_INSET_HORIZONTAL_DP = 22;
const SPLASH_INSET_VERTICAL_DP = 58;

/**
 * 1) Icône adaptative : foreground inset (fond blanc `iconBackground` visible autour du logo).
 * 2) Splash natif : réécrit `ic_launcher_background.xml` (zone logo bornée + insets).
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

      const splashBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
  <item
      android:width="${SPLASH_LOGO_BOX_DP}dp"
      android:height="${SPLASH_LOGO_BOX_DP}dp"
      android:gravity="center">
    <layer-list>
      <item
          android:top="${SPLASH_INSET_VERTICAL_DP}dp"
          android:bottom="${SPLASH_INSET_VERTICAL_DP}dp"
          android:left="${SPLASH_INSET_HORIZONTAL_DP}dp"
          android:right="${SPLASH_INSET_HORIZONTAL_DP}dp">
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher_foreground" />
      </item>
    </layer-list>
  </item>
</layer-list>
`;
      fs.writeFileSync(
        path.join(drawableDir, 'ic_launcher_background.xml'),
        splashBackgroundXml,
        'utf8',
      );

      return config;
    },
  ]);
}

module.exports = withAdaptiveIconForegroundInset;
