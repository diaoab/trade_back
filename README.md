# App mobile et web

Une seule base de code (Expo / React Native) pour iPhone, Android et le
navigateur. Elle consomme l'API du dossier `api/` du backend, dépôt voisin `../trade_back`.

## Lancer en local

1. Démarrer l'API, depuis `../trade_back` :

   ```bash
   .venv/bin/python -m uvicorn api.main:app --port 8000
   ```

   Un compte de démonstration se crée avec `.venv/bin/python -m api.dev_seed`.

2. Démarrer l'app, depuis ce dossier :

   ```bash
   npx expo start
   ```

   Puis `w` pour le navigateur, `i` pour le simulateur iOS, `a` pour
   l'émulateur Android. Sur un vrai téléphone, l'app Expo Go scanne le QR
   code ; définir alors `EXPO_PUBLIC_API_URL=http://<ip-du-mac>:8000`
   car `localhost` désigne le téléphone lui-même.

## Publier

- Web : `npx expo export --platform web`, puis héberger `dist/` (site statique) ;
  [render.yaml](render.yaml) le fait sur Render.
- Stores : `npx eas-cli@latest build --platform all` puis `eas submit`
  (compte Apple Developer et Google Play Console nécessaires).
- Définir `EXPO_PUBLIC_API_URL` sur l'adresse publique de l'API au build.
