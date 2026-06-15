# Syllabus & Signal

Maps a daily news feed onto the static UPSC syllabus. Claude reads each story,
files it under one **or more** subjects (with a rationale per subject), and
writes retention MCQs. Aspirants revise by date/topic, take daily checks, and
the app tracks recall down to the individual article.

## Stack

| Layer    | Choice                                  |
|----------|-----------------------------------------|
| Frontend | Angular (iPad-first), Supabase JS client |
| Backend  | Node serverless functions on Vercel     |
| Database | Supabase Postgres + Auth + RLS          |
| AI       | Claude API (categorization + questions) |
| Hosting  | Vercel (web + `/api`) + Supabase        |

## How data flows

```
Vercel Cron (daily)  ──►  POST /api/ingest
  │                          │
  │   RSS feeds  ───────────►│ fetch + dedupe by URL
  │                          │
  │                          ├─► Claude: categorizeArticle()
  │                          │     → summary + [{subject, is_primary, rationale, ...}]
  │                          │
  │                          └─► Claude: generateQuestions()
  │                                → [{stem, options, correct_index, explanation}]
  │                          ▼
  └────────────────►  Supabase (articles, article_subjects, questions)

Angular  ──►  supabase-js (anon key + RLS)
  • email/password login
  • read articles / article_subjects / questions
  • write responses  ──►  retention views recompute
  • "Refresh" button  ──►  POST /api/ingest (Bearer INGEST_SECRET)
```

The browser never sees the Anthropic key or the service-role key — only the
backend touches those. Angular uses the public anon key, and RLS keeps each
user's responses private while content stays read-only.

## The data model in one line

`article_subjects` is the heart: one row per (article, subject) carrying
`is_primary`, `subtopic`, and a `rationale`. That's what lets a single story
appear under several topics, each explaining *why* it's filed there.

## Local setup

```bash
# 1. Database
#    Create a Supabase project, then in the SQL editor run, in order:
#      supabase/migrations/0001_init.sql
#      supabase/seed.sql
#    (or: supabase db push  +  psql < supabase/seed.sql)

# 2. Backend deps + env
npm install
cp .env.example .env        # fill in keys

# 3. Run the pipeline once to populate content
vercel dev                  # then: curl -XPOST localhost:3000/api/ingest
```

## Deploy

1. Push this repo to GitHub and import it into Vercel.
2. Add every backend variable from `.env.example` in Vercel → Settings → Environment Variables.
3. Vercel auto-detects `vercel.json`; the cron runs `/api/ingest` at 01:30 UTC daily.
4. The Angular app (in `web/`, next deliverable) builds to static and ships from the same project.

## Notes / next

- Verify each `rss_url` in `supabase/seed.sql` against the publisher.
- Retention here is accuracy-based (see the two views). A spaced-repetition
  scheduler (SM-2) can layer on by adding due-date columns to a review table.
- `web/` (the Angular iPad-first UI) is the next piece to build.
