import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.cycle;

describe('textos do ciclo', () => {
  it('a próxima menstruação é dita como aproximada', () => {
    expect(c.nextIn(21)).toBe('Próxima menstruação: por volta de 21 dias');
    expect(c.nextIn(1)).toBe('Próxima menstruação: por volta de amanhã');
    expect(c.nextIn(0)).toBe('A menstruação pode vir hoje');
  });

  it('plural certo em "faltam"', () => {
    expect(c.dueIn(1)).toBe('Falta 1 dia para a data prevista');
    expect(c.dueIn(2)).toBe('Faltam 2 dias para a data prevista');
  });

  it('semanas sem "0 dias"', () => {
    expect(c.pregnancyWeeks(20, 0)).toBe('20 semanas');
    expect(c.pregnancyWeeks(1, 1)).toBe('1 semana e 1 dia');
  });

  it('confiança alta sem prometer certeza', () => {
    expect(c.confidence.high).not.toMatch(/firme|certeza|garant/i);
  });
});
