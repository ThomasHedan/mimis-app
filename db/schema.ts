// Schéma de la base — source unique de vérité.
//
// L'app applique ce schéma toute seule à la première requête si les tables
// n'existent pas encore (voir lib/db.ts) : il n'y a rien à exécuter à la main
// pour démarrer. Le SQL reste lisible ici, et peut être collé tel quel dans
// l'éditeur SQL de Neon si on préfère le faire soi-même.
//
// Toutes les instructions sont en IF NOT EXISTS : les rejouer ne casse rien.

/** Tables que le schéma doit produire — sert à vérifier qu'il est complet. */
export const SCHEMA_TABLES = [
  "events", "habits", "habit_logs", "chores",
  "budget_categories", "budget_entries", "notifications", "push_subscriptions",
] as const;

export const SCHEMA_SQL = `
-- Schéma MimisApp — Postgres (Neon).
--
-- Il n'y a volontairement PAS de table d'utilisateurs : les deux comptes sont
-- déclarés dans la variable d'environnement APP_USERS. Les colonnes
-- created_by / user_id / assigned_to stockent l'\`id\` défini dans cette
-- variable — d'où leur type \`text\` et non \`uuid\`.

CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  location    text,
  color       text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  all_day     boolean     NOT NULL DEFAULT false,
  created_by  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_start_at_idx   ON events (start_at);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at);

CREATE TABLE IF NOT EXISTS habits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  color       text,
  frequency   text        NOT NULL DEFAULT 'daily'
              CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  user_id     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habits_user_id_idx ON habits (user_id);

CREATE TABLE IF NOT EXISTS habit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    uuid NOT NULL REFERENCES habits (id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  logged_date date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Une seule coche par habitude et par jour.
  UNIQUE (habit_id, logged_date)
);
CREATE INDEX IF NOT EXISTS habit_logs_user_date_idx ON habit_logs (user_id, logged_date);

CREATE TABLE IF NOT EXISTS chores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  done             boolean     NOT NULL DEFAULT false,
  done_at          timestamptz,
  due_date         date,
  assigned_to      text[],
  priority         text        NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  notes            text,
  recurrence_value integer,
  recurrence_unit  text CHECK (recurrence_unit IN ('weeks', 'months')),
  created_by       text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chores_done_due_idx   ON chores (done, due_date);
CREATE INDEX IF NOT EXISTS chores_created_at_idx ON chores (created_at);

CREATE TABLE IF NOT EXISTS budget_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text          NOT NULL,
  color         text          NOT NULL DEFAULT 'blue',
  monthly_limit numeric(12,2) NOT NULL DEFAULT 0,
  icon          text,
  created_by    text          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid          NOT NULL REFERENCES budget_categories (id) ON DELETE CASCADE,
  amount      numeric(12,2) NOT NULL,
  note        text,
  date        date          NOT NULL,
  created_by  text          NOT NULL,
  created_at  timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS budget_entries_date_idx ON budget_entries (date);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  title      text        NOT NULL,
  body       text        NOT NULL,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx       ON notifications (user_id) WHERE NOT read;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  endpoint   text        NOT NULL UNIQUE,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
`;
