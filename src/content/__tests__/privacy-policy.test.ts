import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PRIVACY_POLICY } from '@/content/privacy-policy';
import { ptBR } from '@/i18n/pt-BR';

const text = PRIVACY_POLICY.blocks.map((b) => (b.kind === 'list' ? b.items.join(' ') : b.text)).join('\n');

describe('política de privacidade', () => {
  it('tem data de vigência', () => {
    expect(PRIVACY_POLICY.effective).toMatch(/^\d{1,2} de [a-zç]+ de \d{4}$/);
  });

  it('diz tudo o que o chat manda (modo, método, fase de hoje e as últimas mensagens), não só os ciclos', () => {
    for (const part of ['modo de uso', 'método contraceptivo', 'fase do ciclo', 'últimas mensagens']) expect(text).toContain(part);
  });

  it('não declara permissão que o app.json bloqueia', () => {
    const app = JSON.parse(readFileSync(join(__dirname, '../../../app.json'), 'utf8'));
    expect(app.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE']),
    );
    expect(text).not.toMatch(/sobreposição|armazenamento externo/i);
  });

  it('cita cada tipo lido do Health Connect e o único destino de rede (Anthropic)', () => {
    for (const label of ['sono', 'temperatura basal', 'frequência cardíaca em repouso', 'variabilidade da frequência cardíaca', 'peso']) {
      expect(text.toLowerCase()).toContain(label);
    }
    const claude = readFileSync(join(__dirname, '../../ai/claude.ts'), 'utf8');
    expect(claude).toContain('https://api.anthropic.com');
    expect(text).toContain('Anthropic');
  });

  it('explica toda permissão declarada no app.json', () => {
    const app = JSON.parse(readFileSync(join(__dirname, '../../../app.json'), 'utf8'));
    const permissions: string[] = app.expo.android.permissions;
    if (permissions.some((p) => p.includes('.health.'))) expect(text).toContain('Health Connect (leitura)');
    expect(text).toContain('Internet');
    expect(text).toContain('Notificações');
  });

  it('aponta para telas que existem com esses nomes', () => {
    expect(text).toContain(`Mais › ${ptBR.data.mais}`);
    expect(text).toContain(`Mais › ${ptBR.ai.mais}`);
    expect(text).toContain(`Mais › ${ptBR.privacy.title}`);
  });
});
