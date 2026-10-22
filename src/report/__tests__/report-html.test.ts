import { buildCycleModel } from '@/domain/cycle/model';
import { buildReport } from '@/domain/report/report';
import { renderReportHtml } from '@/report/report-html';

const TODAY = '2026-10-22';
const flow = ['2026-08-27', '2026-08-28', '2026-09-24', '2026-09-25', '2026-10-15', '2026-10-16'];
const model = buildCycleModel(
  {
    flowDates: flow,
    seed: null,
    temperatures: {},
    eggWhiteDates: [],
    positiveOvulationTests: [],
    profileCycleLength: 28,
    profilePeriodLength: 5,
  },
  TODAY,
);
const profile = {
  birthYear: 1990,
  mode: 'period' as const,
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular' as const,
  dueDate: null,
  tryingSince: null,
  birthControl: null,
};

const html = renderReportHtml(
  buildReport({
    model,
    profile,
    selections: [],
    measures: {},
    today: TODAY,
    includeNotes: true,
    notes: [{ date: '2026-10-16', text: '<script>alert(1)</script> & "x"' }],
  }),
);

describe('renderReportHtml', () => {
  it('escapa todo texto da pessoa', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;');
  });

  it('não carrega nada de fora (sem rede)', () => {
    expect(html).not.toMatch(/(src|href)=["']?https?:/i);
    expect(html).not.toMatch(/@import|url\(/i);
  });

  it('A4, título, resumo e aviso de que não é diagnóstico nem contracepção', () => {
    expect(html).toContain('@page { size: A4');
    expect(html).toContain('Relatório do ciclo');
    expect(html).toContain('Ciclo médio');
    expect(html).toMatch(/não é diagnóstico/i);
    expect(html).toMatch(/não serve como contracepção/i);
  });

  it('declara o idioma e usa tabela com cabeçalhos para os ciclos', () => {
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<th scope="col">Início</th>');
  });

  it('plural certo nas medições e menstruação do cadastro com o mesmo texto do app', () => {
    const seeded = buildCycleModel(
      {
        flowDates: ['2026-09-24'],
        seed: { start: '2026-10-12', length: 5 },
        temperatures: {},
        eggWhiteDates: [],
        positiveOvulationTests: [],
        profileCycleLength: 28,
        profilePeriodLength: 5,
      },
      TODAY,
    );
    const out = renderReportHtml(
      buildReport({
        model: seeded,
        profile,
        selections: [],
        measures: { weight: { '2026-10-20': 64.5 } },
        today: TODAY,
        includeNotes: false,
        notes: [],
      }),
    );
    expect(out).toContain('(1 registro)');
    expect(out).toContain('informada no cadastro');
  });
});
