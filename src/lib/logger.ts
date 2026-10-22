/**
 * Logger do app. Regra de privacidade: nada de texto livre.
 * - nome do evento: snake_case fixo no código;
 * - metadados: só number e boolean (contagens, flags);
 * - erros: só error.name, nunca a mensagem (pode conter dados ou caminhos).
 */
export type LogMeta = Record<string, number | boolean>;

export type LogSink = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const PREFIX = '[ciclo-livre]';
const EVENT_NAME = /^[a-z][a-z0-9_]*$/;

function safeName(name: string): string {
  return EVENT_NAME.test(name) ? name : 'invalid_event_name';
}

function safeMeta(meta: LogMeta | undefined): LogMeta {
  const out: LogMeta = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

export function createLogger({ sink, production }: { sink: LogSink; production: boolean }) {
  return {
    event(name: string, meta?: LogMeta) {
      if (production) return;
      sink.info(`${PREFIX} ${safeName(name)}`, safeMeta(meta));
    },
    error(name: string, error: unknown) {
      const kind = error instanceof Error ? error.name : 'unknown';
      sink.error(`${PREFIX} ${safeName(name)}`, { error: kind });
    },
  };
}

// Único ponto do app que fala com o console.
export const log = createLogger({
  sink: { info: (...a) => console.info(...a), error: (...a) => console.error(...a) },
  production: typeof __DEV__ !== 'undefined' ? !__DEV__ : true,
});
