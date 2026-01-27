# Variables d'environnement pour Vercel

## Variables requises

### Supabase (obligatoires)

```env
NEXT_PUBLIC_SUPABASE_URL=https://iyfesbjnkpynmwlsmxnp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZmVzYmpua3B5bm13bHNteG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTk0MDgsImV4cCI6MjA4NDY3NTQwOH0.mMGDDXRqdGcawx3j3G_f6mjeadzNteJ4LKV57ivYsBc
```

## Variables optionnelles

### Google Maps API (pour l'autocomplétion d'adresses)

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_google_maps
```

> **Note** : Si cette variable n'est pas définie, l'autocomplétion Google Maps sera désactivée mais l'application fonctionnera toujours (saisie manuelle des adresses).

---

## Comment configurer dans Vercel

1. Allez sur votre projet Vercel : https://vercel.com/dashboard
2. Sélectionnez le projet **Co-Pro-Flex**
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez chaque variable :
   - **Key** : `NEXT_PUBLIC_SUPABASE_URL`
   - **Value** : `https://iyfesbjnkpynmwlsmxnp.supabase.co`
   - **Environment** : Production, Preview, Development (cochez les 3)
5. Répétez pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. (Optionnel) Ajoutez `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` si vous avez une clé Google Maps

---

## Variables utilisées uniquement dans les Edge Functions Supabase

Ces variables sont configurées directement dans Supabase (Dashboard → Project Settings → Edge Functions) et **ne doivent PAS** être ajoutées à Vercel :

- `SUPABASE_URL` (utilisé par les Edge Functions)
- `SUPABASE_ANON_KEY` (utilisé par les Edge Functions)
- `SUPABASE_SERVICE_ROLE_KEY` (utilisé par les Edge Functions)

---

## Vérification

Après avoir configuré les variables dans Vercel :

1. Redéployez votre application
2. Vérifiez que les variables sont bien chargées dans les logs de build
3. Testez la connexion à Supabase depuis l'application
