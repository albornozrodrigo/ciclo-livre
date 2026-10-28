import { buildReport, REPORT_REASONS, REPORT_TEXT_MAX, reportMailto } from '@/domain/ai/report';

const base = { kind: 'chat' as const, reason: 'harmful' as const, response: 'Resposta do Claude.', appVersion: '0.1.3' };

describe('buildReport', () => {
  it('leva o motivo, onde apareceu, a versão do app e a resposta denunciada', () => {
    const report = buildReport(base);

    expect(report.subject).toBe('Denúncia de resposta da IA (Ciclo Livre)');
    expect(report.body).toContain('Motivo: Perigosa para a saúde');
    expect(report.body).toContain('Onde: chat com seus dados');
    expect(report.body).toContain('Versão do app: 0.1.3');
    expect(report.body).toContain('Resposta do Claude.');
  });

  it('o resumo de artigos aparece como o lugar da resposta', () => {
    expect(buildReport({ ...base, kind: 'summary' }).body).toContain('Onde: resumo dos artigos');
  });

  it('corta resposta longa para o link de e-mail não quebrar', () => {
    const long = 'a'.repeat(REPORT_TEXT_MAX + 500);

    const body = buildReport({ ...base, response: long }).body;

    expect(body).toContain(`${'a'.repeat(REPORT_TEXT_MAX)}…`);
    expect(body).not.toContain('a'.repeat(REPORT_TEXT_MAX + 1));
  });

  it('avisa que a pessoa pode apagar o que não quiser mandar', () => {
    expect(buildReport(base).body).toMatch(/apague o que não quiser enviar/);
  });

  it('todo motivo tem rótulo', () => {
    for (const reason of REPORT_REASONS) expect(buildReport({ ...base, reason }).body).not.toContain('undefined');
  });
});

describe('reportMailto', () => {
  it('monta o mailto para o endereço do projeto com assunto e corpo codificados', () => {
    const url = reportMailto(buildReport(base));

    expect(url.startsWith('mailto:af.rodrigo@proton.me?subject=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Denúncia de resposta da IA (Ciclo Livre)'));
    expect(url).toContain('&body=');
    expect(url).not.toMatch(/\s/);
  });

  it('um "&" ou "?" na resposta não quebra os parâmetros', () => {
    const url = reportMailto(buildReport({ ...base, response: 'a & b ? c=d' }));

    expect(url.match(/&body=/g)).toHaveLength(1);
    expect(decodeURIComponent(url.split('&body=')[1])).toContain('a & b ? c=d');
  });
});
