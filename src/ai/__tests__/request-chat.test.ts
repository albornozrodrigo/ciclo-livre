import { previewChatContext, requestChat } from '@/ai/request-chat';
import { requestSummary } from '@/ai/request-summary';
import type { Article } from '@/content/search';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setAiConsent, setChatConsent, setChatScope } from '@/db/ai-settings-repo';
import { listChat } from '@/db/chat-repo';
import { setNote, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import { createTag, setDayTags } from '@/db/tag-repo';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockStore.set(k, v),
  deleteItemAsync: async (k: string) => void mockStore.delete(k),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const answer = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] }),
});
const KEY = 'sk-ant-api03-' + 'x'.repeat(80);
const NOW = new Date(2026, 9, 23, 10, 0);
const art: Article = { id: 'a', topic: 'ciclo', title: 'A', summary: '', minutes: 1, blocks: [{ kind: 'p', text: 't' }], sources: ['f'] };

let db: ReturnType<typeof openMemoryDatabase>;
beforeEach(async () => {
  jest.clearAllMocks();
  mockStore.clear();
  mockStore.set('anthropic_api_key', KEY);
  db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  await saveProfile(
    db,
    {
      birthYear: 1987,
      mode: 'period',
      lastPeriodStart: '2026-09-25',
      periodLength: 5,
      cycleLength: 28,
      regularity: 'regular',
      dueDate: null,
      tryingSince: null,
      birthControl: 'pill',
    },
    NOW,
  );
  for (const d of ['2026-08-28', '2026-08-29', '2026-08-30', '2026-09-25', '2026-09-26', '2026-09-27'])
    await setSelection(db, d, 'period', ['medium']);
  await setNote(db, '2026-09-26', 'Nota muito pessoal');
  const tag = await createTag(db, 'Plantão noturno');
  await setDayTags(db, '2026-09-26', [tag.id]);
  await setAiConsent(db, true);
  await setChatConsent(db, true);
  mockFetch.mockResolvedValue(answer('Seus ciclos têm 28 dias.'));
});

const sentBody = () => JSON.parse(mockFetch.mock.calls[0][1].body);

describe('requestChat', () => {
  it('sem o consentimento do chat (mesmo com o dos artigos), nada sai do aparelho', async () => {
    await setChatConsent(db, false);
    expect(await requestChat(db, 'Meus ciclos são regulares?', undefined, NOW)).toEqual({ ok: false, error: 'no_consent' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sem chave, nada sai', async () => {
    mockStore.clear();
    expect(await requestChat(db, 'oi', undefined, NOW)).toEqual({ ok: false, error: 'no_key' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('pergunta vazia ou longa demais é recusada antes da rede', async () => {
    expect(await requestChat(db, '   ', undefined, NOW)).toEqual({ ok: false, error: 'empty' });
    expect(await requestChat(db, 'x'.repeat(3001), undefined, NOW)).toEqual({ ok: false, error: 'too_long' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('envia o resumo exato (o mesmo da prévia) e a pergunta; sem ano de nascimento, tags nem notas', async () => {
    const preview = await previewChatContext(db, undefined, NOW);
    const out = await requestChat(db, 'Meus ciclos são regulares?', undefined, NOW);
    expect(out).toEqual({ ok: true, text: 'Seus ciclos têm 28 dias.' });
    const first = sentBody().messages[0].content as string;
    expect(first).toContain(`<dados>\n${preview.text}\n</dados>`);
    expect(first).toContain('<pergunta>Meus ciclos são regulares?</pergunta>');
    const raw = JSON.stringify(sentBody());
    expect(raw).not.toContain('1987');
    expect(raw).not.toContain('Plantão');
    expect(raw).not.toContain('Nota muito pessoal');
    expect(preview.text).toContain('Método contraceptivo: Pílula');
  });

  it('com notas ligadas, a nota vai e a prévia mostra igual', async () => {
    await setChatScope(db, { cycles: 6, includeNotes: true });
    const preview = await previewChatContext(db, undefined, NOW);
    expect(preview.text).toContain('Nota muito pessoal');
    await requestChat(db, 'e as notas?', undefined, NOW);
    expect(sentBody().messages[0].content).toContain(preview.text);
  });

  it('a prévia aceita um escopo ainda não salvo (a tela de consentimento mostra antes de gravar)', async () => {
    const preview = await previewChatContext(db, { cycles: 12, includeNotes: true }, NOW);
    expect(preview.text).toContain('Nota muito pessoal');
  });

  it('sucesso guarda pergunta e resposta; erro não guarda; a conversa vai junto na próxima', async () => {
    await requestChat(db, 'primeira', undefined, NOW);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    expect(await requestChat(db, 'falha', undefined, NOW)).toEqual({ ok: false, error: 'invalid_key' });
    expect(await listChat(db)).toEqual([
      { role: 'user', text: 'primeira' },
      { role: 'assistant', text: 'Seus ciclos têm 28 dias.' },
    ]);
    await requestChat(db, 'segunda', undefined, NOW);
    const messages = JSON.parse(mockFetch.mock.calls[2][1].body).messages;
    expect(messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(messages[2].content).toBe('<pergunta>segunda</pergunta>');
  });

  it('um pedido de IA por vez no app inteiro (chat e resumo de artigos)', async () => {
    const [a, b] = await Promise.all([requestChat(db, 'um', undefined, NOW), requestSummary(db, 'dois', [art])]);
    expect([a, b]).toContainEqual({ ok: false, error: 'busy' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
