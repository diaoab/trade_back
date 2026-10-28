import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Sparkline } from '@/components/sparkline';
import {
  ChangePill,
  DISCLAIMER,
  ErrorText,
  Footnote,
  GUTTER,
  Loading,
  Muted,
  Row,
  Section,
  Screen,
  SignalTag,
} from '@/components/ui';
import { MarketEntry } from '@/lib/api';
import { formatDate, formatNumber, tabular, useColors } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

function Breadth({ entries }: { entries: MarketEntry[] }) {
  const colors = useColors();
  const count = (decision: string) => entries.filter((e) => e.decision === decision).length;
  const items = [
    { label: 'Achat', value: count('ACHETER'), color: colors.positive },
    { label: 'Conserver', value: count('CONSERVER'), color: colors.caution },
    { label: 'Vente', value: count('VENDRE'), color: colors.negative },
  ];
  const total = entries.length || 1;
  return (
    <View style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
      <View style={[styles.breadthBar, { backgroundColor: colors.surface }]}>
        {items.map((item) =>
          item.value ? (
            <View key={item.label} style={{ flex: item.value / total, backgroundColor: item.color }} />
          ) : null
        )}
      </View>
      <View style={styles.breadthLegend}>
        {items.map((item) => (
          <Text key={item.label} style={{ color: colors.secondary, fontSize: 13 }}>
            <Text style={[tabular, { color: colors.text, fontWeight: '600' }]}>{item.value}</Text>{' '}
            {item.label.toLowerCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function Market() {
  const colors = useColors();
  const { data, error, loading, reload } = useApi<MarketEntry[]>('/market');
  const lastDate = data?.map((e) => e.date).filter(Boolean).sort().at(-1);

  return (
    <Screen
      title="Marché"
      subtitle={lastDate ? `BRVM · séance du ${formatDate(lastDate)}` : 'BRVM'}
      refreshing={loading && !!data}
      onRefresh={reload}>
      <ErrorText message={error} />
      {!data && loading && <Loading />}
      {data && data.length > 0 && <Breadth entries={data} />}

      {data && (
        <Section title="Titres suivis">
          {data.length === 0 && <Muted style={{ paddingHorizontal: GUTTER }}>Aucun titre disponible.</Muted>}
          {data.map((entry, i) => (
            <Row
              key={entry.symbol}
              last={i === data.length - 1}
              onPress={() =>
                router.push({ pathname: '/structure/[symbol]', params: { symbol: entry.symbol } })
              }>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {entry.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <SignalTag decision={entry.decision} />
                  {entry.dividend && entry.dividend.days_left <= 7 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="calendar-outline" size={12} color={colors.caution} />
                      <Text style={{ color: colors.caution, fontSize: 12, fontWeight: '500' }}>
                        Dividende J−{entry.dividend.days_left}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Sparkline values={entry.spark ?? []} />
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.price, tabular, { color: colors.text }]}>
                  {formatNumber(entry.close)}
                </Text>
                <ChangePill value={entry.pct} />
              </View>
            </Row>
          ))}
        </Section>
      )}

      {data && data.some((e) => e.changes.length > 0) && (
        <Section title="Depuis la dernière séance">
          {data
            .filter((e) => e.changes.length > 0)
            .map((e, i, all) => (
              <Row key={e.symbol} last={i === all.length - 1}>
                <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{e.name}</Text>
                  <Text style={{ color: colors.secondary }}> — {e.changes.join(', ')}</Text>
                </Text>
              </Row>
            ))}
        </Section>
      )}

      <Footnote>Cours en FCFA, clôture de la dernière séance connue. {DISCLAIMER}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  price: { fontSize: 17, fontWeight: '600' },
  breadthBar: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  breadthLegend: { flexDirection: 'row', gap: 16, marginTop: 8 },
});
