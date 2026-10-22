import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { useChartColors } from './use-chart-colors';

export type Bar = { key: string; value: number; label: string; emphasized?: boolean };

const PLOT_HEIGHT = 140;
const GAP = 2;
const MAX_BAR = 28;
const RADIUS = 4;

/**
 * Barras de uma série (tinta suave; a destacada em tinta), começando no zero, com linha de referência.
 * Tocar numa barra mostra o rótulo dela; o resumo acessível vem em `summary`.
 */
export function BarChart({ bars, reference, referenceLabel, summary }: { bars: Bar[]; reference: number; referenceLabel: string; summary: string }) {
  const colors = useChartColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(reference, ...bars.map((b) => b.value)) * 1.1;
  const slot = width / Math.max(bars.length, 1);
  const barWidth = Math.min(MAX_BAR, slot - GAP);
  const y = (v: number) => PLOT_HEIGHT - (v / max) * PLOT_HEIGHT;
  const chosen = bars.find((b) => b.key === selected);

  return (
    <View className="gap-2">
      <Text className="min-h-6 text-base font-bold text-ink dark:text-ink-night">{chosen ? chosen.label : ' '}</Text>
      <View style={{ height: PLOT_HEIGHT }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <View accessible accessibilityRole="image" accessibilityLabel={summary} style={{ position: 'absolute', inset: 0 }}>
        {width > 0 ? (
          <Svg width={width} height={PLOT_HEIGHT}>
            <Line x1={0} x2={width} y1={PLOT_HEIGHT} y2={PLOT_HEIGHT} stroke={colors.grid} strokeWidth={1} />
            {bars.map((b, i) => {
              const x = i * slot + (slot - barWidth) / 2;
              const top = y(b.value);
              // Com uma barra tocada, só ela fica em tinta; sem toque, a destacada.
              const isInk = selected ? b.key === selected : b.emphasized;
              const fill = isInk ? colors.ink : colors.muted;
              return (
                <G key={b.key}>
                  {/* Ponta arredondada só em cima; a base fica reta no eixo. */}
                  <Rect testID={`bar-${b.key}`} x={x} y={top} width={barWidth} height={PLOT_HEIGHT - top} rx={RADIUS} fill={fill} />
                  <Rect x={x} y={Math.max(top + RADIUS, PLOT_HEIGHT - RADIUS)} width={barWidth} height={RADIUS} fill={fill} />
                </G>
              );
            })}
            <Line x1={0} x2={width} y1={y(reference)} y2={y(reference)} stroke={colors.ink} strokeWidth={1} />
          </Svg>
        ) : null}
        </View>
        {/* Alvos de toque por barra (a coluna inteira, maior que a barra), irmãos do gráfico acessível. */}
        <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
          {bars.map((b) => (
            <Pressable key={b.key} accessibilityRole="button" accessibilityLabel={b.label} onPress={() => setSelected(b.key)} style={{ flex: 1 }} />
          ))}
        </View>
      </View>
      <Text className="text-sm text-ink-muted dark:text-ink-muted-night">{referenceLabel}</Text>
    </View>
  );
}
