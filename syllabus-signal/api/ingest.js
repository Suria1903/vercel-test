import Parser from 'rss-parser';
import { admin } from './_lib/supabase.js';
import { categorizeArticle, generateQuestions } from './_lib/anthropic.js';

const parser = new Parser({ timeout: 15000 });
const MAX_PER_SOURCE = Number(process.env.INGEST_MAX_PER_SOURCE || 8);
// How many unprocessed articles to categorize per run. Keep small enough to
// finish inside the function's maxDuration (60s on Vercel Hobby). Raise it
// locally (no time limit) to drain a backlog quickly.
const PROCESS_LIMIT = Number(process.env.INGEST_PROCESS_LIMIT || 6);

function authorised(req) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true; // dev convenience
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' });

  const result = { sources: 0, fetched: 0, new: 0, processed: 0, pending: 0, errors: [] };

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[ingest] ANTHROPIC_API_KEY is not set — categorization will fail');
    }
    const { data: subjects } = await admin.from('subjects').select('id, slug');
    const slugToId = Object.fromEntries((subjects || []).map((s) => [s.slug, s.id]));

    // ---- Phase 1: fetch feeds, insert NEW bare articles (dedupe on URL) ----
    const { data: sources } = await admin
      .from('sources').select('id, name, rss_url').eq('active', true);

    for (const source of sources || []) {
      result.sources++;
      let feed;
      try {
        feed = await parser.parseURL(source.rss_url);
      } catch (e) {
        console.error('[ingest] feed error', source.name, '-', e.message);
        result.errors.push(`${source.name}: ${e.message}`);
        continue;
      }
      for (const item of (feed.items || []).slice(0, MAX_PER_SOURCE)) {
        const url = item.link;
        if (!url) continue;
        result.fetched++;

        const { data: existing } = await admin
          .from('articles').select('id').eq('url', url).maybeSingle();
        if (existing) continue;

        const content =
          item.contentSnippet || item.content || item['content:encoded'] || item.title;
        const { error: insErr } = await admin.from('articles').insert({
          source_id: source.id,
          url,
          title: item.title || '(untitled)',
          content,
          published_at: item.isoDate || item.pubDate || null,
        });
        if (insErr) { result.errors.push(`${url}: ${insErr.message}`); continue; }
        result.new++;
      }
    }

    // ---- Phase 2: categorize a batch of UNPROCESSED articles ----
    // Picks up the ones just inserted AND any backlog left by earlier runs.
    const { data: pending } = await admin
      .from('articles')
      .select('id, title, content')
      .eq('processed', false)
      .order('fetched_at', { ascending: true })
      .limit(PROCESS_LIMIT);

    for (const article of pending || []) {
      try {
        const cat = await categorizeArticle(article);

        await admin.from('articles')
          .update({ summary: cat.summary, processed: true })
          .eq('id', article.id);

        const links = (cat.subjects || [])
          .filter((s) => slugToId[s.subject])
          .map((s) => ({
            article_id: article.id,
            subject_id: slugToId[s.subject],
            is_primary: !!s.is_primary,
            subtopic: s.subtopic || null,
            rationale: s.rationale,
            syllabus_ref: s.syllabus_ref || null,
          }));
        if (links.length) await admin.from('article_subjects').insert(links);

        const questions = await generateQuestions({
          title: article.title,
          summary: cat.summary,
          subjects: cat.subjects,
        });
        const rows = (questions || [])
          .filter((q) => slugToId[q.subject])
          .map((q) => ({
            article_id: article.id,
            subject_id: slugToId[q.subject],
            stem: q.stem,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
          }));
        if (rows.length) await admin.from('questions').insert(rows);

        result.processed++;
      } catch (e) {
        console.error('[ingest] categorization failed for', article.id, '-', e.message);
        result.errors.push(`process ${article.id}: ${e.message}`);
      }
    }

    // Remaining backlog after this run — call again (or let cron run) to drain.
    const { count } = await admin
      .from('articles').select('id', { count: 'exact', head: true })
      .eq('processed', false);
    result.pending = count ?? 0;

    console.log('[ingest] done', JSON.stringify(result));
    return res.status(200).json(result);
  } catch (e) {
    console.error('[ingest] fatal', e.message);
    return res.status(500).json({ error: e.message, result });
  }
}
