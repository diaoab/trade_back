import { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ProOffer } from '@/components/pro-offer';
import { DISCLAIMER, ErrorText, Footnote, GUTTER, Loading, Row, Screen, Section } from '@/components/ui';
import { api, Preferences } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tabular, useColors } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// Libelles complets des indicateurs (cles de config.INDICATOR_OPTIONS).
const INDICATOR_LABELS: Record<string, string> = {
  MM20: 'Moyenne mobile 20 séances',
  MM50: 'Moyenne mobile 50 séances',
  RSI: 'RSI (14)',
  MACD: 'MACD',
  Bollinger: 'Bandes de Bollinger',
  Momentum: 'Momentum',
  'Volatilité': 'Volatilité',
};

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert('Supprimer le compte', message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: onYes },
  ]);
}

export default function Settings() {
  const colors = useColors();
  const { user, signOut } = useAuth();
  const { data, setData, error, loading } = useApi<Preferences>('/account/preferences');
  const [fee, setFee] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(update: Partial<Preferences>) {
    setSaveError(null);
    try {
      setData(await api<Preferences>('/account/preferences', { method: 'PUT', body: update }));
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  function toggle(name: string, on: boolean) {
    if (!data) return;
    save({
      selected_parameters: on
        ? [...data.selected_parameters, name]
        : data.selected_parameters.filter((n) => n !== name),
    });
  }

  async function deleteAccount() {
    await api('/account/me', { method: 'DELETE' });
    await signOut();
  }

  const switchColors = { true: colors.positive, false: colors.separator };

  return (
    <Screen title="Compte" subtitle={user?.email}>
      <ProOffer />

      <ErrorText message={error ?? saveError} />
      {!data && loading && <Loading />}

      {data && (
        <>
          <Section title="Indicateurs du signal">
            {data.indicator_options.map((name, i) => (
              <Row key={name} last={i === data.indicator_options.length - 1}>
                <Text style={[styles.label, { color: colors.text }]}>{INDICATOR_LABELS[name] ?? name}</Text>
                <Switch
                  value={data.selected_parameters.includes(name)}
                  onValueChange={(on) => toggle(name, on)}
                  trackColor={switchColors}
                />
              </Row>
            ))}
          </Section>

          <Section title="Calculs">
            <Row>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.label, { color: colors.text }]}>Cours ajustés des dividendes</Text>
                <Text style={[styles.hint, { color: colors.secondary }]}>
                  Neutralise la baisse mécanique du jour de détachement.
                </Text>
              </View>
              <Switch
                value={data.adjust_dividends}
                onValueChange={(value) => save({ adjust_dividends: value })}
                trackColor={switchColors}
              />
            </Row>
            <Row last>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.label, { color: colors.text }]}>Frais d’un aller-retour</Text>
                <Text style={[styles.hint, { color: colors.secondary }]}>
                  Commission SGI, redevances et taxes.
                </Text>
              </View>
              <View style={[styles.feeBox, { backgroundColor: colors.surface }]}>
                <TextInput
                  value={fee ?? String(data.round_trip_fee).replace('.', ',')}
                  onChangeText={setFee}
                  keyboardType="decimal-pad"
                  onEndEditing={() => {
                    if (fee !== null) save({ round_trip_fee: Number(fee.replace(',', '.')) });
                  }}
                  style={[styles.feeInput, tabular, { color: colors.text }]}
                />
                <Text style={{ color: colors.secondary, fontSize: 16 }}>%</Text>
              </View>
            </Row>
          </Section>
        </>
      )}

      <Section title="Session">
        <Row onPress={signOut}>
          <Text style={[styles.label, { color: colors.text }]}>Se déconnecter</Text>
        </Row>
        <Row
          last
          onPress={() =>
            confirm(
              'Votre compte, votre portefeuille et vos réglages seront définitivement supprimés.',
              deleteAccount
            )
          }>
          <Text style={[styles.label, { color: colors.negative }]}>Supprimer le compte</Text>
        </Row>
      </Section>

      <Footnote>{DISCLAIMER}</Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, flex: 1 },
  hint: { fontSize: 13, lineHeight: 18 },
  feeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 4,
  },
  feeInput: { fontSize: 16, minWidth: 36, textAlign: 'right', paddingHorizontal: GUTTER / 10 },
});
