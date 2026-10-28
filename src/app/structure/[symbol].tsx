import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PriceChart } from '@/components/price-chart';
import {
  DISCLAIMER,
  ErrorText,
  Footnote,
  GUTTER,
  Hairline,
  Loading,
  Muted,
  Section,
  Screen,
  StatGrid,
} from '@/components/ui';
import { api, Analysis, Quota } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SIGNALS, changeColor, formatDate, formatNumber, formatPct, signalColor, tabular, useColors } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

type Message = { role: 'user' | 'assistant'; content: string };
type Detail = NonNullable<Analysis['result']['details']>[number];
type Tone = Detail['tone'];

// Seuils du moteur de decision (services/decision_engine.py).
const HOLD_THRESHOLD = 45;
const BUY_THRESHOLD = 70;

// Bloc du signal : decision, score, jauge 0-100 remplie jusqu'au score avec
// les seuils du moteur marques, et les trois sous-scores.
function SignalPanel({ result }: { result: Analysis['result'] }) {
  const colors = useColors();
  const color = signalColor(colors, result.decision);
  const score = Math.max(0, Math.min(100, result.score));
  const zones = [
    { label: 'Vente', center: HOLD_THRESHOLD / 2 },
    { label: 'Conserver', center: (HOLD_THRESHOLD + BUY_THRESHOLD) / 2 },
    { label: 'Achat', center: (BUY_THRESHOLD + 100) / 2 },
  ];
  const metrics = [
    { label: 'Confiance', value: `${formatNumber(result.confidence)} %` },
    { label: 'Technique', value: formatNumber(result.technical_score) },
    { label: 'Risque', value: result.risk_score === null ? '—' : formatNumber(result.risk_score) },
  ];
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <View style={styles.panelHead}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.kicker, { color: colors.secondary }]}>Signal du moteur</Text>
          <Text style={[styles.decision, { color }]}>
            {result.decision ? SIGNALS[result.decision]?.label ?? result.decision : '—'}
          </Text>
        </View>
        <Text style={[styles.score, tabular, { color: colors.text }]}>
          {formatNumber(result.score)}
          <Text style={[styles.scoreMax, { color: colors.secondary }]}>/100</Text>
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        <View style={[styles.track, { backgroundColor: colors.separator }]}>
          <View style={{ width: `${score}%`, backgroundColor: color, borderRadius: 4 }} />
          {[HOLD_THRESHOLD, BUY_THRESHOLD].map((t) => (
            <View key={t} style={[styles.tick, { left: `${t}%`, backgroundColor: colors.surface }]} />
          ))}
        </View>
        <View style={styles.zoneLabels}>
          {zones.map((zone) => {
            const active = SIGNALS[result.decision]?.label === zone.label;
            return (
              <Text
                key={zone.label}
                style={[
                  styles.zoneLabel,
                  { left: `${zone.center}%`, color: active ? color : colors.tertiary },
                  active && { fontWeight: '600' },
                ]}>
                {zone.label}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={[styles.metrics, { borderTopColor: colors.separator }]}>
        {metrics.map((m) => (
          <View key={m.label} style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.secondary, fontSize: 12 }}>{m.label}</Text>
            <Text style={[{ color: colors.text, fontSize: 17, fontWeight: '600' }, tabular]}>{m.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const TONE_LABELS: Record<string, Record<Tone, string>> = {
  default: { positive: 'Haussier', negative: 'Baissier', neutral: 'Neutre' },
  'Volatilité': { positive: 'Faible', negative: 'Élevée', neutral: 'Modérée' },
};

type IconName = keyof typeof Ionicons.glyphMap;

// La volatilite mesure un risque, pas un sens : pas de fleche pour elle.
const TONE_ICONS: Record<string, Record<Tone, IconName>> = {
  default: { positive: 'arrow-up', negative: 'arrow-down', neutral: 'remove' },
  'Volatilité': { positive: 'shield-checkmark-outline', negative: 'warning-outline', neutral: 'remove' },
};

// Une ligne par indicateur : nom, explication courte, sens du signal.
function IndicatorRow({ detail, last }: { detail: Detail; last: boolean }) {
  const colors = useColors();
  const tone = detail.tone;
  const color = tone === 'neutral' ? colors.secondary : colors[tone];
  const label = (TONE_LABELS[detail.indicator] ?? TONE_LABELS.default)[tone];
  return (
    <>
      <View style={styles.indicator}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.indicatorName, { color: colors.text }]}>{detail.indicator}</Text>
          <Text style={[styles.indicatorText, { color: colors.secondary }]}>{detail.text}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <View style={styles.toneRow}>
            <Ionicons
              name={(TONE_ICONS[detail.indicator] ?? TONE_ICONS.default)[tone]}
              size={14}
              color={color}
            />
            <Text style={{ color, fontSize: 14, fontWeight: '600' }}>{label}</Text>
          </View>
          {!detail.counted && <Text style={{ color: colors.tertiary, fontSize: 12 }}>hors score</Text>}
        </View>
      </View>
      {!last && <Hairline />}
    </>
  );
}

function Assistant({ symbol }: { symbol: string }) {
  const colors = useColors();
  const { user, refreshUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [quota, setQuota] = useState<Quota | undefined>(user?.assistant);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(text = question) {
    const content = text.trim();
    if (!content) return;
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setQuestion('');
    setBusy(true);
    setError(null);
    try {
      const reply = await api<{ answer: string; assistant: Quota }>(`/structures/${symbol}/assistant`, {
        method: 'POST',
        body: { messages: next },
      });
      setMessages([...next, { role: 'assistant', content: reply.answer }]);
      setQuota(reply.assistant);
      refreshUser().catch(() => {});
    } catch (e) {
      setError((e as Error).message);
      setMessages(messages);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = ['Pourquoi ce signal ?', 'Quels sont les risques ?', 'Que dit le RSI ?'];

  return (
    <Section
      title="Assistant"
      action={
        quota && (
          <Text style={[{ color: colors.tertiary, fontSize: 13 }, tabular]}>
            {quota.used}/{quota.limit} aujourd’hui
          </Text>
        )
      }>
      <View style={{ paddingHorizontal: GUTTER, gap: 14 }}>
        {messages.length === 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => ask(s)}
                disabled={busy}
                style={({ pressed }) => [
                  styles.suggestion,
                  { borderColor: colors.separator, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text style={{ color: colors.text, fontSize: 14 }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <Text key={i} style={[styles.question, { color: colors.text }]}>
              {m.content}
            </Text>
          ) : (
            <Text key={i} style={[styles.answer, { color: colors.text, borderColor: colors.separator }]}>
              {m.content}
            </Text>
          )
        )}
        {busy && <Muted>Analyse en cours…</Muted>}
        <ErrorText message={error} />
        <View style={[styles.composer, { backgroundColor: colors.surface }]}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Poser une question sur cette analyse"
            placeholderTextColor={colors.tertiary}
            style={[styles.composerInput, { color: colors.text }]}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={() => ask()}
            disabled={busy || !question.trim()}
            hitSlop={8}
            style={[
              styles.send,
              { backgroundColor: colors.ink, opacity: busy || !question.trim() ? 0.25 : 1 },
            ]}>
            <Ionicons name="arrow-up" size={18} color={colors.onInk} />
          </Pressable>
        </View>
      </View>
    </Section>
  );
}

export default function StructureScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const colors = useColors();
  const { data, error, loading, reload } = useApi<Analysis>(`/structures/${symbol}/analysis`);

  return (
    <Screen withNavigationHeader refreshing={loading && !!data} onRefresh={reload}>
      <Stack.Screen options={{ title: '' }} />
      <ErrorText message={error} />
      {!data && loading && <Loading />}
      {data && (
        <>
          <View style={styles.hero}>
            <Text style={[styles.ticker, { color: colors.secondary }]}>Action · BRVM</Text>
            <Text style={[styles.name, { color: colors.text }]}>{data.name}</Text>
            <Text style={[styles.price, tabular, { color: colors.text }]}>
              {formatNumber(data.close)}
              <Text style={[styles.currency, { color: colors.secondary }]}> FCFA</Text>
            </Text>
            <Text style={[styles.change, tabular, { color: changeColor(colors, data.pct) }]}>
              {formatPct(data.pct)}
              <Text style={{ color: colors.secondary, fontWeight: '400' }}>
                {'  '}séance du {formatDate(data.session_date)}
              </Text>
            </Text>
          </View>

          <View style={{ marginTop: 20 }}>
            <PriceChart chart={data.chart} />
          </View>

          <View style={{ marginTop: 28 }}>
            <SignalPanel result={data.result} />
          </View>

          <Section
            title="Détail par indicateur"
            action={
              <Text style={[{ color: colors.tertiary, fontSize: 13 }, tabular]}>
                {data.result.positive} ↑ · {data.result.negative} ↓ · {data.result.neutral} =
              </Text>
            }>
            {(data.result.details ?? [])
              .filter((detail) => detail.indicator !== 'Modèle')
              .map((detail, i, all) => (
              <IndicatorRow key={detail.indicator + i} detail={detail} last={i === all.length - 1} />
            ))}
            {data.result.liquidity_warnings.map((warning, i) => (
              <View key={`w${i}`} style={styles.warning}>
                <Ionicons name="warning-outline" size={16} color={colors.caution} />
                <Text style={{ color: colors.caution, fontSize: 14, flex: 1, lineHeight: 20 }}>{warning}</Text>
              </View>
            ))}
          </Section>

          <Section title="Modèle statistique">
            <View style={{ paddingHorizontal: GUTTER, gap: 6 }}>
              {data.ml.probability_up === null ? (
                <Muted>Indisponible pour cette séance : le signal repose sur l’analyse technique seule.</Muted>
              ) : (
                <>
                  <Text style={[{ color: colors.text, fontSize: 17 }, tabular]}>
                    <Text style={{ fontWeight: '600' }}>{formatNumber(data.ml.probability_up * 100)} %</Text>
                    <Text style={{ color: colors.secondary }}>
                      {' '}de probabilité de surperformance
                      {data.ml.horizon_days ? ` à ${data.ml.horizon_days} séances` : ''}
                    </Text>
                  </Text>
                  {!data.ml.counted && (
                    <Muted>
                      Indicatif : le modèle ne fait pas encore mieux qu’une référence naïve et n’entre
                      pas dans le score.
                    </Muted>
                  )}
                </>
              )}
            </View>
          </Section>

          {data.dividend && (
            <Section title="Prochain dividende">
              <View style={{ marginTop: 4 }}>
                <StatGrid
                  items={[
                    { label: 'Montant par action', value: `${formatNumber(data.dividend.amount)} FCFA` },
                    { label: 'Détachement', value: formatDate(data.dividend.ex_date, 'short') },
                    { label: 'Acheter au plus tard', value: formatDate(data.dividend.cutoff, 'short') },
                    { label: 'Délai', value: `${data.dividend.days_left} j` },
                  ]}
                />
              </View>
            </Section>
          )}

          <Assistant symbol={data.symbol} />

          <Footnote>{DISCLAIMER}</Footnote>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: GUTTER, gap: 2 },
  ticker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  name: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 6 },
  price: { fontSize: 34, fontWeight: '600', letterSpacing: -0.8 },
  currency: { fontSize: 17, fontWeight: '500', letterSpacing: 0 },
  change: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  panel: { marginHorizontal: GUTTER, borderRadius: 16, padding: 18 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kicker: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  decision: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  score: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  scoreMax: { fontSize: 15, fontWeight: '500', letterSpacing: 0 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -1.5 },
  zoneLabels: { height: 18, marginTop: 8 },
  zoneLabel: { position: 'absolute', width: 90, marginLeft: -45, textAlign: 'center', fontSize: 12 },
  metrics: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  indicator: { flexDirection: 'row', gap: 16, paddingHorizontal: GUTTER, paddingVertical: 14, alignItems: 'flex-start' },
  indicatorName: { fontSize: 16, fontWeight: '600' },
  indicatorText: { fontSize: 14, lineHeight: 20 },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  warning: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER, paddingVertical: 10, alignItems: 'flex-start' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  question: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  answer: { fontSize: 16, lineHeight: 24, paddingLeft: 14, borderLeftWidth: 2 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 14, paddingLeft: 14, padding: 6, gap: 8 },
  composerInput: { flex: 1, fontSize: 16, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
