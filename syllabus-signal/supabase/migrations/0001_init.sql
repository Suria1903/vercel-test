-- Syllabus & Signal — initial schema
-- Encodes: static UPSC subjects, RSS sources, articles, the many-to-many
-- article<->subject mapping WITH a per-link rationale, Claude-generated
-- questions, per-user responses, and retention views.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Static reference data (read-only to clients, written by the service role)
-- ---------------------------------------------------------------------------

create table subjects (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,          -- matches the enum Claude returns
  name        text not null,
  color_bg    text not null,                 -- pill background (hex)
  color_fg    text not null,                 -- pill text (hex)
  sort_order  int  not null default 0
);

create table subtopics (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects(id) on delete cascade,
  name        text not null,
  unique (subject_id, name)
);

-- Downloadable syllabus tree (Prelims, GS-I..IV). parent_id allows nesting.
create table syllabus_nodes (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references syllabus_nodes(id) on delete cascade,
  paper       text not null,                 -- e.g. 'GS-II', 'Prelims'
  title       text not null,
  body        text,
  sort_order  int not null default 0
);

create table sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rss_url     text unique not null,
  active      boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Ingested content
-- ---------------------------------------------------------------------------

create table articles (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid references sources(id) on delete set null,
  url           text unique not null,        -- dedupe key
  title         text not null,
  summary       text,                         -- Claude-written, exam-focused
  content       text,                         -- raw extracted body
  image_url     text,
  video_url     text,
  published_at  timestamptz,
  fetched_at    timestamptz not null default now(),
  processed     boolean not null default false  -- categorized + questions made
);
create index on articles (published_at desc);
create index on articles (processed);

-- THE multi-tag table: one row per (article, subject) with its own rationale.
create table article_subjects (
  id               uuid primary key default gen_random_uuid(),
  article_id       uuid not null references articles(id) on delete cascade,
  subject_id       uuid not null references subjects(id) on delete cascade,
  is_primary       boolean not null default false,
  subtopic         text,                       -- free text Claude assigns
  rationale        text not null,              -- "why this story sits here"
  syllabus_ref     text,                       -- e.g. 'GS-III: monetary policy'
  unique (article_id, subject_id)
);
create index on article_subjects (subject_id);

create table questions (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references articles(id) on delete cascade,
  subject_id    uuid not null references subjects(id) on delete cascade,
  stem          text not null,
  options       jsonb not null,               -- ["a","b","c","d"]
  correct_index int  not null check (correct_index between 0 and 3),
  explanation   text not null,
  created_at    timestamptz not null default now()
);
create index on questions (subject_id);

-- ---------------------------------------------------------------------------
-- Per-user data
-- ---------------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table responses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  question_id    uuid not null references questions(id) on delete cascade,
  article_id     uuid not null references articles(id) on delete cascade,
  subject_id     uuid not null references subjects(id) on delete cascade,
  selected_index int  not null,
  is_correct     boolean not null,
  answered_at    timestamptz not null default now()
);
create index on responses (user_id, subject_id);
create index on responses (user_id, article_id);

-- ---------------------------------------------------------------------------
-- Retention views (drive the Retention tab and the "missed" flags)
-- ---------------------------------------------------------------------------

-- Per user + subject: accuracy % over all answered questions.
-- security_invoker makes the underlying responses RLS apply to the caller,
-- so a user only ever sees their own retention numbers.
create view v_user_subject_retention with (security_invoker = on) as
select
  r.user_id,
  r.subject_id,
  count(*)                                             as answered,
  count(*) filter (where r.is_correct)                 as correct,
  round(100.0 * count(*) filter (where r.is_correct) / count(*))::int as retention_pct
from responses r
group by r.user_id, r.subject_id;

-- Latest verdict per user + article: 'correct' | 'missed'.
create view v_user_article_status with (security_invoker = on) as
select distinct on (r.user_id, r.article_id)
  r.user_id,
  r.article_id,
  case when r.is_correct then 'correct' else 'missed' end as status,
  r.answered_at
from responses r
order by r.user_id, r.article_id, r.answered_at desc;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Reference + content: any signed-in user may read; only the service role
-- (which bypasses RLS) may write during ingest.
alter table subjects          enable row level security;
alter table subtopics         enable row level security;
alter table syllabus_nodes    enable row level security;
alter table sources           enable row level security;
alter table articles          enable row level security;
alter table article_subjects  enable row level security;
alter table questions         enable row level security;

create policy read_subjects        on subjects         for select to authenticated using (true);
create policy read_subtopics       on subtopics        for select to authenticated using (true);
create policy read_syllabus        on syllabus_nodes   for select to authenticated using (true);
create policy read_sources         on sources          for select to authenticated using (true);
create policy read_articles        on articles         for select to authenticated using (true);
create policy read_article_subjects on article_subjects for select to authenticated using (true);
create policy read_questions       on questions        for select to authenticated using (true);

-- Per-user: a user only ever sees and writes their own rows.
alter table profiles  enable row level security;
alter table responses enable row level security;

create policy own_profile_select on profiles  for select to authenticated using (id = auth.uid());
create policy own_profile_upsert on profiles  for insert to authenticated with check (id = auth.uid());
create policy own_profile_update on profiles  for update to authenticated using (id = auth.uid());

create policy own_responses_select on responses for select to authenticated using (user_id = auth.uid());
create policy own_responses_insert on responses for insert to authenticated with check (user_id = auth.uid());

-- Auto-create a profile row on signup.
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name) values (new.id, new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Let signed-in users read the retention views (rows still filtered by RLS).
grant select on v_user_subject_retention to authenticated;
grant select on v_user_article_status   to authenticated;
