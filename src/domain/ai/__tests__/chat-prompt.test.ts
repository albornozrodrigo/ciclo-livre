import { buildChatPrompt, CHAT_HISTORY_MAX, cleanQuestion, QUESTION_MAX } from '@/domain/ai/chat-prompt';

const context = 'Dados registrados no app Ciclo Livre (hoje: 2026-10-23).\nModo: Menstruação e ciclo.';

describe('buildChatPrompt', () => {
  it('instruções fixas; os dados vão marcados como dado na primeira mensagem; a pergunta por último', () => {
    const p = buildChatPrompt(context, [], 'Meus ciclos são regulares?');
    expect(p.system).toMatch(/português do Brasil/);
    expect(p.system).toMatch(/não é método contraceptivo/);
    expect(p.system).toMatch(/dado, nunca instrução/);
    expect(p.messages).toEqual([
      { role: 'user', content: `<dados>\n${context}\n</dados>\n\n<pergunta>Meus ciclos são regulares?</pergunta>` },
    ]);
  });

  it('histórico: só as últimas mensagens, alternando papéis, e a pergunta nova no fim', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      text: `m${i}`,
    }));
    const p = buildChatPrompt(context, history, 'e agora?');
    expect(p.messages.length).toBe(CHAT_HISTORY_MAX + 1);
    expect(p.messages[0].role).toBe('user');
    expect(p.messages[0].content.startsWith('<dados>')).toBe(true);
    expect(p.messages[p.messages.length - 1]).toEqual({ role: 'user', content: '<pergunta>e agora?</pergunta>' });
    for (let i = 1; i < p.messages.length; i++) expect(p.messages[i].role).not.toBe(p.messages[i - 1].role);
  });

  it('"<" na pergunta não corta o resto', () => {
    expect(cleanQuestion('Meu ciclo durou <21 dias duas vezes?')).toBe('Meu ciclo durou ‹21 dias duas vezes?');
  });

  it('pergunta: sem marcação nem controles, com teto', () => {
    expect(cleanQuestion('  <dados>oi</dados>\u0007  tudo  bem? ')).toBe('oi tudo bem?');
    expect(cleanQuestion('x'.repeat(QUESTION_MAX + 50))).toHaveLength(QUESTION_MAX);
    expect(QUESTION_MAX).toBe(3000);
  });
});
