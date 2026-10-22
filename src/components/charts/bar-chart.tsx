import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { useChartColors } from './use-chart-colors';

/** `base`: dias de menstruação, desenhados em coral na base da barra (cor de fase, com legenda escrita). */
export type Bar = { key: string; value: number; label: string; emphasized?: boolean; base?: number | null };

const PLOT_HEIGHT = 140;
const GAP = 2;
const MAX_BAR = 28;
const RADIUS = 4;

type Props = {
  bars: Bar[];
  reference: number;
  referenceLabel: string;
  summary: string;
  /** Sufixo do rótulo da barra destacada quando nada foi tocado (ex.: "último ciclo completo"). */
  restingLabel: string;
};

/**
 * Barras de uma série (tinta suave; a destacada ou tocada em tinta), começando no zero, com linha de referência.
 * Tocar numa barra mostra o rótulo dela; o resumo acessível vem em `summary`.
 */
export function BarChart({ bars, reference, referenceLabel, summary, restingLabel }: Props) {
  const colors = useChartColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(reference, ...bars.map((b) => b.value)) * 1.1;
  const slot = width / Math.max(bars.length, 1);
  const barWidth = Math.min(MAX_BAR, slot - GAP);
  const y = (v: number) => PLOT_HEIGHT - (v / max) * PLOT_HEIGHT;
  // A barra tocada pode sumir quando os dados mudam: volta para a destacada.
  const tapped = bars.find((b) => b.key === selected);
  const emphasized = bars.find((b) => b.emphasized);
  const inkKey = tapped?.key ?? emphasized?.key;
  const caption = tapped ? tapped.label : emphasized ? `${emphasized.label} · ${restingLabel}` : ' ';

  return (
    <View className="gap-2">
      <Text accessibilityLiveRegion="polite" className="min-h-6 text-base font-bold text-ink dark:text-ink-night">
        {caption}
      </Text>
      <View style={{ height: PLOT_HEIGHT }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <View accessible accessibilityRole="image" accessibilityLabel={summary} style={{ position: 'absolute', inset: 0 }}>
          {width > 0 ? (
            <Svg width={width} height={PLOT_HEIGHT}>
              <Line x1={0} x2={width} y1={PLOT_HEIGHT} y2={PLOT_HEIGHT} stroke={colors.grid} strokeWidth={1} />
              {bars.map((b, i) => {
                const x = i * slot + (slot - barWidth) / 2;
                const top = y(b.value);
                const fill = b.key === inkKey ? colors.ink : colors.muted;
                const baseTop = b.base ? Math.max(top + RADIUS, y(b.base)) : null;
                return (
                  <G key={b.key}>
                    {/* Ponta arredondada só em cima; a base fica reta no eixo. */}
                    <Rect testID={`bar-${b.key}`} x={x} y={top} width={barWidth} height={PLOT_HEIGHT - top} rx={RADIUS} fill={fill} />
                    <Rect x={x} y={Math.max(top + RADIUS, PLOT_HEIGHT - RADIUS)} width={barWidth} height={RADIUS} fill={fill} />
                    {baseTop !== null ? (
                      <Rect testID={`bar-base-${b.key}`} x={x} y={baseTop} width={barWidth} height={PLOT_HEIGHT - baseTop} fill={colors.period} />
                    ) : null}
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
            <Pressable
              key={b.key}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              accessibilityState={{ selected: b.key === selected }}
              onPress={() => setSelected(b.key)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </View>
      <Text className="text-sm text-ink-muted dark:text-ink-muted-night">{referenceLabel}</Text>
    </View>
  );
}
