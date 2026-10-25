import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { useChartColors } from './use-chart-colors';

type Point = { x: number; y: number };

/** Uma série em linha 2dp com pontos ≥ 8dp; linha horizontal de referência e marca vertical opcionais. */
export function LineChart({
  points,
  xDomain,
  height = 120,
  referenceY,
  markerX,
  summary,
  showDots = true,
}: {
  points: Point[];
  xDomain: [number, number];
  height?: number;
  referenceY?: number | null;
  markerX?: number | null;
  summary: string;
  showDots?: boolean;
}) {
  const colors = useChartColors();
  const [width, setWidth] = useState(0);
  const ys = points.map((p) => p.y).concat(referenceY != null ? [referenceY] : []);
  const pad = 0.1 * (Math.max(...ys) - Math.min(...ys) || 1);
  const [yMin, yMax] = [Math.min(...ys) - pad, Math.max(...ys) + pad];
  const inset = 6;
  const sx = (x: number) => inset + ((x - xDomain[0]) / Math.max(xDomain[1] - xDomain[0], 1)) * (width - 2 * inset);
  const sy = (y: number) => inset + (1 - (y - yMin) / (yMax - yMin)) * (height - 2 * inset);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={height - 1} y2={height - 1} stroke={colors.grid} strokeWidth={1} />
          {referenceY != null ? (
            // Linha de cobertura: é um limiar, por isso tracejada.
            <Line x1={0} x2={width} y1={sy(referenceY)} y2={sy(referenceY)} stroke={colors.muted} strokeWidth={1} strokeDasharray="4 4" />
          ) : null}
          {markerX != null ? <Line x1={sx(markerX)} x2={sx(markerX)} y1={0} y2={height} stroke={colors.muted} strokeWidth={1} /> : null}
          <Polyline points={points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" />
          {showDots
            ? points.map((p) => <Circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={colors.ink} stroke={colors.surface} strokeWidth={2} />)
            : null}
        </Svg>
      ) : null}
    </View>
  );
}
