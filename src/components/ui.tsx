import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIGNALS, formatPct, signalColor, tabular, useColors } from '@/lib/theme';

// Largeur maximale du contenu : sur tablette et sur le web, l'app reste une
// colonne lisible plutot que de s'etirer sur tout l'ecran.
const MAX_WIDTH = 680;

export const GUTTER = 20;

// Ecran defilant avec un grand titre (style iOS) quand `title` est fourni.
export function Screen({
  title,
  subtitle,
  right,
  children,
  refreshing,
  onRefresh,
  withNavigationHeader,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  withNavigationHeader?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: withNavigationHeader ? 4 : insets.top + 12,
        paddingBottom: 48,
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        ) : undefined
      }>
      <View style={{ width: '100%', maxWidth: MAX_WIDTH }}>
        {title && (
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.largeTitle, { color: colors.text }]}>{title}</Text>
              {subtitle && <Text style={[styles.subtitle, { color: colors.secondary }]}>{subtitle}</Text>}
            </View>
            {right}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View style={[{ marginTop: 28 }, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title && <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{title}</Text>}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function Hairline({ inset = GUTTER }: { inset?: number }) {
  const colors = useColors();
  return (
    <View
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: inset }}
    />
  );
}

export function Row({
  children,
  onPress,
  last,
}: {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  const content = <View style={styles.row}>{children}</View>;
  return (
    <>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({ backgroundColor: pressed ? colors.surface : 'transparent' })}>
          {content}
        </Pressable>
      ) : (
        content
      )}
      {!last && <Hairline />}
    </>
  );
}

export function Body({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const colors = useColors();
  return <Text style={[styles.body, { color: colors.text }, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const colors = useColors();
  return <Text style={[styles.muted, { color: colors.secondary }, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = useColors();
  const primary = variant === 'primary';
  const color = primary ? colors.onInk : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.ink : colors.surface,
          opacity: disabled ? 0.35 : pressed ? 0.75 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.buttonText, { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextLink({
  title,
  onPress,
  tone = 'text',
}: {
  title: string;
  onPress: () => void;
  tone?: 'text' | 'negative' | 'secondary';
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      {({ pressed }) => (
        <Text style={[styles.link, { color: colors[tone], opacity: pressed ? 0.6 : 1 }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 8, flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: colors.secondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.tertiary}
        {...props}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
      />
    </View>
  );
}

// Signal du moteur : point de couleur et libelle, sans pastille.
export function SignalTag({ decision, size = 'small' }: { decision: string | null; size?: 'small' | 'large' }) {
  const colors = useColors();
  const color = signalColor(colors, decision);
  const label = decision ? SIGNALS[decision]?.label ?? decision : 'Sans signal';
  const large = size === 'large';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: large ? 8 : 6 }}>
      <View
        style={{
          width: large ? 10 : 7,
          height: large ? 10 : 7,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <Text style={{ color, fontSize: large ? 20 : 13, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// Variation en pastille pleine, comme dans l'app Bourse d'iOS.
export function ChangePill({ value }: { value: number | null }) {
  const colors = useColors();
  const background = !value ? colors.surface : value > 0 ? colors.positive : colors.negative;
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillText, tabular, { color: value ? '#FFFFFF' : colors.secondary }]}>
        {formatPct(value)}
      </Text>
    </View>
  );
}

// Grille de chiffres cles, deux colonnes separees par des filets.
export function StatGrid({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  const colors = useColors();
  return (
    <View style={[styles.grid, { borderColor: colors.separator }]}>
      {items.map((item, i) => (
        <View
          key={item.label}
          style={[
            styles.gridCell,
            {
              borderColor: colors.separator,
              borderRightWidth: i % 2 === 0 ? StyleSheet.hairlineWidth : 0,
              paddingLeft: i % 2 === 0 ? 0 : 16,
              borderBottomWidth:
                i < items.length - (items.length % 2 === 0 ? 2 : 1) ? StyleSheet.hairlineWidth : 0,
            },
          ]}>
          <Text style={[styles.gridLabel, { color: colors.secondary }]}>{item.label}</Text>
          <Text style={[styles.gridValue, tabular, { color: item.tone ?? colors.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface }]}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, selected && { backgroundColor: colors.background }]}>
            <Text
              style={{
                color: selected ? colors.text : colors.secondary,
                fontSize: 13,
                fontWeight: selected ? '600' : '500',
              }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  const colors = useColors();
  return (
    <View style={{ paddingVertical: 64 }}>
      <ActivityIndicator color={colors.secondary} />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return <Text style={[styles.muted, { color: colors.negative, paddingHorizontal: GUTTER }]}>{message}</Text>;
}

export function Footnote({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.footnote, { color: colors.tertiary }]}>{children}</Text>;
}

export const DISCLAIMER =
  'Outil d’aide à l’analyse. Les signaux sont expérimentaux et ne constituent pas un conseil en investissement.';

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: GUTTER,
    marginBottom: 8,
    gap: 12,
  },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
    gap: 12,
    minHeight: 52,
  },
  body: { fontSize: 16, lineHeight: 23 },
  muted: { fontSize: 14, lineHeight: 20 },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  link: { fontSize: 16, fontWeight: '500' },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 14, fontSize: 17 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 76, alignItems: 'flex-end' },
  pillText: { fontSize: 14, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: GUTTER,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gridCell: { width: '50%', paddingVertical: 14, paddingRight: 12, gap: 4 },
  gridLabel: { fontSize: 13 },
  gridValue: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  segmented: { flexDirection: 'row', borderRadius: 9, padding: 2, marginHorizontal: GUTTER },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  footnote: { fontSize: 12, lineHeight: 17, paddingHorizontal: GUTTER, marginTop: 32 },
});
