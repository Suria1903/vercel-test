import Parser from 'rss-parser';
import { admin } from './_lib/supabase.js';
import { categorizeArticle, generateQuestions } from './_lib/anthropic.js';

const parser = new Parser({ timeout: 15000 });
const MAX_PER_SOURCE = Number(process.env.INGEST_MAX_PER_SOURCE || 8);

// Protects the endpoint so only Vercel Cron (or an authorised caller) can run
// the paid Claude pipeline. Set INGEST_SECRET in env and the Cron header.
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

  const result = { sources: 0, fetched: 0, new: 0, processed: 0, errors: [] };

  try {
    const { data: subjects } = await admin.from('subjects').select('id, slug');
    const slugToId = Object.fromEntries(subjects.map((s) => [s.slug, s.id]));

    const { data: sources } = await admin
      .from('sources')
      .select('id, name, rss_url')
      .eq('active', true);

    for (const source of sources) {
      result.sources++;
      let feed;
      try {
        feed = await parser.parseURL(source.rss_url);
      } catch (e) {
        result.errors.push(`${source.name}: ${e.message}`);
        continue;
      }

      for (const item of (feed.items || []).slice(0, MAX_PER_SOURCE)) {
        const url = item.link;
        if (!url) continue;
        result.fetched++;

        // Dedupe on URL.
        const { data: existing } = await admin
          .from('articles').select('id').eq('url', url).maybeSingle();
        if (existing) continue;

        const content =
          item.contentSnippet || item.content || item['content:encoded'] || item.title;

        // Insert the bare article first so a Claude failure doesn't lose it.
        const { data: article, error: insErr } = await admin
          .from('articles')
          .insert({
            source_id: source.id,
            url,
            title: item.title || '(untitled)',
            content,
            published_at: item.isoDate || item.pubDate || null,
          })
          .select('id, title, content')
          .single();
        if (insErr) { result.errors.push(`${url}: ${insErr.message}`); continue; }
        result.new++;

        try {
          // 1) Categorize into one-or-more subjects with per-link rationale.
          const cat = await categorizeArticle(article);

          await admin.from('articles')
            .update({ summary: cat.summary, processed: true })
            .eq('id', article.id);

          const links = cat.subjects
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

          // 2) Generate retention MCQs from the article.
          const questions = await generateQuestions({
            title: article.title,
            summary: cat.summary,
            subjects: cat.subjects,
          });
          const rows = questions
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
          result.errors.push(`process ${url}: ${e.message}`);
        }
      }
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message, result });
  }
}
