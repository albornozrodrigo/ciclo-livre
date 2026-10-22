import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';

import { Palette } from '@/constants/theme';

import { BarChart } from '../bar-chart';

const bars = [
  { key: 'a', value: 28, label: 'Ciclo A: 28 dias' },
  { key: 'b', value: 30, label: 'Ciclo B: 30 dias', emphasized: true },
];

async function renderChart() {
  await render(<BarChart bars={bars} reference={29} referenceLabel="média 29" summary="resumo" />);
  await fireEvent(screen.getByLabelText('resumo').parent!, 'layout', { nativeEvent: { layout: { width: 300, height: 140 } } });
}

// react-native-svg converte a cor para número nativo; comparamos no mesmo formato.
const fillOf = (key: string) => screen.getByTestId(`bar-${key}`, { includeHiddenElements: true }).props.fill.payload;
const ink = processColor(Palette.light.ink);
const muted = processColor(Palette.light.inkMuted);

describe('BarChart', () => {
  it('sem seleção, só a barra destacada fica em tinta', async () => {
    await renderChart();
    expect(fillOf('b')).toBe(ink);
    expect(fillOf('a')).toBe(muted);
  });

  it('com uma barra tocada, só ela fica em tinta (a destacada volta ao tom suave)', async () => {
    await renderChart();
    await fireEvent.press(screen.getByRole('button', { name: 'Ciclo A: 28 dias' }));
    expect(screen.getByText('Ciclo A: 28 dias')).toBeOnTheScreen();
    expect(fillOf('a')).toBe(ink);
    expect(fillOf('b')).toBe(muted);
  });
});
