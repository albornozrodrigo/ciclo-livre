import type { IsoDate } from '@/domain/dates';
import { CATALOG } from '@/domain/tracking/catalog';

import type { DayTag, Measure, Note, Selection } from './format';

/** Rótulos injetados (o domínio não depende do idioma). */
export type CsvLabels = {
  category: (id: string) => string;
  option: (category: string, option: string) => string;
  date: string;
  tags: string;
  note: string;
};

type CsvInput = { selections: Selection[]; measures: Measure[]; notes: Note[]; dayTags: DayTag[] };

const BOM = '﻿';
/** `;` entre colunas: o Excel em pt-BR usa `;` (a vírgula é o separador decimal). O Sheets detecta sozinho. */
const SEP = ';';
const NEEDS_QUOTES = /[";\r\n]/;
// Começo que planilhas tratam como fórmula (injeção de fórmula em CSV), inclusive depois de espaços
// ou quebras e com os sinais de largura total (＝＋－＠) que algumas planilhas também aceitam.
const FORMULA_START = /^[\t\r]|^\s*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/;

/** Célula de texto: neutraliza fórmula (apóstrofo) e escapa conforme a RFC 4180. */
function textCell(value: string): string {
  if (FORMULA_START.test(value)) return `"'${value.replace(/"/g, '""')}"`;
  return NEEDS_QUOTES.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Número com vírgula decimal (pt-BR). */
const numberCell = (value: number) => textCell(String(value).replace('.', ','));

/**
 * Planilha do diário: uma linha por dia com registro, colunas na ordem do catálogo.
 * UTF-8 com BOM, CRLF e `;`, para abrir certo no Excel em pt-BR e no Google Sheets.
 */
export function buildCsv(data: CsvInput, labels: CsvLabels): string {
  const used = new Set([...data.selections.map((s) => s.category), ...data.measures.map((m) => m.category)]);
  const columns = CATALOG.filter((c) => used.has(c.id)).map((c) => c.id);

  type Day = { options: Map<string, string[]>; measures: Map<string, number>; tags: string[]; note: string };
  const days = new Map<IsoDate, Day>();
  const day = (date: IsoDate) => {
    let d = days.get(date);
    if (!d) {
      d = { options: new Map(), measures: new Map(), tags: [], note: '' };
      days.set(date, d);
    }
    return d;
  };
  for (const s of data.selections) {
    const d = day(s.date);
    d.options.set(s.category, [...(d.options.get(s.category) ?? []), labels.option(s.category, s.option)]);
  }
  for (const m of data.measures) day(m.date).measures.set(m.category, m.value);
  for (const t of data.dayTags) day(t.date).tags.push(t.tag);
  for (const n of data.notes) day(n.date).note = n.text;

  const header = [labels.date, ...columns.map(labels.category), labels.tags, labels.note].map(textCell).join(SEP);
  const rows = [...days.keys()].sort().map((date) => {
    const d = days.get(date) as Day;
    const cells = columns.map((id) => {
      const measure = d.measures.get(id);
      if (measure !== undefined) return numberCell(measure);
      const options = d.options.get(id);
      return options ? textCell(options.join(', ')) : '';
    });
    return [date, ...cells, d.tags.length ? textCell(d.tags.join(', ')) : '', d.note ? textCell(d.note) : ''].join(SEP);
  });
  return BOM + [header, ...rows].join('\r\n');
}
