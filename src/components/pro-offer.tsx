import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorText, GUTTER, Muted, Row, Section, TextLink } from '@/components/ui';
import { api, Offer, User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatNumber, tabular, useColors } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// Verifie une facture aupres de l'API et renvoie le message a afficher.
async function confirmPayment(token: string, refreshUser: () => Promise<void>) {
  const { status } = await api<{ status: string; user: User }>('/billing/confirm', {
    method: 'POST',
    body: { token },
  });
  await refreshUser();
  if (status === 'completed') return 'Paiement reçu : ton offre Pro est active.';
  if (status === 'pending') return 'Paiement en attente de validation. Reviens dans quelques instants.';
  return 'Paiement non finalisé.';
}

// Paiement de l'offre Pro par PayDunya (Orange Money, Wave, MTN, Moov, carte).
// La page de paiement s'ouvre dans le navigateur ; au retour, l'API verifie
// la facture aupres de PayDunya avant d'activer l'offre.
export function ProOffer() {
  const colors = useColors();
  const { user, refreshUser } = useAuth();
  const offer = useApi<Offer>('/billing/offer');
  const params = useLocalSearchParams<{ billing?: string; token?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Retour de PayDunya sur la version web : /settings?billing=...&token=...
  useEffect(() => {
    if (!params.token) return;
    confirmPayment(params.token, refreshUser).then(setNotice, (e) =>
      setError((e as Error).message)
    );
  }, [params.token, refreshUser]);

  async function subscribe() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const redirect = Linking.createURL('/settings');
      const { checkout_url, token } = await api<{ checkout_url: string; token: string }>(
        '/billing/checkout',
        { method: 'POST', body: { redirect_url: redirect } }
      );
      if (Platform.OS === 'web') {
        globalThis.location.href = checkout_url;
        return;
      }
      await WebBrowser.openAuthSessionAsync(checkout_url, redirect);
      setNotice(await confirmPayment(token, refreshUser));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isPro = user?.plan === 'pro';
  const data = offer.data;

  if (isPro) {
    return (
      <Section title="Abonnement">
        <Row last>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Offre Pro</Text>
            <Text style={{ color: colors.secondary, fontSize: 13 }}>
              {user?.pro_until ? `Active jusqu’au ${formatDate(user.pro_until)}` : 'Active'} ·{' '}
              {user?.assistant.limit} questions par jour
            </Text>
          </View>
          <TextLink title={busy ? '…' : 'Prolonger'} onPress={subscribe} />
        </Row>
        {notice && <Muted style={{ paddingHorizontal: GUTTER, color: colors.positive }}>{notice}</Muted>}
        <ErrorText message={error} />
      </Section>
    );
  }

  return (
    <View style={[styles.panel, { backgroundColor: colors.ink }]}>
      <Text style={[styles.kicker, { color: colors.onInk }]}>OFFRE PRO</Text>
      <Text style={[styles.headline, { color: colors.onInk }]}>
        {data ? `${data.assistant_limit} questions par jour` : 'Plus de questions'} à l’assistant
      </Text>
      <Text style={[styles.detail, { color: colors.onInk }]}>
        Au lieu de {user?.assistant.limit} avec l’offre gratuite. Paiement par Orange Money, Wave, MTN,
        Moov ou carte via PayDunya.
      </Text>
      <View style={styles.footer}>
        {data && (
          <Text style={[styles.price, tabular, { color: colors.onInk }]}>
            {formatNumber(data.price)} FCFA
            <Text style={{ fontSize: 14, fontWeight: '400' }}> / {data.days} jours</Text>
          </Text>
        )}
        <Pressable
          onPress={subscribe}
          disabled={busy || !data?.available}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.onInk, opacity: !data?.available ? 0.4 : pressed ? 0.8 : 1 },
          ]}>
          {busy ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>Passer Pro</Text>
          )}
        </Pressable>
      </View>
      {data && !data.available && (
        <Text style={[styles.detail, { color: colors.onInk, marginTop: 10 }]}>
          Paiement bientôt disponible.
        </Text>
      )}
      {notice && <Text style={[styles.detail, { color: colors.onInk, marginTop: 10 }]}>{notice}</Text>}
      {error && <Text style={[styles.detail, { color: colors.negative, marginTop: 10 }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: GUTTER, marginTop: 20, borderRadius: 16, padding: 20 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1, opacity: 0.6 },
  headline: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 8 },
  detail: { fontSize: 14, lineHeight: 20, opacity: 0.7, marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  price: { fontSize: 20, fontWeight: '700' },
  cta: { height: 40, borderRadius: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
});
