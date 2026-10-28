import { TextStyle, useColorScheme } from 'react-native';

// Palette neutre : l'encre et le papier portent l'interface, la couleur est
// reservee a ce qui a un sens financier (hausse, baisse, signal).
const palettes = {
  // Ivoire : papier chaud facon presse financiere plutot que blanc pur.
  light: {
    background: '#F4EFE4',
    surface: '#EAE4D6',
    separator: '#DDD5C3',
    text: '#1C1B17',
    secondary: '#6F6A5D',
    tertiary: '#A39E8F',
    ink: '#1C1B17',
    onInk: '#F4EFE4',
    positive: '#0A7F50',
    negative: '#C42B36',
    caution: '#9A5D0A',
    series1: '#2F5FB3',
    series2: '#B06D0E',
    band: 'rgba(28,27,23,0.06)',
  },
  dark: {
    background: '#000000',
    surface: '#151516',
    separator: '#262628',
    text: '#F5F5F4',
    secondary: '#9C9B97',
    tertiary: '#646360',
    ink: '#F5F5F4',
    onInk: '#000000',
    positive: '#2DBE7E',
    negative: '#F2545F',
    caution: '#E2A23B',
    series1: '#5B8DEF',
    series2: '#E09A3A',
    band: 'rgba(245,245,244,0.06)',
  },
};

export type Palette = typeof palettes.light;

export function useColors(): Palette {
  return palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

// Chiffres a chasse fixe : les colonnes de cours restent alignees.
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const SIGNALS: Record<string, { label: string; tone: 'positive' | 'negative' | 'caution' }> =
  {
    ACHETER: { label: 'Achat', tone: 'positive' },
    CONSERVER: { label: 'Conserver', tone: 'caution' },
    VENDRE: { label: 'Vente', tone: 'negative' },
  };

export function signalColor(colors: Palette, decision: string | null) {
  const signal = decision ? SIGNALS[decision] : undefined;
  return signal ? colors[signal.tone] : colors.tertiary;
}

export function changeColor(colors: Palette, value: number | null | undefined) {
  if (!value) return colors.secondary;
  return value > 0 ? colors.positive : colors.negative;
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value), digits)} %`;
}

export function formatSigned(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;
}

export function formatDate(value: string | null | undefined, style: 'long' | 'short' = 'long') {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    'fr-FR',
    style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short' }
  );
}
