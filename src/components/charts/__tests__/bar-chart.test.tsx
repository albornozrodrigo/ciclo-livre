import { fireEvent, render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';

import { Palette } from '@/constants/theme';

import { BarChart } from '../bar-chart';

const bars = [
  { key: 'a', value: 28, label: 'Ciclo A: 28 dias', base: 3 },
  { key: 'b', value: 30, label: 'Ciclo B: 30 dias', emphasized: true, base: 5 },
];

async function renderChart(list = bars) {
  const result = await render(<BarChart bars={list} reference={29} referenceLabel="média 29" summary="resumo" restingLabel="último completo" />);
  await fireEvent(screen.getByLabelText('resumo').parent!, 'layout', { nativeEvent: { layout: { width: 300, height: 140 } } });
  return result;
}

// react-native-svg converte a cor para número nativo; comparamos no mesmo formato.
const fillOf = (key: string) => screen.getByTestId(`bar-${key}`, { includeHiddenElements: true }).props.fill.payload;
const ink = processColor(Palette.light.ink);
const muted = processColor(Palette.light.inkMuted);

describe('BarChart', () => {
  it('sem toque, o rótulo mostra a barra destacada com o texto de repouso', async () => {
    await renderChart();
    expect(screen.getByText('Ciclo B: 30 dias · último completo')).toBeOnTheScreen();
  });

  it('a barra tocada fica marcada como selecionada para o leitor de tela', async () => {
    await renderChart();
    const a = screen.getByRole('button', { name: 'Ciclo A: 28 dias' });
    await fireEvent.press(a);
    expect(a).toBeSelected();
    expect(screen.getByRole('button', { name: 'Ciclo B: 30 dias' })).not.toBeSelected();
  });

  it('se a barra tocada some dos dados, volta para a destacada', async () => {
    const { rerender } = await renderChart();
    await fireEvent.press(screen.getByRole('button', { name: 'Ciclo A: 28 dias' }));
    await rerender(<BarChart bars={[bars[1]]} reference={29} referenceLabel="média 29" summary="resumo" restingLabel="último completo" />);
    expect(fillOf('b')).toBe(ink);
    expect(screen.getByText('Ciclo B: 30 dias · último completo')).toBeOnTheScreen();
  });

  it('cada barra tem a faixa da menstruação na base', async () => {
    await renderChart();
    expect(screen.getByTestId('bar-base-a', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('bar-base-b', { includeHiddenElements: true })).toBeTruthy();
  });

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
