# MimisApp

App PWA de couple : agenda, habitudes, tâches, budget et notifications push.
Next.js 16 (App Router) déployé sur Vercel, données dans Postgres (Neon).

## Comment marche l'authentification

Il n'y a **pas de base d'authentification ni de table d'utilisateurs**. Les deux
comptes sont déclarés dans la variable d'environnement `APP_USERS`, avec un mot
de passe haché en scrypt. À la connexion, le serveur vérifie le hash et pose un
cookie de session signé (HMAC-SHA256, httpOnly, 30 jours).

Conséquences à connaître :

- **Changer un mot de passe** = regénérer un hash et mettre à jour `APP_USERS`
  dans Vercel, puis redéployer. Il n'y a pas de « mot de passe oublié » en
  self-service, et c'est voulu : moins de surface, rien à maintenir.
- **Retirer un compte** d'`APP_USERS` invalide immédiatement ses sessions.
- **Ne jamais changer un `id`** une fois des données créées : c'est lui qui est
  stocké dans les colonnes `created_by`, `user_id` et `assigned_to`.

## Mise en route

### 1. Base de données

Créer un projet Neon — le plus simple depuis Vercel → Storage, qui renseigne
`DATABASE_URL` tout seul. Les tables sont créées automatiquement au premier
appel ; voir [`db/README.md`](db/README.md).

### 2. Générer les hash de mots de passe

```bash
npm run hash-password           # saisie masquée
npm run hash-password -- 'mdp'  # ou en argument
```

La commande affiche une ligne `scrypt:32768:8:1:…:…` à recopier dans le champ
`password` d'`APP_USERS`.

### 3. Variables d'environnement

Copier `.env.example` en `.env.local` pour le développement, et saisir les
mêmes valeurs dans Vercel → Settings → Environment Variables pour la production.

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion Neon (prendre la version *pooled*) |
| `AUTH_SECRET` | Clé de signature des cookies, 32 caractères minimum |
| `APP_USERS` | Les deux comptes en JSON (id, email, display_name, hash) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Notifications push |
| `CRON_SECRET` | Secret du résumé quotidien, partagé avec le workflow GitHub |

### 4. Développement

```bash
npm install
npm run dev
```

## Vérifier que le déploiement est bien branché

Un build Vercel réussi ne prouve rien : les variables d'environnement ne sont
lues qu'à la première requête, donc l'app se déploie sans broncher même mal
configurée. Pour savoir où on en est, ouvrir :

```
https://<ton-app>.vercel.app/api/health
```

Cette route est accessible sans connexion (c'est justement quand la connexion
ne marche pas qu'elle sert) et ne renvoie aucune valeur de secret — seulement
des états. Elle répond 200 quand tout est en place, 503 sinon, en nommant ce
qui manque : variable absente, base injoignable, schéma pas encore exécuté,
hash de mot de passe malformé.

## Résumé quotidien

`.github/workflows/daily-summary.yml` appelle `/api/cron/daily-summary` à 18h
avec `Authorization: Bearer $CRON_SECRET`. C'est la seule route qui ne passe pas
par le cookie de session ; sans `CRON_SECRET` configuré côté serveur, elle
refuse tous les appels.
