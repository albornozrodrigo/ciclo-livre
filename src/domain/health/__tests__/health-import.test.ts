import { mapHealthConnect } from '@/domain/health/health-import';

// Aparelho em São Paulo (UTC−3) nos testes.
const device = () => -3 * 3600;
const at = (time: string, value: number, offsetSeconds?: number) => ({ time, value, offsetSeconds });

describe('mapHealthConnect', () => {
  it('dia local vem do fuso do registro (ou do aparelho); 01:30 UTC ainda é o dia anterior em São Paulo', () => {
    const out = mapHealthConnect({ weight: [at('2026-10-20T01:30:00Z', 64.5)] }, device);
    expect(out.measures).toEqual([{ date: '2026-10-19', category: 'weight', value: 64.5 }]);
    const tokyo = mapHealthConnect({ weight: [at('2026-10-20T20:00:00Z', 64.5, 9 * 3600)] }, device);
    expect(tokyo.measures[0].date).toBe('2026-10-21');
  });

  it('peso: o último do dia, 1 casa', () => {
    const out = mapHealthConnect({ weight: [at('2026-10-20T10:00:00Z', 64.04), at('2026-10-20T20:00:00Z', 63.96)] }, device);
    expect(out.measures).toEqual([{ date: '2026-10-20', category: 'weight', value: 64 }]);
  });

  it('temperatura basal: a primeira do dia (ao acordar), 2 casas', () => {
    const out = mapHealthConnect({ basalTemperature: [at('2026-10-20T15:00:00Z', 36.9), at('2026-10-20T09:00:00Z', 36.456)] }, device);
    expect(out.measures).toEqual([{ date: '2026-10-20', category: 'temperature', value: 36.46 }]);
  });

  it('FC em repouso: a menor do dia; VFC: a média do dia (inteiros)', () => {
    const out = mapHealthConnect(
      {
        restingHeartRate: [at('2026-10-20T10:00:00Z', 62), at('2026-10-20T12:00:00Z', 58)],
        hrv: [at('2026-10-20T08:00:00Z', 40), at('2026-10-20T09:00:00Z', 45)],
      },
      device,
    );
    expect(out.measures).toEqual(
      expect.arrayContaining([
        { date: '2026-10-20', category: 'resting_heart_rate', value: 58 },
        { date: '2026-10-20', category: 'hrv', value: 43 },
      ]),
    );
  });

  it('sono: soma das sessões que terminam no dia → faixa, no dia em que acordou', () => {
    const out = mapHealthConnect(
      {
        sleep: [
          { startTime: '2026-10-20T02:00:00Z', endTime: '2026-10-20T08:30:00Z' }, // 23h–5h30 local: 6h30
          { startTime: '2026-10-20T16:00:00Z', endTime: '2026-10-20T17:00:00Z' }, // cochilo de 1h no mesmo dia
        ],
      },
      device,
    );
    expect(out.selections).toEqual([{ date: '2026-10-20', category: 'sleep', option: '6_9h' }]);
  });

  it('sono: sessões sobrepostas (relógio e celular gravando a mesma noite) contam uma vez', () => {
    const out = mapHealthConnect(
      {
        sleep: [
          { startTime: '2026-10-20T02:00:00Z', endTime: '2026-10-20T08:00:00Z' },
          { startTime: '2026-10-20T02:30:00Z', endTime: '2026-10-20T08:00:00Z' },
        ],
      },
      device,
    );
    // 6 h, não 11 h30.
    expect(out.selections).toEqual([{ date: '2026-10-20', category: 'sleep', option: '6_9h' }]);
  });

  it('fora da faixa do catálogo, data absurda ou sessão invertida: descartado e contado', () => {
    const out = mapHealthConnect(
      {
        weight: [at('2026-10-20T10:00:00Z', 900)],
        restingHeartRate: [at('9999-01-01T10:00:00Z', 60)],
        hrv: [at('2026-10-20T10:00:00Z', Number.NaN)],
        sleep: [{ startTime: '2026-10-20T08:00:00Z', endTime: '2026-10-20T02:00:00Z' }],
      },
      device,
    );
    expect(out.measures).toEqual([]);
    expect(out.selections).toEqual([]);
    expect(out.dropped).toBe(4);
  });

  it('conta os dias com algum valor', () => {
    const out = mapHealthConnect({ weight: [at('2026-10-20T10:00:00Z', 64)], restingHeartRate: [at('2026-10-21T10:00:00Z', 60)] }, device);
    expect(out.days).toBe(2);
  });
});
