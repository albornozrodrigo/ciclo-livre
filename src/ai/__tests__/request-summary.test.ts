import { requestSummary } from '@/ai/request-summary';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setAiConsent } from '@/db/ai-settings-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import type { Article } from '@/content/search';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockStore.set(k, v),
  deleteItemAsync: async (k: string) => void mockStore.delete(k),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const ok = { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Resumo [[a]].' }] }) };
const KEY = 'sk-ant-api03-' + 'x'.repeat(80);
const art: Article = { id: 'a', topic: 'ciclo', title: 'A', summary: '', minutes: 1, blocks: [{ kind: 'p', text: 't' }], sources: ['f'] };

let db: ReturnType<typeof openMemoryDatabase>;
beforeEach(async () => {
  jest.clearAllMocks();
  mockStore.clear();
  db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  mockStore.set('anthropic_api_key', KEY);
  await setAiConsent(db, true);
  mockFetch.mockResolvedValue(ok);
});

describe('requestSummary', () => {
  it('relê o consentimento no momento do envio: revogado, nada sai do aparelho', async () => {
    await setAiConsent(db, false);
    expect(await requestSummary(db, 'cólica', [art])).toEqual({ ok: false, error: 'no_consent' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sem chave salva, nada sai', async () => {
    mockStore.clear();
    expect(await requestSummary(db, 'cólica', [art])).toEqual({ ok: false, error: 'no_key' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('um pedido por vez no app inteiro (pedidos pagos não correm em paralelo)', async () => {
    const [a, b] = await Promise.all([requestSummary(db, 'um', [art]), requestSummary(db, 'dois', [art])]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b]).toContainEqual({ ok: false, error: 'busy' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Terminado, libera o próximo.
    expect((await requestSummary(db, 'três', [art])).ok).toBe(true);
  });

  it('cancelado (tela fechada): o pedido é abortado', async () => {
    const controller = new AbortController();
    mockFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    const pending = requestSummary(db, 'cólica', [art], controller.signal);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    expect(await pending).toEqual({ ok: false, error: 'cancelled' });
  });
});
