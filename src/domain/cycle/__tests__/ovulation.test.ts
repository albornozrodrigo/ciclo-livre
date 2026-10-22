import { bbtOvulation, chooseOvulation, lutealLength, mucusPeakOvulation, testOvulation } from '@/domain/cycle/ovulation';

/** Temperaturas diárias a partir de um dia, para montar cenários. */
function temps(start: string, values: (number | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  const base = new Date(`${start}T12:00:00Z`).getTime();
  values.forEach((v, i) => {
    if (v === null) return;
    const d = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
    out[d] = v;
  });
  return out;
}

describe('bbtOvulation (3 sobre 6)', () => {
  it('detecta a subida e põe a ovulação no dia anterior à 1ª alta', () => {
    const t = temps('2026-09-01', [36.4, 36.3, 36.4, 36.5, 36.4, 36.3, 36.7, 36.8, 36.8]);
    expect(bbtOvulation(t, '2026-09-01', '2026-09-28')).toBe('2026-09-06');
  });

  it('exige a 3ª alta pelo menos 0,2 °C acima da maior das 6 anteriores', () => {
    const t = temps('2026-09-01', [36.4, 36.3, 36.4, 36.5, 36.4, 36.3, 36.6, 36.6, 36.6]);
    expect(bbtOvulation(t, '2026-09-01', '2026-09-28')).toBeNull();
  });

  it('só duas altas não confirmam', () => {
    const t = temps('2026-09-01', [36.4, 36.3, 36.4, 36.5, 36.4, 36.3, 36.8, 36.8]);
    expect(bbtOvulation(t, '2026-09-01', '2026-09-28')).toBeNull();
  });

  it('dias sem medição não contam como baixas nem altas', () => {
    const t = temps('2026-09-01', [36.4, null, 36.4, 36.5, 36.4, 36.3, 36.4, 36.8, 36.9, 36.9]);
    expect(bbtOvulation(t, '2026-09-01', '2026-09-28')).toBe('2026-09-07');
  });

  it('temperatura igual à maior das 6 anteriores não é alta', () => {
    const t = temps('2026-09-01', [36.4, 36.3, 36.4, 36.5, 36.4, 36.3, 36.5, 36.8, 36.8, 36.8]);
    expect(bbtOvulation(t, '2026-09-01', '2026-09-28')).toBe('2026-09-07');
  });

  it('menos de 6 medições antes não permite decidir', () => {
    expect(bbtOvulation(temps('2026-09-01', [36.4, 36.3, 36.9, 36.9, 36.9]), '2026-09-01', '2026-09-28')).toBeNull();
  });

  it('considera só o intervalo do ciclo', () => {
    const t = temps('2026-09-01', [36.4, 36.3, 36.4, 36.5, 36.4, 36.3, 36.7, 36.8, 36.8]);
    expect(bbtOvulation(t, '2026-09-08', '2026-09-28')).toBeNull();
  });
});

describe('mucusPeakOvulation', () => {
  it('o último dia de muco clara de ovo no ciclo é o pico', () => {
    expect(mucusPeakOvulation(['2026-09-12', '2026-09-13', '2026-09-14'], '2026-09-01', '2026-09-28')).toBe('2026-09-14');
  });

  it('sem muco no ciclo não há estimativa', () => {
    expect(mucusPeakOvulation(['2026-08-14'], '2026-09-01', '2026-09-28')).toBeNull();
  });
});

describe('testOvulation', () => {
  it('teste positivo → ovulação no dia seguinte ao primeiro positivo do ciclo', () => {
    expect(testOvulation(['2026-09-13', '2026-09-14'], '2026-09-01', '2026-09-28')).toBe('2026-09-14');
  });

  it('sem teste positivo no ciclo não há estimativa', () => {
    expect(testOvulation([], '2026-09-01', '2026-09-28')).toBeNull();
  });
});

describe('chooseOvulation', () => {
  it('prioridade: temperatura > teste > muco > calendário', () => {
    expect(chooseOvulation({ bbt: 'a', test: 'b', mucus: 'c', calendar: 'd' })).toEqual({ date: 'a', method: 'bbt' });
    expect(chooseOvulation({ bbt: null, test: 'b', mucus: 'c', calendar: 'd' })).toEqual({ date: 'b', method: 'test' });
    expect(chooseOvulation({ bbt: null, test: null, mucus: 'c', calendar: 'd' })).toEqual({ date: 'c', method: 'mucus' });
    expect(chooseOvulation({ bbt: null, test: null, mucus: null, calendar: 'd' })).toEqual({ date: 'd', method: 'calendar' });
  });
});

describe('lutealLength', () => {
  it('média das fases lúteas confirmadas, arredondada', () => {
    expect(
      lutealLength([
        { ovulation: '2026-08-15', nextStart: '2026-08-27' },
        { ovulation: '2026-09-12', nextStart: '2026-09-25' },
      ]),
    ).toBe(13);
  });

  it('ignora fases implausíveis e sem dados devolve null', () => {
    expect(lutealLength([{ ovulation: '2026-08-01', nextStart: '2026-08-29' }])).toBeNull();
    expect(lutealLength([])).toBeNull();
  });
});
