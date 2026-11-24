import { pages } from './pages';

export interface Env {
  ASSETS: Fetcher; MEDIA: R2Bucket;
  SUPABASE_URL: string; SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string; TURNSTILE_SECRET: string; // secrets
  ALLOWED_ORIGIN?: string;
  RATE_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
}
type Cfg = { cols: string[]; order: string; create?: boolean; del?: boolean };
const TABLES: Record<string, Cfg> = {
  services: { cols: ['title','slug','summary','description','icon','sort_order','is_published'], order: 'sort_order.asc' },
  projects: { cols: ['title','slug','summary','body','category','technologies','cover_key','demo_url','featured','is_published'], order: 'created_at.desc' },
  articles: { cols: ['title','slug','excerpt','body','seo_title','seo_description','cover_key','status'], order: 'created_at.desc' },
  testimonials: { cols: ['client_name','organization','quote','avatar_key','is_published'], order: 'created_at.desc' },
  clients: { cols: ['name','logo_key','website_url','is_published'], order: 'created_at.desc' },
  leads: { cols: ['status','notes'], order: 'created_at.desc', create: false, del: false },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SERVICES = ['website','webapp','system','custom'];
const json = (d: unknown, s = 200, h: Record<string,string> = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const sb = (env: Env, path: string, init: RequestInit = {}) =>
  fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', ...(init.headers as object) } });

// Verifikasi token ke Supabase Auth, lalu cek role di admin_profiles
async function auth(req: Request, env: Env) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!t) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${t}` } });
  if (!r.ok) return null;
  const u = (await r.json()) as { id?: string };
  if (!u.id || !UUID.test(u.id)) return null;
  const p = (await sb(env, `admin_profiles?user_id=eq.${u.id}&select=role`).then(x => x.json())) as { role: string }[];
  return Array.isArray(p) && p[0] ? { id: u.id, role: p[0].role } : null;
}
const log = (env: Env, actor: string, action: string, entity: string, id?: string) =>
  sb(env, 'activity_logs', { method: 'POST', body: JSON.stringify({ actor_id: actor, action, entity, entity_id: id ?? null }) });

function pick(cfg: Cfg, body: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const c of cfg.cols) if (c in body) {
    let v = body[c];
    if (c === 'technologies' && typeof v === 'string') v = v.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
    if (typeof v === 'string') v = v.slice(0, c === 'body' || c === 'description' ? 20000 : 2000);
    o[c] = v === '' ? null : v;
  }
  return o;
}

async function admin(req: Request, env: Env, parts: string[]): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (req.method !== 'GET' && origin && origin !== (env.ALLOWED_ORIGIN || new URL(req.url).origin)) return json({ error: 'forbidden' }, 403);
  const me = await auth(req, env);
  if (!me) return json({ error: 'unauthorized' }, 401);
  const [table, id] = parts;
  if (id && !UUID.test(id)) return json({ error: 'bad_id' }, 400);

  if (table === 'media') {
    if (req.method === 'GET') return json(await sb(env, 'media?select=*&order=created_at.desc&limit=200').then(r => r.json()));
    if (req.method === 'POST') {
      const buf = await req.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > 5_000_000) return json({ error: 'size' }, 413);
      const b = new Uint8Array(buf.slice(0, 12));
      const is = (...x: number[]) => x.every((v, i) => b[i] === v);
      let ext = '', mime = '';
      if (is(0x89,0x50,0x4e,0x47)) [ext, mime] = ['png','image/png'];
      else if (is(0xff,0xd8,0xff)) [ext, mime] = ['jpg','image/jpeg'];
      else if (is(0x47,0x49,0x46,0x38)) [ext, mime] = ['gif','image/gif'];
      else if (is(0x52,0x49,0x46,0x46) && b[8] === 0x57 && b[9] === 0x45) [ext, mime] = ['webp','image/webp'];
      else return json({ error: 'type' }, 415);
      const key = `uploads/${crypto.randomUUID()}.${ext}`;
      await env.MEDIA.put(key, buf, { httpMetadata: { contentType: mime } });
      const alt = clean(new URL(req.url).searchParams.get('alt'), 200);
      const r = await sb(env, 'media', { method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ object_key: key, alt_text: alt || null, mime, size: buf.byteLength }) });
      await log(env, me.id, 'upload', 'media', key);
      return json(await r.json(), 201);
    }
    if (req.method === 'DELETE' && id) {
      const row = (await sb(env, `media?id=eq.${id}&select=object_key`).then(r => r.json())) as { object_key: string }[];
      if (row[0]) await env.MEDIA.delete(row[0].object_key);
      await sb(env, `media?id=eq.${id}`, { method: 'DELETE' });
      await log(env, me.id, 'delete', 'media', id);
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  }

  const cfg = TABLES[table];
  if (!cfg) return json({ error: 'not_found' }, 404);
  if (req.method === 'GET') return json(await sb(env, `${table}?select=*&order=${cfg.order}&limit=200`).then(r => r.json()));
  if (req.method === 'DELETE') {
    if (cfg.del === false || !id) return json({ error: 'method' }, 405);
    await sb(env, `${table}?id=eq.${id}`, { method: 'DELETE' });
    await log(env, me.id, 'delete', table, id);
    return json({ ok: true });
  }
  if (req.method === 'POST' || req.method === 'PATCH') {
    if (req.method === 'POST' && cfg.create === false) return json({ error: 'method' }, 405);
    if (req.method === 'PATCH' && !id) return json({ error: 'bad_id' }, 400);
    const raw = await req.text();
    if (raw.length > 60000) return json({ error: 'too_large' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
    const data = pick(cfg, body);
    if (typeof data.slug === 'string' && !/^[a-z0-9-]{1,100}$/.test(data.slug)) return json({ error: 'slug', detail: 'Slug: huruf kecil, angka, tanda minus' }, 400);
    const r = await sb(env, req.method === 'POST' ? table : `${table}?id=eq.${id}`, {
      method: req.method, headers: { Prefer: 'return=representation' }, body: JSON.stringify(data) });
    if (!r.ok) return json({ error: 'db', detail: (await r.text()).slice(0, 200) }, 400);
    await log(env, me.id, req.method === 'POST' ? 'create' : 'update', table, id);
    return json(await r.json(), req.method === 'POST' ? 201 : 200);
  }
  return json({ error: 'method' }, 405);
}

async function publicContent(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default, key = new Request(new URL(req.url).origin + '/api/public/content');
  const hit = await cache.match(key);
  if (hit) return hit;
  const q = (t: string, extra = '') => sb(env, `${t}?is_published=eq.true${extra}`).then(r => r.json());
  const [services, projects, testimonials, clients] = await Promise.all([
    q('services', '&select=title,slug,summary,icon&order=sort_order.asc'),
    q('projects', '&select=title,slug,summary,category,technologies,cover_key,demo_url,featured&order=created_at.desc&limit=12'),
    q('testimonials', '&select=client_name,organization,quote&order=created_at.desc&limit=6'),
    q('clients', '&select=name,logo_key,website_url'),
  ]);
  const res = json({ services, projects, testimonials, clients }, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=60' });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

async function handleLead(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || new URL(req.url).origin)) return json({ error: 'forbidden' }, 403);
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.RATE_LIMITER && !(await env.RATE_LIMITER.limit({ key: ip })).success) return json({ error: 'rate_limited' }, 429);
  const raw = await req.text();
  if (raw.length > 8000) return json({ error: 'too_large' }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  if (clean(body.website, 50)) return json({ ok: true });
  const name = clean(body.name, 100), email = clean(body.email, 150).toLowerCase();
  const whatsapp = clean(body.whatsapp, 20).replace(/[^\d+\-\s]/g, ''), brief = clean(body.brief, 1500);
  const service = SERVICES.includes(body.service as string) ? (body.service as string) : 'website';
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid' }, 422);
  const token = clean(body['cf-turnstile-response'], 2048);
  if (!token) return json({ error: 'captcha' }, 400);
  const ts = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) })
    .then(r => r.json() as Promise<{ success: boolean }>).catch(() => ({ success: false }));
  if (!ts.success) return json({ error: 'captcha' }, 400);
  const res = await sb(env, 'leads', { method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ name, email, whatsapp: whatsapp || null, service_interest: service, brief: brief || null }) });
  if (!res.ok) { console.error('supabase', res.status); return json({ error: 'server' }, 502); }
  return json({ ok: true }, 201);
}

async function media(env: Env, key: string): Promise<Response> {
  if (!/^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(key)) return new Response('Not found', { status: 404 });
  const o = await env.MEDIA.get(key);
  if (!o) return new Response('Not found', { status: 404 });
  return new Response(o.body, { headers: { 'Content-Type': o.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(req.url);
    try {
      if (pathname === '/api/health') return json({ ok: true });
      if (pathname === '/api/public/content' && req.method === 'GET') return publicContent(req, env, ctx);
      if (pathname === '/api/leads') return req.method === 'POST' ? handleLead(req, env) : json({ error: 'method' }, 405);
      if (pathname.startsWith('/api/admin/')) return admin(req, env, pathname.slice(11).split('/').filter(Boolean));
      if (pathname.startsWith('/media/') && req.method === 'GET') return media(env, pathname.slice(7));
      if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
      const pg = await pages(req, env, pathname.replace(/(.)\/$/, '$1'));
      if (pg) return pg;
    } catch (e) { console.error(e); return json({ error: 'server' }, 500); }
    return env.ASSETS.fetch(req);
  },
};
