import { AI_MODELS, chat, summarize, testKey } from '@/ai/claude';
import { deleteApiKey, getApiKey, saveApiKey } from '@/ai/key-store';
import type { Article } from '@/content/search';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockStore.set(k, v),
  deleteItemAsync: async (k: string) => void mockStore.delete(k),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const reply = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body });

const KEY = 'sk-ant-api03-' + 'x'.repeat(80);
const art = (id: string): Article => ({
  id,
  topic: 'ciclo',
  title: id,
  summary: '',
  minutes: 1,
  blocks: [{ kind: 'p', text: 'texto' }],
  sources: ['f'],
});

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('key-store', () => {
  it('guarda no armazenamento seguro; recusa formato inválido; apaga', async () => {
    await expect(saveApiKey('chave-errada')).rejects.toThrow('Chave inválida');
    await saveApiKey(`  ${KEY}  `);
    expect(await getApiKey()).toBe(KEY);
    await deleteApiKey();
    expect(await getApiKey()).toBeNull();
  });
});

describe('summarize', () => {
  it('envia só a pergunta e os artigos; modelo, effort baixo e fallback; devolve texto e citações', async () => {
    mockFetch.mockResolvedValue(reply(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Calor ajuda [[a]].' }] }));
    const out = await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'cólica', articles: [art('a'), art('b')] });
    expect(out).toEqual({ ok: true, text: 'Calor ajuda.', cited: [expect.objectContaining({ id: 'a' })] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers).toEqual({
      'x-api-key': KEY,
      'anthropic-version': '2026-10-21',
      'content-type': 'application/json',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    });
    expect(JSON.parse(init.body)).toMatchObject({ model: 'claude-opus-5-5', output_config: { effort: 'low' }, fallbacks: 'default' });
    expect(init.body).not.toMatch(/menstrua.*registr|perfil|nota do dia/i);
  });

  it('Haiku não tem fallback do lado do servidor: não envia', async () => {
    mockFetch.mockResolvedValue(reply(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] }));
    await summarize({ apiKey: KEY, model: 'claude-haiku-5-5', query: 'x', articles: [art('a')] });
    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body).fallbacks).toBeUndefined();
    expect(init.headers['anthropic-beta']).toBeUndefined();
  });

  it('conta que não aceita o fallback (400 que fala do fallback): tenta uma vez sem ele', async () => {
    mockFetch
      .mockResolvedValueOnce(reply(400, { error: { type: 'invalid_request_error', message: 'fallbacks: not available for this account' } }))
      .mockResolvedValueOnce(reply(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] }));
    expect(await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'x', articles: [art('a')] })).toMatchObject({ ok: true });
    const second = mockFetch.mock.calls[1][1];
    expect(JSON.parse(second.body).fallbacks).toBeUndefined();
    expect(second.headers['anthropic-beta']).toBeUndefined();
  });

  it('outro 400 (não é o fallback): não repete o pedido', async () => {
    mockFetch.mockResolvedValue(reply(400, { error: { type: 'invalid_request_error', message: 'messages: invalid' } }));
    expect(await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'x', articles: [art('a')] })).toEqual({
      ok: false,
      error: 'unknown',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('o raciocínio conta no limite de saída: pede folga e trata resposta cortada como erro', async () => {
    mockFetch.mockResolvedValue(reply(200, { stop_reason: 'max_tokens', content: [{ type: 'text', text: 'Calor aj' }] }));
    expect(await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'x', articles: [art('a')] })).toEqual({
      ok: false,
      error: 'unknown',
    });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).max_tokens).toBeGreaterThanOrEqual(8000);
  });

  it('recusa vira erro "refusal"', async () => {
    mockFetch.mockResolvedValue(reply(200, { stop_reason: 'refusal', content: [] }));
    expect(await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'x', articles: [art('a')] })).toEqual({
      ok: false,
      error: 'refusal',
    });
  });

  it.each([
    [401, 'invalid_key'],
    [403, 'invalid_key'],
    [402, 'billing'],
    [429, 'rate_limit'],
    [529, 'overloaded'],
    [500, 'overloaded'],
  ])('HTTP %s vira "%s"', async (status, kind) => {
    mockFetch.mockResolvedValue(reply(status));
    expect(await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'x', articles: [art('a')] })).toEqual({
      ok: false,
      error: kind,
    });
  });

  it('sem rede vira "offline"', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    expect(await summarize({ apiKey: KEY, model: 'claude-opus-5-5', query: 'x', articles: [art('a')] })).toEqual({
      ok: false,
      error: 'offline',
    });
  });
});

describe('chat', () => {
  it('manda as instruções e as mensagens recebidas como estão; devolve o texto', async () => {
    mockFetch.mockResolvedValue(reply(200, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Seus ciclos variam pouco.' }] }));
    const messages = [
      { role: 'user' as const, content: '<dados>x</dados>\n\n<pergunta>a</pergunta>' },
      { role: 'assistant' as const, content: 'b' },
      { role: 'user' as const, content: '<pergunta>c</pergunta>' },
    ];
    expect(await chat({ apiKey: KEY, model: 'claude-sonnet-5-5', system: 'S', messages })).toEqual({
      ok: true,
      text: 'Seus ciclos variam pouco.',
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'claude-sonnet-5-5', system: 'S', messages });
  });
});

describe('testKey', () => {
  it('lista modelos (sem custo): ok; 401 vira invalid_key', async () => {
    mockFetch.mockResolvedValue(reply(200, { data: [] }));
    expect(await testKey(KEY)).toEqual({ ok: true });
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/models?limit=1');
    mockFetch.mockResolvedValue(reply(401));
    expect(await testKey(KEY)).toEqual({ ok: false, error: 'invalid_key' });
  });

  it('modelos oferecidos: Opus 5.5 primeiro (padrão)', () => {
    expect(AI_MODELS[0]).toBe('claude-opus-5-5');
  });
});

describe('cancelamento', () => {
  it('sinal já cancelado antes de começar: volta na hora como "cancelled"', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => new Promise(() => undefined) });
    const controller = new AbortController();
    controller.abort();
    const pending = summarize({ apiKey: KEY, model: 'claude-haiku-5-5', query: 'x', articles: [art('a')], signal: controller.signal });
    await jest.advanceTimersByTimeAsync(10);
    expect(await pending).toEqual({ ok: false, error: 'cancelled' });
    jest.useRealTimers();
  });
});

describe('tempo limite', () => {
  it('cobre também a leitura da resposta (corpo que nunca chega não prende a tela)', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => new Promise(() => undefined) });
    const pending = summarize({ apiKey: KEY, model: 'claude-haiku-5-5', query: 'x', articles: [art('a')] });
    await jest.advanceTimersByTimeAsync(46_000);
    expect(await pending).toEqual({ ok: false, error: 'offline' });
    jest.useRealTimers();
  });
});
