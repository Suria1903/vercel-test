// Local dev server — runs the same /api functions without the Vercel CLI.
//   node --env-file=.env dev-server.js      (Node 20.6+ for --env-file)
// Then the Angular dev proxy (or a direct call) reaches it on :3000.
import http from 'node:http';
import ingest from './api/ingest.js';
import health from './api/health.js';

const routes = {
  '/api/ingest': ingest,
  '/api/health': health,
};

const PORT = process.env.PORT || 3000;

http
  .createServer(async (req, res) => {
    // Allow the Angular app (and curl) to call us during development.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

    // The handlers use Vercel's res.status().json() — add those to raw Node res.
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(obj));
      return res;
    };

    const path = (req.url || '').split('?')[0];
    const handler = routes[path];
    if (!handler) return res.status(404).json({ error: 'not found' });

    try { await handler(req, res); }
    catch (e) { res.status(500).json({ error: e.message }); }
  })
  .listen(PORT, () => console.log(`API dev server → http://localhost:${PORT}`));
