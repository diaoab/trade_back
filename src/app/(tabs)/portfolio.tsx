import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  ChangePill,
  ErrorText,
  Field,
  Footnote,
  GUTTER,
  Loading,
  Muted,
  Row,
  Screen,
  Section,
  StatGrid,
  TextLink,
} from '@/components/ui';
import { api, MarketEntry, Portfolio } from '@/lib/api';
import { changeColor, formatDate, formatNumber, formatPct, formatSigned, tabular, useColors } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// Couleurs de la repartition : nuances neutres, la couleur restant reservee
// aux gains et pertes.
const SHADES = ['#1C1B17', '#5E594C', '#8F8878', '#B8AF9A', '#2F5FB3', '#B06D0E'];
const SHADES_DARK = ['#F5F5F4', '#B5B4B0', '#7D7C78', '#4C4B48', '#5B8DEF', '#E09A3A'];

function Allocation({ portfolio }: { portfolio: Portfolio }) {
  const colors = useColors();
  const shades = colors.background === '#000000' ? SHADES_DARK : SHADES;
  const total = portfolio.totals.value || 1;
  const parts = portfolio.positions
    .filter((p) => p.valuation)
    .map((p, i) => ({ name: p.name, share: (p.valuation?.value ?? 0) / total, color: shades[i % shades.length] }));
  if (parts.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
      <View style={styles.allocation}>
        {parts.map((part) => (
          <View key={part.name} style={{ flex: part.share, backgroundColor: part.color }} />
        ))}
      </View>
      <View style={styles.allocationLegend}>
        {parts.map((part) => (
          <View key={part.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: part.color }} />
            <Text style={[{ color: colors.secondary, fontSize: 13 }, tabular]}>
              {part.name} {formatNumber(part.share * 100)} %
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AddPosition({ onAdded, onCancel }: { onAdded: (p: Portfolio) => void; onCancel: () => void }) {
  const colors = useColors();
  const structures = useApi<MarketEntry[]>('/structures');
  const [symbol, setSymbol] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onAdded(
        await api<Portfolio>('/portfolio/positions', {
          method: 'POST',
          body: {
            symbol,
            quantity: Number(quantity.replace(',', '.')),
            buy_price: Number(price.replace(',', '.').replace(/\s/g, '')),
            buy_date: date,
          },
        })
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Section title="Nouvelle position" action={<TextLink title="Annuler" tone="secondary" onPress={onCancel} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
        {structures.data?.map((s) => {
          const selected = symbol === s.symbol;
          return (
            <Pressable
              key={s.symbol}
              onPress={() => setSymbol(s.symbol)}
              style={[
                styles.option,
                { backgroundColor: selected ? colors.ink : colors.surface },
              ]}>
              <Text style={{ color: selected ? colors.onInk : colors.text, fontSize: 15, fontWeight: '500' }}>
                {s.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.form}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Quantité" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          <Field label="Prix d’achat (FCFA)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
        <Field label="Date d’achat (AAAA-MM-JJ)" value={date} onChangeText={setDate} />
      </View>
      <ErrorText message={error} />
      <View style={{ paddingHorizontal: GUTTER, marginTop: 16 }}>
        <Button
          title="Ajouter au portefeuille"
          onPress={submit}
          loading={busy}
          disabled={!symbol || !quantity || !price || !date}
        />
      </View>
    </Section>
  );
}

export default function PortfolioScreen() {
  const colors = useColors();
  const { data, setData, error, loading, reload } = useApi<Portfolio>('/portfolio');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  async function remove(id: number) {
    setData(await api<Portfolio>(`/portfolio/positions/${id}`, { method: 'DELETE' }));
  }

  const totals = data?.totals;
  const hasPositions = !!data && data.positions.length > 0;

  return (
    <Screen
      title="Portefeuille"
      right={
        hasPositions ? (
          <TextLink title={editing ? 'OK' : 'Modifier'} onPress={() => setEditing(!editing)} />
        ) : undefined
      }
      refreshing={loading && !!data}
      onRefresh={reload}>
      <ErrorText message={error} />
      {!data && loading && <Loading />}

      {data && totals && hasPositions && (
        <>
          <View style={{ paddingHorizontal: GUTTER, marginTop: 8 }}>
            <Text style={[styles.value, tabular, { color: colors.text }]}>
              {formatNumber(totals.value)}
              <Text style={[styles.currency, { color: colors.secondary }]}> FCFA</Text>
            </Text>
            <Text style={[styles.net, tabular, { color: changeColor(colors, totals.net) }]}>
              {formatSigned(totals.net)} FCFA ({formatPct(totals.net_pct)})
              <Text style={{ color: colors.secondary, fontWeight: '400' }}>  résultat net</Text>
            </Text>
          </View>

          <Allocation portfolio={data} />

          <View style={{ marginTop: 24 }}>
            <StatGrid
              items={[
                { label: 'Investi', value: formatNumber(totals.cost) },
                { label: 'Dividendes perçus', value: formatNumber(totals.dividends) },
                { label: 'Frais estimés', value: formatNumber(totals.fees) },
                {
                  label: 'Plus-value latente',
                  value: formatSigned(totals.value - totals.cost),
                  tone: changeColor(colors, totals.value - totals.cost),
                },
              ]}
            />
          </View>
        </>
      )}

      {data && !hasPositions && !adding && (
        <View style={styles.empty}>
          <Ionicons name="pie-chart-outline" size={36} color={colors.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune position</Text>
          <Muted style={{ textAlign: 'center' }}>
            Ajoutez les titres que vous détenez pour suivre leur valeur, vos dividendes et le résultat
            net de frais.
          </Muted>
        </View>
      )}

      {hasPositions && (
        <Section title="Positions">
          {data!.positions.map((p, i) => (
            <Row
              key={p.id}
              last={i === data!.positions.length - 1}
              onPress={
                editing
                  ? undefined
                  : () => router.push({ pathname: '/structure/[symbol]', params: { symbol: p.symbol } })
              }>
              {editing && (
                <Pressable onPress={() => remove(p.id)} hitSlop={8}>
                  <Ionicons name="remove-circle" size={22} color={colors.negative} />
                </Pressable>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{p.name}</Text>
                <Text style={[{ color: colors.secondary, fontSize: 13 }, tabular]}>
                  {formatNumber(p.quantity)} titres · PRU {formatNumber(p.buy_price)} ·{' '}
                  {formatDate(p.buy_date, 'short')}
                </Text>
              </View>
              {p.valuation && (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[{ color: colors.text, fontSize: 17, fontWeight: '600' }, tabular]}>
                    {formatNumber(p.valuation.value)}
                  </Text>
                  <ChangePill value={p.valuation.net_pct} />
                </View>
              )}
            </Row>
          ))}
        </Section>
      )}

      {adding ? (
        <AddPosition
          onAdded={(p) => {
            setData(p);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        data && (
          <View style={{ paddingHorizontal: GUTTER, marginTop: 24 }}>
            <Button title="Ajouter une position" variant={hasPositions ? 'secondary' : 'primary'} onPress={() => setAdding(true)} />
          </View>
        )
      )}

      {hasPositions && (
        <Footnote>
          Valorisation au dernier cours coté. Résultat net = plus-value latente + dividendes perçus −
          frais estimés d’un aller-retour.
        </Footnote>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 34, fontWeight: '600', letterSpacing: -0.8 },
  currency: { fontSize: 17, fontWeight: '500', letterSpacing: 0 },
  net: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  allocation: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  allocationLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 40, paddingVertical: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  picker: { paddingHorizontal: GUTTER, gap: 8, paddingVertical: 4 },
  option: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  form: { paddingHorizontal: GUTTER, gap: 16, marginTop: 16 },
});
