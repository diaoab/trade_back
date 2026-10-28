import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, DISCLAIMER, ErrorText, Field, Footnote, GUTTER, Screen, TextLink } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { APP_NAME } from '@/lib/brand';
import { useColors } from '@/lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const colors = useColors();
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, create);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.secondary }]}>{APP_NAME}</Text>
          <Text style={[styles.headline, { color: colors.text }]}>
            {create ? 'Créer un compte' : 'Connexion'}
          </Text>
          <Text style={[styles.lead, { color: colors.secondary }]}>
            Signaux techniques, suivi de portefeuille et calendrier des dividendes pour les titres
            de la BRVM.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={create ? 'new-password' : 'current-password'}
            textContentType={create ? 'newPassword' : 'password'}
            placeholder={create ? '8 caractères minimum' : undefined}
            onSubmitEditing={submit}
          />
        </View>

        <ErrorText message={error} />

        <View style={styles.actions}>
          <Button
            title={create ? 'Créer mon compte' : 'Se connecter'}
            onPress={submit}
            loading={busy}
            disabled={!email || !password}
          />
          <View style={styles.switch}>
            <Text style={{ color: colors.secondary, fontSize: 15 }}>
              {create ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}
            </Text>
            <TextLink title={create ? 'Se connecter' : 'Créer un compte'} onPress={() => setCreate(!create)} />
          </View>
        </View>

        <Footnote>{DISCLAIMER}</Footnote>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: GUTTER, paddingTop: 40, gap: 10 },
  brand: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  headline: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  lead: { fontSize: 16, lineHeight: 23 },
  form: { paddingHorizontal: GUTTER, marginTop: 36, gap: 18 },
  actions: { paddingHorizontal: GUTTER, marginTop: 24, gap: 20 },
  switch: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
