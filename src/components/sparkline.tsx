import Svg, { Path } from 'react-native-svg';

import { changeColor, useColors } from '@/lib/theme';

// Mini-graphique des derniers mois, couleur selon le sens de la periode.
export function Sparkline({
  values,
  width = 64,
  height = 28,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
}) {
  const colors = useColors();
  const points = values.filter((v): v is number => typeof v === 'number');
  if (points.length < 2) return <Svg width={width} height={height} />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - 2 - ((v - min) / span) * (height - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join('');

  return (
    <Svg width={width} height={height}>
      <Path
        d={d}
        stroke={changeColor(colors, points[points.length - 1] - points[0])}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
