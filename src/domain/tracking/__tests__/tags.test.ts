import { normalizeTagKey, validateTagName } from '@/domain/tracking/tags';

describe('validateTagName', () => {
  it('aceita nome comum e devolve aparado', () => {
    expect(validateTagName('  Viagem ', [])).toEqual({ ok: true, name: 'Viagem' });
  });

  it('recusa vazio ou só espaços', () => {
    expect(validateTagName('   ', [])).toEqual({ ok: false, error: 'empty' });
  });

  it('recusa acima de 30 caracteres', () => {
    expect(validateTagName('a'.repeat(31), [])).toEqual({ ok: false, error: 'too_long' });
  });

  it('recusa duplicata ignorando maiúsculas e acentos', () => {
    expect(validateTagName('cafe', ['Café'])).toEqual({ ok: false, error: 'duplicate' });
  });

  it('não há limite de quantidade', () => {
    const existing = Array.from({ length: 500 }, (_, i) => `tag ${i}`);
    expect(validateTagName('mais uma', existing).ok).toBe(true);
  });
});

describe('normalizeTagKey', () => {
  it('tira acentos, maiúsculas e espaços extras', () => {
    expect(normalizeTagKey('  Cólica   Forte ')).toBe('colica forte');
  });
});
