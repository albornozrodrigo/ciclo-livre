import { useState } from 'react';
import { type LayoutChangeEvent, PixelRatio, Pressable, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { useChartColors } from './use-chart-colors';

/** `base`: dias de menstruação, desenhados em coral na base da barra (cor de fase, com legenda escrita). */
export type Bar = { key: string; value: number; label: string; emphasized?: boolean; base?: number | null };

const PLOT_HEIGHT = 140;
const GAP = 2;
const MAX_BAR = 28;
const RADIUS = 4;
/** Calha à direita para a etiqueta da linha de referência: nenhuma barra fica embaixo dela. */
const GUTTER = 52;
const TAG_HEIGHT = 20;
/** A calha cresce com a fonte do sistema: "média 29" nunca vira "média…". */
const gutter = () => GUTTER * Math.max(1, PixelRatio.getFontScale());

type Props = {
  bars: Bar[];
  reference: number;
  /** Etiqueta curta na ponta da linha de referência (ex.: "média 29"). */
  referenceTag: string;
  /** Legenda abaixo do gráfico. */
  referenceLabel: string;
  summary: string;
  /** Sufixo do rótulo da barra destacada quando nada foi tocado (ex.: "último ciclo completo"). */
  restingLabel: string;
};

/**
 * Barras de uma série (tinta suave; a destacada ou tocada em tinta), começando no zero, com linha de referência.
 * Tocar numa barra mostra o rótulo dela; o resumo acessível vem em `summary`.
 */
export function BarChart({ bars, reference, referenceTag, referenceLabel, summary, restingLabel }: Props) {
  const colors = useChartColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(reference, ...bars.map((b) => b.value)) * 1.1;
  const tagWidth = gutter();
  const tagHeight = TAG_HEIGHT * Math.max(1, PixelRatio.getFontScale());
  const plotWidth = Math.max(width - tagWidth, 0);
  const slot = plotWidth / Math.max(bars.length, 1);
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
                      <Rect
                        testID={`bar-base-${b.key}`}
                        x={x}
                        y={baseTop}
                        width={barWidth}
                        height={PLOT_HEIGHT - baseTop}
                        fill={colors.period}
                      />
                    ) : null}
                  </G>
                );
              })}
              <Line x1={0} x2={width - tagWidth + 2} y1={y(reference)} y2={y(reference)} stroke={colors.ink} strokeWidth={1} />
            </Svg>
          ) : null}
        </View>
        {/* Etiqueta da média na ponta da linha (decorativa: o resumo acessível já diz a média). */}
        <Text
          testID="reference-tag"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          numberOfLines={1}
          style={{
            position: 'absolute',
            right: 0,
            top: Math.min(Math.max(y(reference) - tagHeight / 2, 0), PLOT_HEIGHT - tagHeight),
            width: tagWidth - 6,
          }}
          className="text-right text-xs font-bold leading-5 text-ink [font-variant:tabular-nums] dark:text-ink-night">
          {referenceTag}
        </Text>
        {/* Alvos de toque por barra (a coluna inteira, maior que a barra), irmãos do gráfico acessível. */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: tagWidth, flexDirection: 'row' }}>
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
