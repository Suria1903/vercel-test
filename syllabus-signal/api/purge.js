import { admin } from './_lib/supabase.js';

// Purge all ingested content and user responses while keeping user accounts
// and reference data (subjects, sources, syllabus). Protected by INGEST_SECRET.
function authorised(req) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true; // dev convenience
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' });

  try {
    const result = { deleted: {} };

    // Delete in order to respect foreign key constraints
    const { error: respErr, count: respCount } = await admin
      .from('responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    result.deleted.responses = respCount ?? 0;
    if (respErr) throw respErr;

    const { error: qErr, count: qCount } = await admin
      .from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    result.deleted.questions = qCount ?? 0;
    if (qErr) throw qErr;

    const { error: asErr, count: asCount } = await admin
      .from('article_subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    result.deleted.article_subjects = asCount ?? 0;
    if (asErr) throw asErr;

    const { error: artErr, count: artCount } = await admin
      .from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    result.deleted.articles = artCount ?? 0;
    if (artErr) throw artErr;

    // Verify what remains
    const [subjects, sources, profiles] = await Promise.all([
      admin.from('subjects').select('id', { count: 'exact', head: true }),
      admin.from('sources').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    result.kept = {
      subjects: subjects.count ?? 0,
      sources: sources.count ?? 0,
      profiles: profiles.count ?? 0,
    };

    return res.status(200).json({
      message: 'Purge complete. All content deleted, users and reference data preserved.',
      ...result,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
