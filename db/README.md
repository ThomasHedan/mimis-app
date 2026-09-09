# Base de données

L'app tourne sur **Postgres (Neon)**, interrogé par le driver serverless HTTP
`@neondatabase/serverless`. Neon a été choisi pour une raison précise : son
offre gratuite ne met pas le projet en pause pour inactivité — une base
endormie se réveille d'elle-même à la première requête, en une fraction de
seconde. C'est ce qui a motivé le départ de Supabase.

Il n'y a **pas de table d'utilisateurs**. Les deux comptes sont déclarés dans la
variable d'environnement `APP_USERS` (voir `.env.example`). Les colonnes
`created_by`, `user_id` et `assigned_to` stockent l'`id` défini dans cette
variable — d'où leur type `text` et non `uuid`.

## Créer le schéma

Rien à faire : l'app applique son schéma toute seule à la première requête,
quand elle voit que les tables manquent. Il suffit que `DATABASE_URL` pointe
sur une base vide et que son utilisateur ait le droit de créer des tables —
c'est le cas par défaut sur Neon.

Le SQL est dans [`schema.ts`](schema.ts), en clair. Pour l'exécuter à la main
plutôt qu'automatiquement, le coller dans le **SQL Editor** du dashboard Neon :
toutes les instructions sont en `IF NOT EXISTS`, les rejouer ne casse rien.

Pour créer la base : un projet sur [neon.tech](https://neon.tech), ou
Vercel → Storage → Neon, ce qui renseigne `DATABASE_URL` automatiquement.

## Reprendre les données de Supabase

Les tables ont les mêmes noms et les mêmes colonnes qu'avant, à deux détails
près :

- la table `profiles` n'existe plus — ses lignes deviennent les entrées de
  `APP_USERS` ;
- les identifiants d'utilisateur sont du `text` et non de l'`uuid`.

Le plus simple est donc de **reprendre les UUID Supabase** comme `id` dans
`APP_USERS` : les données exportées restent liées sans retouche.

```sql
-- Dans le SQL Editor de Supabase, pour récupérer les id à recopier :
select id, display_name from profiles;
```

Ensuite, pour chaque table (`events`, `habits`, `habit_logs`, `chores`,
`budget_categories`, `budget_entries`, `notifications`) :

1. Supabase → Table Editor → la table → *Export as CSV*.
2. Neon → l'importer (`\copy` via `psql`, ou l'import CSV du dashboard).

Ordre à respecter à cause des clés étrangères : `habits` avant `habit_logs`,
`budget_categories` avant `budget_entries`.

`push_subscriptions` n'a pas besoin d'être reprise : chaque appareil se
réabonne tout seul à la première visite après reconnexion.
