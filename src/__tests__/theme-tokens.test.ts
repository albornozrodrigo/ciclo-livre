import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Palette } from '@/constants/theme';

const css = readFileSync(join(__dirname, '../global.css'), 'utf8');

function block(name: string): Record<string, string> {
  const body = css.split(`${name} {`)[1].split('}')[0];
  return Object.fromEntries([...body.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('tokens de cor (DESIGN.md) iguais nos três lugares', () => {
  it('@theme e :root têm os mesmos valores', () => {
    expect(block(':root')).toEqual(block('@theme'));
  });

  it('theme.ts espelha o @theme (claro e "-night")', () => {
    const theme = block('@theme');
    for (const [key, value] of Object.entries(Palette.light)) expect([key, value.toLowerCase()]).toEqual([key, theme[kebab(key)]]);
    for (const [key, value] of Object.entries(Palette.dark))
      expect([key, value.toLowerCase()]).toEqual([key, theme[`${kebab(key)}-night`]]);
  });
});
