// Public (anon) values — safe to ship in the browser bundle.
// Fill these from Supabase → Project Settings → API.
export const environment = {
  supabaseUrl: 'https://uznerhbktvziwtasfbez.supabase.co',
  supabaseAnonKey: 'sb_publishable_kZ6v0BKSxckrqf8JVd1SUQ_lr9FFm6G',
  // The Refresh button calls this. On Vercel it's same-origin '/api/ingest'.
  // For local dev with `vercel dev`, set to 'http://localhost:3000/api/ingest'.
  ingestUrl: '/api/ingest',
};
