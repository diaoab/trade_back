import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from './api';

// Charge une ressource de l'API a chaque affichage de l'ecran (les reglages
// ou le portefeuille ont pu changer sur un autre onglet).
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, setData, error, loading, reload };
}
