import type { IsoDate } from '@/domain/dates';
import type { Report } from '@/domain/report/report';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';

const t = ptBR.report;

/** Escapa todo texto que vai para o HTML (notas, tags e rótulos). */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const date = (iso: IsoDate) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const num = (n: number, decimals = 1) => n.toFixed(decimals).replace('.', ',');
const MEASURE_UNITS = {
  weight: ['Peso', 'kg', 1],
  resting_heart_rate: ['FC em repouso', 'bpm', 0],
  hrv: ['VFC', 'ms', 0],
  sleep: ['Sono', 'h', 1],
} as const;

/** Gráfico de temperatura em SVG inline (sem recursos externos), legível em preto e branco. */
function bbtSvg(points: { cycleDay: number; value: number }[], coverLine: number | null): string {
  const W = 640;
  const H = 180;
  const P = 28;
  const xs = points.map((p) => p.cycleDay);
  const ys = points.map((p) => p.value);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs, Math.min(...xs) + 1)];
  const [minY, maxY] = [Math.min(...ys) - 0.1, Math.max(...ys) + 0.1];
  const x = (v: number) => P + ((v - minX) / (maxX - minX)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - minY) / (maxY - minY)) * (H - 2 * P);
  const line = points.map((p) => `${x(p.cycleDay).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const cover =
    coverLine === null
      ? ''
      : `<line x1="${P}" x2="${W - P}" y1="${y(coverLine).toFixed(1)}" y2="${y(coverLine).toFixed(1)}" stroke="#555" stroke-dasharray="6 4"/>`;
  const dots = points
    .map((p) => `<circle cx="${x(p.cycleDay).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" fill="#2C2E2A"/>`)
    .join('');
  return `<svg role="img" aria-label="${escapeHtml(t.bbt)}" viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
    <line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" stroke="#999"/>${cover}
    <polyline points="${line}" fill="none" stroke="#2C2E2A" stroke-width="2"/>${dots}
    <text x="${P}" y="${H - 8}" font-size="11">${num(Math.min(...ys), 2)}–${num(Math.max(...ys), 2)} °C</text>
  </svg>`;
}

/** Relatório em HTML para o PDF (A4, só fonte do sistema, nada de rede). */
export function renderReportHtml(report: Report): string {
  const c = report.cycles;
  const sections: string[] = [];

  if (c) {
    const s = c.summary;
    sections.push(`<h2>${t.summary}</h2>
      ${
        s
          ? `<dl class="stats">
          <div><dt>${t.cycleMean}</dt><dd>${t.days(s.mean)}</dd></div>
          <div><dt>${t.range}</dt><dd>${s.min === s.max ? t.days(s.min) : `${s.min}–${s.max} dias`}</dd></div>
          ${s.periodMean !== null ? `<div><dt>${t.periodMean}</dt><dd>${t.days(s.periodMean)}</dd></div>` : ''}
        </dl><p class="muted">${t.basis(s.count)}</p>`
          : `<p class="muted">${t.basis(0)}</p>`
      }`);

    // Com contracepção hormonal nenhuma linha tem ovulação: a coluna sai do relatório.
    const showOvulation = [c.current, ...c.complete].some((r) => r.ovulation !== null);
    const row = (r: (typeof c.complete)[number], isCurrent: boolean) =>
      `<tr><td>${date(r.start)}</td><td>${isCurrent ? t.current : t.days(r.length ?? 0)}</td>
        <td>${r.periodLength === null ? t.notRecorded : t.days(r.periodLength)}</td>
        ${showOvulation ? `<td>${r.ovulation === null ? '—' : `${date(r.ovulation.date)} (${isCurrent && r.ovulation.method === 'calendar' ? t.forecast : t.methods[r.ovulation.method]})`}</td>` : ''}</tr>`;
    sections.push(`<h2>${t.cycles}</h2>
      <table><thead><tr><th scope="col">${t.cols.start}</th><th scope="col">${t.cols.length}</th><th scope="col">${t.cols.period}</th>${showOvulation ? `<th scope="col">${t.cols.ovulation}</th>` : ''}</tr></thead>
      <tbody>${row(c.current, true)}${c.complete.map((r) => row(r, false)).join('')}</tbody></table>`);

    const symptoms = c.symptoms.map((r) => {
      const label = categoryLabels(r.category).options?.[r.option] ?? r.option;
      return `<li>${escapeHtml(t.symptomRow(label, r.cycles, r.total, ptBR.cycle.phases[r.phase]))}</li>`;
    });
    sections.push(`<h2>${t.symptoms}</h2>${symptoms.length ? `<ul>${symptoms.join('')}</ul>` : `<p class="muted">${t.noSymptoms}</p>`}`);

    sections.push(
      `<h2>${t.bbt}</h2>${
        c.bbt.points.length >= 3
          ? `${bbtSvg(c.bbt.points, c.bbt.coverLine)}${c.bbt.coverLine !== null ? `<p class="muted">${t.coverLegend}</p>` : ''}<p>${c.bbt.fertilityHidden ? t.bbtHormonal : c.bbt.ovulationDay ? t.bbtConfirmed(c.bbt.ovulationDay) : ''}</p>`
          : `<p class="muted">${t.bbtNone}</p>`
      }`,
    );
  } else {
    sections.push(`<p class="muted">${t.noCycle}</p>`);
  }

  const measures = (Object.keys(MEASURE_UNITS) as (keyof typeof MEASURE_UNITS)[]).flatMap((key) => {
    const series = report.measures[key];
    if (!series.summary) return [];
    const [name, unit, decimals] = MEASURE_UNITS[key];
    return [
      `<li>${escapeHtml(t.measureRow(name, `${num(series.summary.last, decimals)} ${unit}`, `${num(series.summary.mean, decimals)} ${unit}`, series.points.length))}</li>`,
    ];
  });
  if (measures.length) sections.push(`<h2>${t.measures}</h2><ul>${measures.join('')}</ul>`);

  const method = report.birthControl ? ptBR.onboarding.birthControl.options[report.birthControl] : t.notInformed;
  sections.push(
    `<h2>${t.birthControl}</h2><p>${escapeHtml(method)}</p><p class="muted">${escapeHtml(t.mode(ptBR.onboarding.mode.options[report.mode].label))}</p>`,
  );

  if (report.notes.length) {
    sections.push(
      `<h2>${t.notes}</h2><ul>${report.notes.map((n) => `<li><strong>${date(n.date)}</strong>: ${escapeHtml(n.text)}</li>`).join('')}</ul>`,
    );
  }

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${t.title}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: sans-serif; color: #2C2E2A; font-size: 12pt; line-height: 1.45; }
  h1 { font-size: 22pt; margin: 0 0 4px; letter-spacing: -0.03em; }
  h2 { font-size: 14pt; margin: 22px 0 8px; border-bottom: 1.5px solid #2C2E2A; padding-bottom: 4px; }
  .muted { color: #5B5E57; }
  .stats { display: flex; gap: 32px; margin: 0; }
  .stats dt { font-size: 10pt; color: #5B5E57; } .stats dd { margin: 0; font-size: 16pt; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #bbb; }
  th { font-size: 10pt; }
  .disclaimer { margin-top: 28px; padding: 10px 14px; border: 1.5px solid #2C2E2A; border-radius: 14px; font-size: 10pt; }
  h2 { break-after: avoid; }
  tr, li, .disclaimer, svg { break-inside: avoid; }
</style></head>
<body>
  <h1>${t.title}</h1>
  <p class="muted">${t.subtitle}<br>${t.period(date(report.period.from), date(report.period.to))} · ${t.generated(date(report.generatedOn))}</p>
  ${sections.join('\n')}
  <p class="disclaimer">${t.disclaimer}</p>
</body></html>`;
}
