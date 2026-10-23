/**
 * Ícones alternativos no Android, sem desabilitar a MainActivity (bibliotecas prontas fazem isso e
 * quebram deep links, toque em notificação e o intent do Health Connect).
 * - A MainActivity fica sempre habilitada, com deep links, mas sem o filtro LAUNCHER.
 * - Cada ícone é um activity-alias com LAUNCHER; só um fica habilitado (o módulo local app-icon troca).
 * - As variantes são ícones adaptativos (fundo em cor, frente e monocromático em drawable-nodpi).
 */
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withAndroidStyles, withDangerousMod } = require('expo/config-plugins');

const ICONS = [
  { name: 'padrao', alias: 'MainActivityPadrao', isDefault: true },
  { name: 'noite', alias: 'MainActivityNoite', background: '#151A17' },
  { name: 'sol', alias: 'MainActivitySol', background: '#F5E211' },
  // Discreto: nome neutro no launcher.
  { name: 'discreto', alias: 'MainActivityDiscreto', background: '#D9D5C8', label: 'Diário' },
];

const LAUNCHER = 'android.intent.category.LAUNCHER';
const isLauncher = (filter) => (filter.category || []).some((c) => c.$['android:name'] === LAUNCHER);

const launcherFilter = () => ({
  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
  category: [{ $: { 'android:name': LAUNCHER } }],
});

function applyToApplication(app) {
  const main = app.activity.find((a) => a.$['android:name'] === '.MainActivity');
  if (!main) throw new Error('MainActivity não encontrada');
  main['intent-filter'] = (main['intent-filter'] || []).filter((f) => !isLauncher(f));
  const names = new Set(ICONS.map((i) => `.${i.alias}`));
  app['activity-alias'] = (app['activity-alias'] || []).filter((a) => !names.has(a.$['android:name']));
  for (const icon of ICONS) {
    const $ = {
      'android:name': `.${icon.alias}`,
      'android:enabled': String(Boolean(icon.isDefault)),
      'android:exported': 'true',
      'android:targetActivity': '.MainActivity',
      'android:icon': icon.isDefault ? '@mipmap/ic_launcher' : `@mipmap/ic_launcher_${icon.name}`,
      'android:roundIcon': icon.isDefault ? '@mipmap/ic_launcher_round' : `@mipmap/ic_launcher_${icon.name}`,
    };
    if (icon.label) $['android:label'] = icon.label;
    app['activity-alias'].push({ $, 'intent-filter': [launcherFilter()] });
  }
  return app;
}

/** O discreto tem silhueta própria: com ícones temáticos ligados, os lobos não aparecem. */
const monochromeFor = (name) => (name === 'discreto' ? 'ic_launcher_discreto_monochrome' : 'ic_launcher_alt_monochrome');

const adaptiveXml = (name) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_${name}_background"/>
  <foreground android:drawable="@drawable/ic_launcher_${name}_foreground"/>
  <monochrome android:drawable="@drawable/${monochromeFor(name)}"/>
</adaptive-icon>
`;

/** Abertura com o ícone discreto (Android 13+; o módulo app-icon escolhe este tema ao trocar). */
const DISCREET_SPLASH = 'DiscreetSplash';
const discreetSplashStyle = () => ({
  $: { name: DISCREET_SPLASH, parent: 'Theme.App.SplashScreen' },
  item: [
    { $: { name: 'windowSplashScreenBackground' }, _: '@color/ic_launcher_discreto_background' },
    { $: { name: 'windowSplashScreenAnimatedIcon' }, _: '@drawable/ic_launcher_discreto_foreground' },
  ],
});

const colorsXml = () => `<?xml version="1.0" encoding="utf-8"?>
<resources>
${ICONS.filter((i) => !i.isDefault)
  .map((i) => `  <color name="ic_launcher_${i.name}_background">${i.background}</color>`)
  .join('\n')}
</resources>
`;

function writeResources(projectRoot, platformRoot) {
  const res = path.join(platformRoot, 'app', 'src', 'main', 'res');
  const src = path.join(projectRoot, 'assets', 'images', 'icons');
  for (const dir of ['drawable-nodpi', 'mipmap-anydpi-v26', 'values']) fs.mkdirSync(path.join(res, dir), { recursive: true });
  for (const icon of ICONS.filter((i) => !i.isDefault)) {
    fs.copyFileSync(
      path.join(src, `${icon.name}-foreground-432.png`),
      path.join(res, 'drawable-nodpi', `ic_launcher_${icon.name}_foreground.png`),
    );
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', `ic_launcher_${icon.name}.xml`), adaptiveXml(icon.name));
  }
  fs.copyFileSync(path.join(src, 'monochrome-432.png'), path.join(res, 'drawable-nodpi', 'ic_launcher_alt_monochrome.png'));
  fs.copyFileSync(path.join(src, 'discreto-monochrome-432.png'), path.join(res, 'drawable-nodpi', 'ic_launcher_discreto_monochrome.png'));
  fs.writeFileSync(path.join(res, 'values', 'ic_launcher_alt_colors.xml'), colorsXml());
}

const withAlternateIcons = (config) => {
  config = withAndroidManifest(config, (c) => {
    applyToApplication(AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults));
    return c;
  });
  config = withAndroidStyles(config, (c) => {
    const styles = c.modResults.resources.style || [];
    c.modResults.resources.style = [...styles.filter((st) => st.$.name !== DISCREET_SPLASH), discreetSplashStyle()];
    return c;
  });
  return withDangerousMod(config, [
    'android',
    (c) => {
      writeResources(c.modRequest.projectRoot, c.modRequest.platformProjectRoot);
      return c;
    },
  ]);
};

module.exports = withAlternateIcons;
module.exports.ICONS = ICONS;
module.exports.applyToApplication = applyToApplication;
module.exports.adaptiveXml = adaptiveXml;
module.exports.discreetSplashStyle = discreetSplashStyle;
