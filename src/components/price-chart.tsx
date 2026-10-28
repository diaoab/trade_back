import { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { GUTTER, Segmented } from '@/components/ui';
import { changeColor, formatDate, formatNumber, formatPct, tabular, useColors } from '@/lib/theme';

type Chart = Record<string, (number | null)[] | string[]>;

const HEIGHT = 220;

// Periodes proposees, en seances de bourse.
const RANGES = { '1M': 21, '3M': 63, '6M': 126, '1A': 250 } as const;
type Range = keyof typeof RANGES;

function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  let d = '';
  let pen = false;
  values.forEach((value, i) => {
    if (value === null || value === undefined) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)}`;
    pen = true;
  });
  return d;
}

// Cours avec choix de la periode, moyennes mobiles et bandes de Bollinger
// en option, et curseur au doigt qui affiche la seance pointee.
export function PriceChart({ chart }: { chart: Chart }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<Range>('6M');
  const [overlays, setOverlays] = useState({ mm20: true, mm50: true, bollinger: false });
  const [cursor, setCursor] = useState<number | null>(null);

  const data = useMemo(() => {
    const count = RANGES[range];
    const slice = <T,>(values: T[] | undefined) => (values ?? []).slice(-count);
    return {
      dates: slice(chart.dates as string[]),
      close: slice(chart.Close as (number | null)[]),
      mm20: slice(chart.MM20 as (number | null)[] | undefined),
      mm50: slice(chart.MM50 as (number | null)[] | undefined),
      upper: slice(chart.Bollinger_Upper as (number | null)[] | undefined),
      lower: slice(chart.Bollinger_Lower as (number | null)[] | undefined),
    };
  }, [chart, range]);

  const n = data.close.length;
  const shown = [
    ...data.close,
    ...(overlays.mm20 ? data.mm20 : []),
    ...(overlays.mm50 ? data.mm50 : []),
    ...(overlays.bollinger ? [...data.upper, ...data.lower] : []),
  ].filter((v): v is number => typeof v === 'number');

  if (n < 2 || shown.length === 0) return null;

  const first = data.close.find((v): v is number => typeof v === 'number') ?? 0;
  const last = data.close[n - 1] ?? first;
  const lineColor = changeColor(colors, last - first);

  const min = Math.min(...shown);
  const max = Math.max(...shown);
  const pad = (max - min) * 0.08 || 1;
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => 8 + (1 - (v - min + pad) / (max - min + 2 * pad)) * (HEIGHT - 16);

  const closePath = linePath(data.close, x, y);
  const areaPath = `${closePath}L${width},${HEIGHT}L0,${HEIGHT}Z`;

  // Bande de Bollinger : contour haut puis bas parcouru a l'envers.
  let bandPath = '';
  if (overlays.bollinger && data.upper.length === n) {
    const valid = data.upper.map((u, i) => u !== null && data.lower[i] !== null);
    const start = valid.indexOf(true);
    if (start >= 0) {
      const idx = Array.from({ length: n - start }, (_, k) => k + start).filter((i) => valid[i]);
      bandPath =
        idx.map((i, k) => `${k === 0 ? 'M' : 'L'}${x(i)},${y(data.upper[i] as number)}`).join('') +
        idx
          .slice()
          .reverse()
          .map((i) => `L${x(i)},${y(data.lower[i] as number)}`)
          .join('') +
        'Z';
    }
  }

  function track(event: GestureResponderEvent) {
    const position = event.nativeEvent.locationX;
    setCursor(Math.max(0, Math.min(n - 1, Math.round((position / width) * (n - 1)))));
  }

  // Curseur au glissement horizontal seulement : un geste vertical reste
  // un defilement de la page.
  const scrub = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: track,
    onPanResponderMove: track,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: () => setCursor(null),
    onPanResponderTerminate: () => setCursor(null),
  });

  const pointed = cursor !== null ? data.close[cursor] : null;
  const rangeChange = first ? ((last - first) / first) * 100 : null;

  return (
    <View>
      <View style={styles.readout}>
        {cursor !== null && pointed !== null ? (
          <Text style={[styles.readoutText, tabular, { color: colors.text }]}>
            {formatNumber(pointed)} FCFA
            <Text style={{ color: colors.secondary }}>  {formatDate(data.dates[cursor])}</Text>
          </Text>
        ) : (
          <Text style={[styles.readoutText, tabular, { color: colors.secondary }]}>
            Sur la période{'  '}
            <Text style={{ color: changeColor(colors, rangeChange) }}>{formatPct(rangeChange)}</Text>
          </Text>
        )}
      </View>

      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        {...scrub.panHandlers}
        style={{ height: HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity={0.16} />
                <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {bandPath !== '' && <Path d={bandPath} fill={colors.band} />}
            <Path d={areaPath} fill="url(#area)" />
            {overlays.mm50 && (
              <Path d={linePath(data.mm50, x, y)} stroke={colors.series2} strokeWidth={1.2} fill="none" />
            )}
            {overlays.mm20 && (
              <Path d={linePath(data.mm20, x, y)} stroke={colors.series1} strokeWidth={1.2} fill="none" />
            )}
            <Path d={closePath} stroke={lineColor} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {cursor !== null && pointed !== null && (
              <>
                <Line
                  x1={x(cursor)}
                  x2={x(cursor)}
                  y1={0}
                  y2={HEIGHT}
                  stroke={colors.tertiary}
                  strokeWidth={1}
                />
                <Circle cx={x(cursor)} cy={y(pointed)} r={4.5} fill={lineColor} stroke={colors.background} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
      </View>

      <View style={styles.axis}>
        <Text style={[styles.axisText, tabular, { color: colors.tertiary }]}>{formatDate(data.dates[0], 'short')}</Text>
        <Text style={[styles.axisText, tabular, { color: colors.tertiary }]}>
          {formatNumber(min)} – {formatNumber(max)}
        </Text>
        <Text style={[styles.axisText, tabular, { color: colors.tertiary }]}>{formatDate(data.dates[n - 1], 'short')}</Text>
      </View>

      <View style={{ marginTop: 14 }}>
        <Segmented options={Object.keys(RANGES) as Range[]} value={range} onChange={setRange} />
      </View>

      <View style={styles.legend}>
        <Toggle
          on={overlays.mm20}
          onPress={() => setOverlays({ ...overlays, mm20: !overlays.mm20 })}
          color={colors.series1}
          label="MM20"
        />
        <Toggle
          on={overlays.mm50}
          onPress={() => setOverlays({ ...overlays, mm50: !overlays.mm50 })}
          color={colors.series2}
          label="MM50"
        />
        <Toggle
          on={overlays.bollinger}
          onPress={() => setOverlays({ ...overlays, bollinger: !overlays.bollinger })}
          color={colors.tertiary}
          label="Bollinger"
          band
        />
      </View>
    </View>
  );
}

// Superposition activable : puce avec l'echantillon de trait, pleine quand
// la courbe est affichee.
function Toggle({
  on,
  onPress,
  color,
  label,
  band,
}: {
  on: boolean;
  onPress: () => void;
  color: string;
  label: string;
  band?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: on ? colors.surface : 'transparent',
          borderColor: on ? colors.surface : colors.separator,
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <View
        style={[
          band ? styles.swatchBand : styles.swatchLine,
          band
            ? { borderColor: color, backgroundColor: on ? colors.band : 'transparent' }
            : { backgroundColor: on ? color : colors.tertiary },
        ]}
      />
      <Text style={{ color: on ? colors.text : colors.tertiary, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readout: { paddingHorizontal: GUTTER, height: 24, justifyContent: 'center', marginBottom: 8 },
  readoutText: { fontSize: 15, fontWeight: '500' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: GUTTER, marginTop: 6 },
  axisText: { fontSize: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: GUTTER, marginTop: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  swatchLine: { width: 12, height: 2, borderRadius: 1 },
  swatchBand: { width: 12, height: 9, borderRadius: 2, borderWidth: 1 },
});
