import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { APP_ICONS } from '@/appearance/icons';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../plugins/with-alternate-icons');

type Filter = { action?: { $: Record<string, string> }[]; category?: { $: Record<string, string> }[]; data?: unknown[] };
type Node = { $: Record<string, string>; 'intent-filter'?: Filter[] };

const launcher: Filter = {
  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
};
const deepLink: Filter = {
  action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
  category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
  data: [{ $: { 'android:scheme': 'ciclolivre' } }],
};

function application() {
  const main: Node = { $: { 'android:name': '.MainActivity' }, 'intent-filter': [launcher, deepLink] };
  return { activity: [main], 'activity-alias': [] as Node[] };
}

describe('plugin with-alternate-icons', () => {
  it('os ícones do plugin, do módulo nativo e da tela de Aparência são os mesmos', () => {
    expect(plugin.ICONS.map((i: { name: string }) => i.name)).toEqual(APP_ICONS);
    const kotlin = readFileSync(
      join(__dirname, '../../modules/app-icon/android/src/main/java/app/ciclolivre/appicon/AppIconModule.kt'),
      'utf8',
    );
    const native = [...kotlin.matchAll(/"(\w+)" to "(MainActivity\w+)"/g)].map((m) => [m[1], `.${m[2]}`]);
    expect(native).toEqual(plugin.ICONS.map((i: { name: string; alias: string }) => [i.name, `.${i.alias}`]));
  });

  it('a MainActivity continua com deep links e sem LAUNCHER; cada ícone vira um alias com LAUNCHER', () => {
    const app = application();
    plugin.applyToApplication(app);
    const main = app.activity[0];
    expect(main['intent-filter']).toEqual([deepLink]);
    const aliases = app['activity-alias'];
    expect(aliases.map((a) => a.$['android:name'])).toEqual([
      '.MainActivityPadrao',
      '.MainActivityNoite',
      '.MainActivitySol',
      '.MainActivityDiscreto',
    ]);
    for (const a of aliases) {
      expect(a.$['android:targetActivity']).toBe('.MainActivity');
      expect(a.$['android:exported']).toBe('true');
      expect(a['intent-filter']).toEqual([launcher]);
    }
    expect(aliases[0].$).toMatchObject({ 'android:enabled': 'true', 'android:icon': '@mipmap/ic_launcher' });
    expect(aliases.slice(1).every((a) => a.$['android:enabled'] === 'false')).toBe(true);
    expect(aliases[1].$['android:icon']).toBe('@mipmap/ic_launcher_noite');
  });

  it('o ícone discreto tem nome neutro no launcher', () => {
    const app = application();
    plugin.applyToApplication(app);
    const discreto = app['activity-alias'].find((a) => a.$['android:name'] === '.MainActivityDiscreto');
    expect(discreto?.$['android:label']).toBe('Diário');
  });

  it('aplicar duas vezes não duplica nada', () => {
    const app = application();
    plugin.applyToApplication(app);
    plugin.applyToApplication(app);
    expect(app['activity-alias']).toHaveLength(4);
  });

  it('cada variante é um ícone adaptativo com fundo, frente e monocromático', () => {
    const xml = plugin.adaptiveXml('noite') as string;
    expect(xml).toContain('@color/ic_launcher_noite_background');
    expect(xml).toContain('@drawable/ic_launcher_noite_foreground');
    expect(xml).toContain('@drawable/ic_launcher_alt_monochrome');
  });

  it('o discreto tem monocromático próprio: ícones temáticos do Android não mostram os lobos', () => {
    expect(plugin.adaptiveXml('discreto')).toContain('@drawable/ic_launcher_discreto_monochrome');
  });

  it('tela de abertura discreta: fundo e desenho do ícone discreto, herdando o resto da abertura do app', () => {
    const style = plugin.discreetSplashStyle();
    expect(style.$).toEqual({ name: 'DiscreetSplash', parent: 'Theme.App.SplashScreen' });
    const items = Object.fromEntries(style.item.map((i: { $: { name: string }; _: string }) => [i.$.name, i._]));
    expect(items).toEqual({
      windowSplashScreenBackground: '@color/ic_launcher_discreto_background',
      windowSplashScreenAnimatedIcon: '@drawable/ic_launcher_discreto_foreground',
    });
  });
});
