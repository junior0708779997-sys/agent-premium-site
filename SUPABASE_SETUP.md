# Setup Supabase (Postgres)

## 1) Creer projet
- Creer un projet sur Supabase.
- Recuperer `Project URL` et `anon public key`.

## 2) Creer les tables
- Ouvrir SQL Editor.
- Executer le script `supabase-schema.sql`.

## 3) Configurer le front
Dans `backend-config.js`:
- `supabaseUrl`: URL du projet
- `supabaseAnonKey`: anon key

## 4) Verification
- Creer un compte sur `login.html`.
- Passer une commande sur `index.html`.
- Verifier que `users`, `orders`, `favorites` se remplissent.

## 5) Etape suivante (recommandee)
- Activer RLS + policies par utilisateur.
- Ajouter un role service pour l'API backend.
