import { createLogger, type LogSink } from '@/lib/logger';

function capture() {
  const lines: unknown[][] = [];
  const sink: LogSink = { info: (...a) => lines.push(['info', ...a]), error: (...a) => lines.push(['error', ...a]) };
  return { lines, sink };
}

describe('logger', () => {
  it('em desenvolvimento registra o evento com metadados numéricos e booleanos', () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, production: false });

    log.event('db_opened', { migrations: 1, encrypted: true });

    expect(lines).toEqual([['info', '[ciclo-livre] db_opened', { migrations: 1, encrypted: true }]]);
  });

  it('em produção não emite eventos informativos', () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, production: true });

    log.event('db_opened');

    expect(lines).toEqual([]);
  });

  it('descarta em runtime metadados que não sejam number ou boolean', () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, production: false });

    // @ts-expect-error texto livre é proibido pelo tipo
    log.event('note_saved', { length: 12, text: 'conteúdo sensível', nested: { a: 1 } });

    expect(lines).toEqual([['info', '[ciclo-livre] note_saved', { length: 12 }]]);
  });

  it('erro registra só o evento e error.name, nunca a mensagem', () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, production: true });

    log.error('db_open_failed', new TypeError('chave abc123 em /data/user/0'));

    expect(lines).toEqual([['error', '[ciclo-livre] db_open_failed', { error: 'TypeError' }]]);
  });

  it('erro com valor que não é Error registra como unknown', () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, production: false });

    log.error('weird', 'segredo em string');

    expect(lines).toEqual([['error', '[ciclo-livre] weird', { error: 'unknown' }]]);
  });

  it('recusa nome de evento fora do formato snake_case', () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, production: false });

    log.event('Nota: menstruação dia 3');

    expect(lines).toEqual([['info', '[ciclo-livre] invalid_event_name', {}]]);
  });
});
