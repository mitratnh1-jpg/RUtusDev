import { pages } from './pages';
import { buildPdf } from './pdf';
import { secure } from './security';
import { PROJECT_EMBED, PROJECT_LIST_COLS, shapeProject } from './projects';

export interface Env {
  ASSETS: Fetcher; MEDIA: R2Bucket;
  SUPABASE_URL: string; SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string; TURNSTILE_SECRET: string; // secrets
  ALLOWED_ORIGIN?: string; TURNSTILE_SITE_KEY?: string; CF_BEACON_TOKEN?: string;
  NOTIFY_TO?: string; NOTIFY_FROM?: string; RESEND_API_KEY?: string; NOTIFY_WEBHOOK_URL?: string; // notifikasi lead (secret: RESEND_API_KEY, NOTIFY_WEBHOOK_URL)
  RATE_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  RATE_LIMITER_ADMIN?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  // Cloudflare Images binding: ubah ukuran & format (AVIF/WebP) gambar saat disajikan. Tidak ada = sajikan berkas asli.
  IMAGES?: { input(s: ReadableStream): { transform(o: { width?: number; fit?: string }): { output(o: { format: string; quality?: number }): Promise<{ response(): Response }> } } };
  REQUIRE_MFA?: string; // "1" = admin wajib MFA (akun tanpa MFA hanya bisa membuka tab Keamanan untuk mengaktifkannya)
  DIAG?: string; // "1" = aktifkan /api/diag (diagnostik sementara, tanpa membocorkan kunci)
  CSP_REPORT_ONLY?: string; // "1" = CSP hanya dilaporkan (tidak memblokir); selain itu/tidak diset = diberlakukan
  CF_API_TOKEN?: string; CF_ZONE_ID?: string; // opsional: purge cache konten publik di seluruh lokasi Cloudflare setelah admin menyimpan
}
type Cfg = { cols: string[]; order: string; create?: boolean; del?: boolean };
const TABLES: Record<string, Cfg> = {
  services: { cols: ['title','slug','summary','description','icon','sort_order','is_published'], order: 'sort_order.asc' },
  projects: { cols: ['title','slug','summary','body','category_id','cover_key','demo_url','featured','status'], order: 'created_at.desc' },
  project_categories: { cols: ['name','slug','sort_order'], order: 'sort_order.asc' },
  technologies: { cols: ['name','slug'], order: 'name.asc' },
  articles: { cols: ['title','slug','excerpt','body','seo_title','seo_description','cover_key','status'], order: 'created_at.desc' },
  testimonials: { cols: ['client_name','organization','quote','avatar_key','is_published'], order: 'created_at.desc' },
  clients: { cols: ['name','logo_key','website_url','is_published'], order: 'created_at.desc' },
  leads: { cols: ['status','notes'], order: 'created_at.desc', create: false, del: false },
  organizations: { cols: ['name','website','industry','notes'], order: 'created_at.desc' },
  contacts: { cols: ['name','email','whatsapp','position','organization_id','notes'], order: 'created_at.desc' },
  deals: { cols: ['title','organization_id','contact_id','value','stage','source','expected_close','notes'], order: 'created_at.desc' },
  interactions: { cols: ['deal_id','kind','note'], order: 'created_at.desc' },
  activity_logs: { cols: [], order: 'created_at.desc', create: false, del: false },
  proposals: { cols: ['number','title','deal_id','status','valid_until','scope','terms'], order: 'created_at.desc' },
  invoices: { cols: ['number','title','deal_id','organization_id','status','issue_date','due_date','paid_amount','notes'], order: 'created_at.desc' },
  tasks: { cols: ['title','deal_id','milestone_id','status','priority','due_date','notes'], order: 'due_date.asc.nullslast' },
  projects_delivery: { cols: ['deal_id','title','sort_order','status','due_date','notes'], order: 'due_date.asc.nullslast' },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SETTINGS: Record<string, string[]> = {
  hero: ['eyebrow','headline','headline_dim','subheadline','cta_primary','cta_secondary'],
  contact: ['whatsapp','email'],
  stats: ['projects','timeline'],
};
// Fallback rate limit (Cache API, per-lokasi). Tidak berfungsi di domain *.workers.dev.
// Jalur utama: binding `ratelimits` di wrangler.jsonc (RATE_LIMITER / RATE_LIMITER_ADMIN).
async function limited(ip: string, bucket: string, max: number): Promise<boolean> {
  const c = caches.default, k = new Request(`https://rl.internal/${bucket}/${encodeURIComponent(ip)}`);
  let n = 0, t = Date.now();
  const hit = await c.match(k);
  if (hit) { const d = (await hit.json()) as { n: number; t: number }; n = d.n; t = d.t; }
  n++;
  const ttl = Math.max(1, 60 - Math.floor((Date.now() - t) / 1000));
  await c.put(k, new Response(JSON.stringify({ n, t }), { headers: { 'Cache-Control': `max-age=${ttl}` } }));
  return n > max;
}
type RL = { limit(o: { key: string }): Promise<{ success: boolean }> } | undefined;
// true = harus ditolak. Pakai binding bila ada, jika tidak jatuh ke fallback Cache API.
async function overLimit(rl: RL, ip: string, bucket: string, max: number): Promise<boolean> {
  if (rl) { try { return !(await rl.limit({ key: `${bucket}:${ip}` })).success; } catch (e) { console.error('ratelimit', e); } }
  return limited(ip, bucket, max);
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
const SERVICE_LABEL: Record<string, string> = { website: 'Website / landing page', webapp: 'Aplikasi web', system: 'Sistem informasi', custom: 'Aplikasi custom' };
// Notifikasi lead baru: email lewat Resend dan/atau webhook (mis. n8n/Make/Zapier untuk WhatsApp, Telegram, Slack).
// Dijalankan lewat ctx.waitUntil: kegagalan hanya dicatat di log dan tidak menggagalkan pengiriman form.
async function notifyLead(env: Env, l: { name: string; email: string; whatsapp: string | null; service: string; brief: string | null }) {
  const svc = SERVICE_LABEL[l.service] || l.service;
  const jobs: Promise<unknown>[] = [];
  const to = (env.NOTIFY_TO || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
  if (env.RESEND_API_KEY && to.length) {
    const html = `<h2>Prospek baru dari website</h2><p><b>Nama:</b> ${esc(l.name)}<br><b>Email:</b> ${esc(l.email)}<br><b>WhatsApp:</b> ${esc(l.whatsapp || '-')}<br><b>Layanan:</b> ${esc(svc)}</p><p><b>Kebutuhan:</b><br>${esc(l.brief || '-').replace(/\n/g, '<br>')}</p>`;
    jobs.push(fetch('https://api.resend.com/emails', { method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.NOTIFY_FROM || 'RUtusdev <leads@rutusdev.com>', to, reply_to: l.email, subject: `Prospek baru: ${l.name.slice(0, 60)} (${svc})`, html }) })
      .then(r => { if (!r.ok) console.error('notify email', r.status); }));
  }
  if (env.NOTIFY_WEBHOOK_URL && /^https:\/\//.test(env.NOTIFY_WEBHOOK_URL)) {
    const text = `Prospek baru: ${l.name} · ${l.email}${l.whatsapp ? ' · WA ' + l.whatsapp : ''} · ${svc}${l.brief ? '\n' + l.brief.slice(0, 500) : ''}`;
    jobs.push(fetch(env.NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text, event: 'lead.created', lead: l }) })
      .then(r => { if (!r.ok) console.error('notify webhook', r.status); }));
  }
  await Promise.allSettled(jobs);
}
const SERVICES = ['website','webapp','system','custom'];
const json = (d: unknown, s = 200, h: Record<string,string> = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Kunci JWT lama (eyJ…) dikirim sebagai apikey + Bearer; kunci format baru (sb_secret_… / sb_publishable_…) hanya lewat header apikey.
const keyHdr = (k: string): Record<string, string> => (k.startsWith('eyJ') ? { apikey: k, Authorization: `Bearer ${k}` } : { apikey: k });
const sb = (env: Env, path: string, init: RequestInit = {}) =>
  fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: {
    ...keyHdr(env.SUPABASE_SERVICE_ROLE_KEY),
    'Content-Type': 'application/json', ...(init.headers as object) } });

// Paginasi daftar admin. Tanpa ?page → semua (maks. 200; dipakai dropdown relasi & dasbor).
// Dengan ?page=N → PER baris untuk halaman itu + total: { rows, total, page, per }.
const PER = 20;
type Rows = { ok: boolean; rows: any[]; total: number | null; page: number };
async function fetchRows(env: Env, url: URL, base: string): Promise<Rows> {
  const n = Math.floor(Number(url.searchParams.get('page')));
  const page = n >= 1 ? Math.min(n, 100000) : 0;
  const r = await sb(env, page ? `${base}&limit=${PER}&offset=${(page - 1) * PER}` : `${base}&limit=200`, page ? { headers: { Prefer: 'count=exact' } } : {});
  const d = r.ok ? await r.json() : [];
  const m = /\/(\d+)$/.exec(r.headers.get('Content-Range') || '');
  return { ok: r.ok || r.status === 416, rows: Array.isArray(d) ? d : [], total: m ? Number(m[1]) : null, page };
}
const rowsRes = (x: Rows, shape: (r: any[]) => any[] = r => r) =>
  x.page ? json({ rows: shape(x.rows), total: x.total ?? x.rows.length, page: x.page, per: PER }) : json(shape(x.rows));

// Peran & hak akses. Tingkat: r = baca, w = tulis (buat/ubah), d = hapus.
// Peran yang tidak dikenal tidak punya hak apa pun (fail closed).
type Level = 'r' | 'w' | 'd';
const PERM: Record<string, Record<string, string>> = {
  admin:  { content: 'rwd', crm: 'rwd', finance: 'rwd', logs: 'r' },
  editor: { content: 'rw',  crm: '',    finance: '',    logs: '' },
  viewer: { content: 'r',   crm: 'r',   finance: 'r',   logs: '' },
};
const GROUP: Record<string, string> = {
  services: 'content', projects: 'content', project_categories: 'content', technologies: 'content', articles: 'content',
  testimonials: 'content', clients: 'content', media: 'content', settings: 'content',
  leads: 'crm', organizations: 'crm', contacts: 'crm', deals: 'crm', interactions: 'crm', tasks: 'crm', projects_delivery: 'crm',
  proposals: 'finance', invoices: 'finance', activity_logs: 'logs',
};
const can = (role: string, group: string, lv: Level) => (PERM[role]?.[group] || '').includes(lv);
const LEVEL: Record<string, Level> = { GET: 'r', POST: 'w', PUT: 'w', PATCH: 'w', DELETE: 'd' };
const VERB: Record<string, string> = { GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

type Factor = { id: string; status: string; factor_type: string; friendly_name?: string; created_at?: string };
type Me = { id: string; role: string; email: string; name: string; lastSignIn: string | null; token: string; aal: string; mfa: boolean; factors: Factor[] };
// Verifikasi token ke Supabase Auth, lalu ambil peran dari admin_profiles
async function auth(req: Request, env: Env): Promise<Me | null> {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!t) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${t}` } });
  if (!r.ok) return null;
  const u = (await r.json()) as { id?: string; email?: string; last_sign_in_at?: string; factors?: Factor[] };
  if (!u.id || !UUID.test(u.id)) return null;
  // MFA: bila akun punya faktor TOTP terverifikasi, hanya token aal2 (sudah memasukkan kode) yang diterima. Token aal1 ditolak.
  const factors = (u.factors || []).filter(f => f && typeof f.id === 'string');
  const mfa = factors.some(f => f.status === 'verified');
  const aal = jwtMeta(t).aal || 'aal1';
  if (mfa && aal !== 'aal2') return null;
  const p = (await sb(env, `admin_profiles?user_id=eq.${u.id}&select=role,display_name`).then(x => x.json())) as { role: string; display_name: string | null }[];
  return Array.isArray(p) && p[0]
    ? { id: u.id, role: String(p[0].role || ''), email: u.email || '', name: p[0].display_name || '', lastSignIn: u.last_sign_in_at || null, token: t, aal, mfa, factors }
    : null;
}
// Klaim JWT yang sudah diverifikasi Supabase; hanya untuk ditampilkan (kapan sesi terbit/habis).
function jwtMeta(t: string): { iat?: number; exp?: number; session_id?: string; aal?: string } {
  try { const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return { iat: p.iat, exp: p.exp, session_id: p.session_id, aal: typeof p.aal === 'string' ? p.aal : undefined }; } catch { return {}; }
}
const reqIp = (req: Request) => req.headers.get('CF-Connecting-IP') || 'unknown';
// Catat aktivitas beserta hasil, IP, dan user agent. Kegagalan menulis log tidak boleh menggagalkan permintaan.
// result: success | failure (gagal teknis / kredensial salah) | denied (ditolak karena hak akses)
const log = (env: Env, req: Request, actor: string | null, action: string, entity: string, id?: string, result: 'success' | 'failure' | 'denied' = 'success', detail?: string) =>
  sb(env, 'activity_logs', { method: 'POST', body: JSON.stringify({ actor_id: actor, action, entity, entity_id: id ?? null, result,
    ip: reqIp(req).slice(0, 64), user_agent: (req.headers.get('User-Agent') || '').slice(0, 300) || null, detail: detail ? detail.slice(0, 300) : null }) }).catch(e => console.error('log', e));

// Login admin lewat Worker supaya percobaan berhasil/gagal tercatat lengkap dengan IP & perangkat.
async function adminLogin(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || new URL(req.url).origin)) return json({ error: 'forbidden' }, 403);
  if (await overLimit(env.RATE_LIMITER, reqIp(req), 'login', 8)) return json({ error: 'rate_limited' }, 429);
  const raw = await req.text();
  if (raw.length > 4000) return json({ error: 'too_large' }, 413);
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  const email = clean(b.email, 150).toLowerCase(), password = typeof b.password === 'string' ? b.password.slice(0, 200) : '', captcha = clean(b.captcha, 2048);
  if (!email || !password) return json({ error: 'invalid' }, 422);
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...(captcha ? { gotrue_meta_security: { captcha_token: captcha } } : {}) }) });
  const d = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; user?: { id?: string } };
  const uid = d.user?.id && UUID.test(d.user.id) ? d.user.id : null;
  if (!r.ok || !d.access_token || !uid) {
    await log(env, req, null, 'login', 'auth', undefined, 'failure', email);
    return r.status === 429 ? json({ error: 'rate_limited' }, 429) : json({ error: 'invalid' }, 401);
  }
  const pr = await sb(env, `admin_profiles?user_id=eq.${uid}&select=role`);
  const p = (pr.ok ? await pr.json().catch(() => null) : null) as { role: string }[] | null;
  // Pencarian profil gagal (mis. SUPABASE_SERVICE_ROLE_KEY salah) = masalah konfigurasi server, bukan kredensial salah.
  if (!Array.isArray(p)) { console.error('login: admin_profiles gagal', pr.status); return json({ error: 'auth' }, 502); }
  if (!p[0] || !PERM[p[0].role]) {
    await log(env, req, uid, 'login', 'auth', undefined, 'denied', 'bukan admin / peran tidak dikenal');
    return json({ error: 'invalid' }, 401); // pesan sama dengan kredensial salah agar tidak membocorkan akun
  }
  // Akun dengan MFA: token dari kata sandi baru aal1 dan ditolak oleh API admin. Browser harus menyelesaikan kode TOTP di /api/auth/mfa.
  const fs = await verifiedFactors(env, d.access_token);
  if (fs === null) return json({ error: 'auth' }, 502);
  if (fs.length) return json({ mfa_required: true, factor_id: fs[0], mfa_token: d.access_token });
  await log(env, req, uid, 'login', 'auth', undefined, 'success', `role=${p[0].role}`);
  return json({ access_token: d.access_token, expires_in: d.expires_in ?? 3600 });
}

const authApi = (env: Env, path: string, token: string, init: RequestInit = {}) =>
  fetch(`${env.SUPABASE_URL}/auth/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
// ID faktor TOTP terverifikasi milik pemilik token. null = tidak bisa dipastikan (gagal tertutup).
async function verifiedFactors(env: Env, token: string): Promise<string[] | null> {
  const r = await authApi(env, 'user', token).catch(() => null);
  if (!r || !r.ok) return null;
  const u = (await r.json().catch(() => ({}))) as { factors?: Factor[] };
  return (u.factors || []).filter(f => f.status === 'verified' && f.factor_type === 'totp' && UUID.test(String(f.id))).map(f => f.id);
}
// Tantang + verifikasi kode TOTP di Supabase. Berhasil → sesi baru level aal2.
async function mfaVerify(env: Env, token: string, factor: string, code: string): Promise<{ access_token: string; expires_in: number; uid: string } | null> {
  const c = await authApi(env, `factors/${factor}/challenge`, token, { method: 'POST', body: '{}' }).catch(() => null);
  const ch = c && c.ok ? ((await c.json().catch(() => ({}))) as { id?: string }) : {};
  if (!ch.id) return null;
  const v = await authApi(env, `factors/${factor}/verify`, token, { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, code }) }).catch(() => null);
  if (!v || !v.ok) return null;
  const d = (await v.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; user?: { id?: string } };
  return d.access_token && d.user?.id && UUID.test(d.user.id) ? { access_token: d.access_token, expires_in: d.expires_in ?? 3600, uid: d.user.id } : null;
}
// Langkah 2 login: kode TOTP. Menukar token aal1 dengan token aal2.
async function adminMfa(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || new URL(req.url).origin)) return json({ error: 'forbidden' }, 403);
  if (await overLimit(env.RATE_LIMITER, reqIp(req), 'mfa', 8)) return json({ error: 'rate_limited' }, 429);
  const raw = await req.text();
  if (raw.length > 6000) return json({ error: 'too_large' }, 413);
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  const token = clean(b.token, 4096), factor = clean(b.factor_id, 64), code = clean(b.code, 12).replace(/\s/g, '');
  if (!token || !UUID.test(factor) || !/^\d{6}$/.test(code)) return json({ error: 'invalid' }, 422);
  const res = await mfaVerify(env, token, factor, code);
  if (!res) { await log(env, req, null, 'mfa', 'auth', undefined, 'failure', 'kode MFA salah / kedaluwarsa'); return json({ error: 'invalid' }, 401); }
  const p = (await sb(env, `admin_profiles?user_id=eq.${res.uid}&select=role`).then(x => x.json())) as { role: string }[];
  if (!Array.isArray(p) || !p[0] || !PERM[p[0].role]) { await log(env, req, res.uid, 'mfa', 'auth', undefined, 'denied', 'bukan admin / peran tidak dikenal'); return json({ error: 'invalid' }, 401); }
  await log(env, req, res.uid, 'login', 'auth', undefined, 'success', `role=${p[0].role} mfa`);
  return json({ access_token: res.access_token, expires_in: res.expires_in });
}

function pick(cfg: Cfg, body: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const c of cfg.cols) if (c in body) {
    let v = body[c];
    if (c.endsWith('_id') && typeof v === 'string' && v && !UUID.test(v)) continue;
    if (c === 'value' || c === 'paid_amount') v = Math.max(0, Math.min(1e13, Number(v) || 0));
    if (typeof v === 'string') v = v.slice(0, c === 'body' || c === 'description' ? 20000 : 2000);
    o[c] = v === '' ? null : v;
  }
  return o;
}

// Rincian penawaran/faktur: dibersihkan lalu diganti utuh dalam satu transaksi lewat RPC replace_document_items.
const cleanItems = (v: unknown) => (Array.isArray(v) ? v.slice(0, 50) : []).map((x: any) => ({ desc: clean(x?.desc, 200),
  qty: Math.round(Math.max(0, Math.min(1e6, Number(x?.qty) || 0)) * 100) / 100, price: Math.round(Math.max(0, Math.min(1e12, Number(x?.price) || 0))) })).filter(x => x.desc);
async function syncItems(env: Env, kind: 'proposal' | 'invoice', docId: string, items: unknown): Promise<boolean> {
  const r = await sb(env, 'rpc/replace_document_items', { method: 'POST', body: JSON.stringify({ p_kind: kind, p_id: docId, p_items: cleanItems(items) }) });
  return r.ok;
}
// Bentuk keluaran tetap kompatibel dengan admin & cetak: items = [{desc, qty, price}].
const DOC_EMBED: Record<string, [string, string]> = { proposals: ['proposal_items', 'proposal'], invoices: ['invoice_items', 'invoice'] };
function shapeDoc(table: string, d: any) {
  const key = DOC_EMBED[table][0], { [key]: rows, items: legacy, ...rest } = d;
  return { ...rest, items: ((rows || []) as any[]).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(x => ({ desc: x.description, qty: Number(x.qty), price: Number(x.unit_price) })) };
}
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const MEDIA_KEY = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;
// Sinkronkan relasi proyek (teknologi & galeri). Hanya yang dikirim di body yang diubah.
async function syncProject(env: Env, projectId: string, body: Record<string, unknown>): Promise<string | null> {
  if (Array.isArray(body.technology_ids)) {
    const ids = [...new Set((body.technology_ids as unknown[]).filter((x): x is string => typeof x === 'string' && UUID.test(x)))].slice(0, 30);
    let r = await sb(env, `project_technologies?project_id=eq.${projectId}`, { method: 'DELETE' });
    if (ids.length && r.ok) r = await sb(env, 'project_technologies', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(ids.map((technology_id, i) => ({ project_id: projectId, technology_id, sort_order: i }))) });
    if (!r.ok) return 'technologies';
  }
  if (Array.isArray(body.gallery)) {
    const rows = (body.gallery as any[]).filter(g => MEDIA_KEY.test(String(g?.object_key ?? ''))).slice(0, 20)
      .map((g, i) => ({ project_id: projectId, object_key: g.object_key, alt_text: clean(g.alt_text, 200) || null, sort_order: i }));
    let r = await sb(env, `project_media?project_id=eq.${projectId}`, { method: 'DELETE' });
    if (rows.length && r.ok) r = await sb(env, 'project_media', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
    if (!r.ok) return 'gallery';
  }
  return null;
}

// Halaman Keamanan: profil & sesi sendiri (semua peran); daftar admin dan log lengkap (hanya yang boleh membaca log).
async function security(req: Request, env: Env, me: Me, what?: string, sub?: string): Promise<Response> {
  const rows = async (path: string) => { const r = await sb(env, path); const d = r.ok ? await r.json() : []; return Array.isArray(d) ? (d as any[]) : []; };
  if (what === 'me' && req.method === 'GET') {
    const j = jwtMeta(me.token);
    const logins = await rows(`activity_logs?actor_id=eq.${me.id}&action=eq.login&result=eq.success&select=created_at,ip,user_agent&order=created_at.desc&limit=5`);
    return json({ id: me.id, email: me.email, name: me.name, role: me.role, perm: PERM[me.role], last_sign_in_at: me.lastSignIn,
      mfa: { enabled: me.mfa, required: env.REQUIRE_MFA === '1', aal: me.aal },
      session: { issued_at: j.iat ? new Date(j.iat * 1000).toISOString() : null, expires_at: j.exp ? new Date(j.exp * 1000).toISOString() : null,
        ip: reqIp(req), user_agent: (req.headers.get('User-Agent') || '').slice(0, 300) }, recent_logins: logins });
  }
  if (what === 'mfa') {
    const totp = me.factors.filter(f => f.factor_type === 'totp');
    if (req.method === 'GET' && !sub) return json({ enabled: me.mfa, required: env.REQUIRE_MFA === '1', aal: me.aal,
      factors: totp.map(f => ({ id: f.id, status: f.status, name: f.friendly_name || '', created_at: f.created_at || null })) });
    if (req.method === 'POST' && sub === 'enroll') {
      if (me.mfa) return json({ error: 'already', detail: 'MFA sudah aktif. Nonaktifkan dulu bila ingin mendaftarkan ulang.' }, 409);
      for (const f of totp.filter(x => x.status !== 'verified')) await authApi(env, `factors/${f.id}`, me.token, { method: 'DELETE' }).catch(() => null); // sisa pendaftaran yang tidak selesai
      const r = await authApi(env, 'factors', me.token, { method: 'POST', body: JSON.stringify({ factor_type: 'totp', issuer: 'RUtusdev', friendly_name: `RUtusdev ${Date.now().toString(36)}` }) });
      const d = (await r.json().catch(() => ({}))) as { id?: string; totp?: { qr_code?: string; secret?: string } };
      if (!r.ok || !d.id) { await log(env, req, me.id, 'mfa_enroll', 'auth', undefined, 'failure', `auth ${r.status}`); return json({ error: 'auth', detail: 'MFA belum bisa diaktifkan. Pastikan MFA TOTP aktif di Supabase → Authentication → Sign In / Providers.' }, 502); }
      await log(env, req, me.id, 'mfa_enroll', 'auth');
      return json({ factor_id: d.id, qr: d.totp?.qr_code || '', secret: d.totp?.secret || '' });
    }
    if (req.method === 'POST' && sub === 'verify') {
      if (await overLimit(env.RATE_LIMITER, reqIp(req), 'mfa', 8)) return json({ error: 'rate_limited' }, 429);
      let b: Record<string, unknown>;
      try { b = JSON.parse(await req.text()); } catch { return json({ error: 'bad_json' }, 400); }
      const factor = clean(b.factor_id, 64), code = clean(b.code, 12).replace(/\s/g, '');
      if (!UUID.test(factor) || !totp.some(f => f.id === factor) || !/^\d{6}$/.test(code)) return json({ error: 'invalid' }, 422);
      const res = await mfaVerify(env, me.token, factor, code);
      if (!res) { await log(env, req, me.id, 'mfa', 'auth', undefined, 'failure', 'kode MFA salah saat pengaktifan'); return json({ error: 'invalid' }, 401); }
      await log(env, req, me.id, 'mfa_enable', 'auth');
      return json({ access_token: res.access_token, expires_in: res.expires_in });
    }
    if (req.method === 'DELETE' && sub && UUID.test(sub)) {
      if (env.REQUIRE_MFA === '1') return json({ error: 'forbidden', detail: 'MFA diwajibkan (REQUIRE_MFA=1). Ubah dulu pengaturan itu bila memang ingin menonaktifkan.' }, 403);
      if (!totp.some(f => f.id === sub)) return json({ error: 'not_found' }, 404);
      const r = await authApi(env, `factors/${sub}`, me.token, { method: 'DELETE' });
      await log(env, req, me.id, 'mfa_disable', 'auth', undefined, r.ok ? 'success' : 'failure', r.ok ? undefined : `auth ${r.status}`);
      return r.ok ? json({ ok: true }) : json({ error: 'auth' }, 502);
    }
    return json({ error: 'method' }, 405);
  }
  if (what === 'logout-all' && req.method === 'POST') {
    // Cabut semua refresh token akun ini di Supabase (semua perangkat, termasuk yang sedang dipakai).
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/logout?scope=global`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${me.token}` } });
    await log(env, req, me.id, 'logout_all', 'auth', undefined, r.ok ? 'success' : 'failure', r.ok ? undefined : `auth ${r.status}`);
    return r.ok ? json({ ok: true }) : json({ error: 'auth' }, 502);
  }
  if (what === 'admins' || what === 'logs') {
    if (!can(me.role, 'logs', 'r')) {
      await log(env, req, me.id, 'read', `security/${what}`, undefined, 'denied', `role=${me.role}`);
      return json({ error: 'forbidden', detail: 'Peran Anda tidak boleh melihat data ini.' }, 403);
    }
    if (req.method !== 'GET') return json({ error: 'method' }, 405);
    if (what === 'admins') {
      const [profiles, users] = await Promise.all([rows('admin_profiles?select=user_id,display_name,role,created_at&order=created_at.asc&limit=100'),
        fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: keyHdr(env.SUPABASE_SERVICE_ROLE_KEY) })
          .then(r => (r.ok ? r.json() : { users: [] })).catch(() => ({ users: [] })) as Promise<{ users?: any[] }>]);
      const byId = new Map((users.users || []).map((u: any) => [u.id, u]));
      return json(profiles.map(p => ({ user_id: p.user_id, name: p.display_name || '', role: p.role, created_at: p.created_at,
        email: byId.get(p.user_id)?.email || '', last_sign_in_at: byId.get(p.user_id)?.last_sign_in_at || null })));
    }
    const u = new URL(req.url), res = u.searchParams.get('result') || '';
    const flt = ['success', 'failure', 'denied'].includes(res) ? `&result=eq.${res}` : '';
    if (u.searchParams.has('page')) { const x = await fetchRows(env, u, `activity_logs?select=*&order=created_at.desc${flt}`); return x.ok ? rowsRes(x) : json({ error: 'db' }, 500); }
    const limit = Math.max(1, Math.min(200, Number(u.searchParams.get('limit')) || 100));
    return json(await rows(`activity_logs?select=*&order=created_at.desc&limit=${limit}${flt}`));
  }
  return json({ error: 'not_found' }, 404);
}

// GET /api/admin/pdf/<proposal|invoice>/<uuid> → berkas PDF. Hak akses mengikuti penawaran/faktur (finance, baca).
async function pdfExport(req: Request, env: Env, me: Me, type?: string, docId?: string): Promise<Response> {
  if (req.method !== 'GET' || (type !== 'proposal' && type !== 'invoice') || !docId || !UUID.test(docId)) return json({ error: 'bad_request' }, 400);
  const table = type === 'invoice' ? 'invoices' : 'proposals';
  if (!can(me.role, 'finance', 'r')) {
    await log(env, req, me.id, 'export', table, docId, 'denied', `role=${me.role}`);
    return json({ error: 'forbidden', detail: 'Peran Anda tidak boleh mengunduh dokumen ini.' }, 403);
  }
  const rows = async (path: string) => { const r = await sb(env, path); const d = r.ok ? await r.json() : null; return Array.isArray(d) ? (d as any[]) : null; };
  const [raw] = (await rows(`${table}?id=eq.${docId}&select=*,${DOC_EMBED[table][0]}(position,description,qty,unit_price)&limit=1`)) || [];
  if (!raw) { await log(env, req, me.id, 'export', table, docId, 'failure', 'tidak ditemukan'); return json({ error: 'not_found' }, 404); }
  const d = shapeDoc(table, raw);
  const [deal] = d.deal_id ? (await rows(`deals?id=eq.${d.deal_id}&select=organization_id,contact_id&limit=1`)) || [] : [];
  const orgId = d.organization_id || deal?.organization_id, conId = deal?.contact_id;
  const [org] = orgId && UUID.test(orgId) ? (await rows(`organizations?id=eq.${orgId}&select=name&limit=1`)) || [] : [];
  const [con] = conId && UUID.test(conId) ? (await rows(`contacts?id=eq.${conId}&select=name,email&limit=1`)) || [] : [];
  const [st] = (await rows('site_settings?key=eq.contact&select=value&limit=1')) || [];
  try {
    const bytes = await buildPdf({ type, doc: d, to: { org: org?.name, contact: con?.name, email: con?.email }, site: st?.value || {} });
    await log(env, req, me.id, 'export', table, docId);
    return new Response(bytes, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="${String(d.number || type).replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"` } });
  } catch (e) {
    console.error('pdf', e);
    await log(env, req, me.id, 'export', table, docId, 'failure', 'gagal membuat PDF');
    return json({ error: 'pdf' }, 500);
  }
}

// Tabel yang memengaruhi konten publik: setelah berhasil diubah, cache /api/public/content dibuang.
const PUBLIC_TABLES = new Set(['services', 'projects', 'project_categories', 'technologies', 'articles', 'testimonials', 'clients', 'settings', 'media']);
async function purgePublic(req: Request, env: Env): Promise<void> {
  const origins = [...new Set([new URL(req.url).origin, env.ALLOWED_ORIGIN].filter((x): x is string => !!x))];
  // Cache API hanya berlaku per lokasi (datacenter): ini langsung menyegarkan lokasi yang dipakai admin.
  await Promise.all(origins.map(o => caches.default.delete(new Request(o + '/api/public/content')).catch(() => false)));
  // Opsional (CF_API_TOKEN + CF_ZONE_ID): purge URL yang sama di seluruh lokasi. Tanpa ini lokasi lain menyegarkan sendiri ≤ 60 detik.
  if (env.CF_API_TOKEN && env.CF_ZONE_ID && /^[a-f0-9]{32}$/i.test(env.CF_ZONE_ID))
    await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`, { method: 'POST',
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: origins.map(o => o + '/api/public/content') }) }).catch(e => console.error('purge', e));
}
async function admin(req: Request, env: Env, parts: string[], ctx: ExecutionContext): Promise<Response> {
  const res = await adminHandle(req, env, parts);
  if (req.method !== 'GET' && res.ok && PUBLIC_TABLES.has(parts[0] || '')) ctx.waitUntil(purgePublic(req, env));
  return res;
}
async function adminHandle(req: Request, env: Env, parts: string[]): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (req.method !== 'GET' && origin && origin !== (env.ALLOWED_ORIGIN || new URL(req.url).origin)) {
    await log(env, req, null, 'origin_check', 'admin', undefined, 'denied', origin.slice(0, 150));
    return json({ error: 'forbidden' }, 403);
  }
  if (await overLimit(env.RATE_LIMITER_ADMIN, reqIp(req), 'admin', 120)) return json({ error: 'rate_limited' }, 429);
  const me = await auth(req, env);
  if (!me) {
    // Hanya token yang dikirim tetapi tidak valid yang dicatat (tanpa token = kunjungan biasa, bukan serangan).
    if (req.headers.get('Authorization')) await log(env, req, null, 'access', 'admin', undefined, 'failure', 'token tidak valid');
    return json({ error: 'unauthorized' }, 401);
  }
  if (!PERM[me.role]) {
    await log(env, req, me.id, 'access', 'admin', undefined, 'denied', `peran tidak dikenal: ${me.role}`);
    return json({ error: 'forbidden', detail: 'Peran akun ini tidak dikenal.' }, 403);
  }
  const [table, id, action] = parts;
  // MFA wajib (REQUIRE_MFA=1): akun yang belum mengaktifkan MFA hanya boleh membuka tab Keamanan untuk mendaftarkannya.
  if (env.REQUIRE_MFA === '1' && !me.mfa && table !== 'security') return json({ error: 'forbidden', detail: 'Aktifkan MFA dulu di tab Keamanan & Log.' }, 403);
  if (table === 'security') return security(req, env, me, id, action);
  if (table === 'pdf') return pdfExport(req, env, me, id, action);
  const grp = GROUP[table];
  if (grp && !can(me.role, grp, LEVEL[req.method] || 'w')) {
    await log(env, req, me.id, VERB[req.method] || req.method.toLowerCase(), table, id && UUID.test(id) ? id : undefined, 'denied', `role=${me.role}`);
    return json({ error: 'forbidden', detail: 'Peran Anda tidak punya akses untuk aksi ini.' }, 403);
  }
  if (table === 'settings') {
    if (req.method === 'GET') return json(await sb(env, 'site_settings?select=key,value').then(r => r.json()));
    const keys = SETTINGS[id || ''];
    if (req.method !== 'PUT' || !keys) return json({ error: 'method' }, 405);
    let b: Record<string, unknown>;
    try { b = JSON.parse(await req.text()); } catch { return json({ error: 'bad_json' }, 400); }
    const v: Record<string, string> = {};
    for (const k of keys) v[k] = clean(b[k], 300);
    if (id === 'contact') {
      v.whatsapp = v.whatsapp.replace(/\D/g, '').slice(0, 16);
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return json({ error: 'email_invalid' }, 400);
    }
    const sr = await sb(env, 'site_settings?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: id, value: v, updated_at: new Date().toISOString() }) });
    if (!sr.ok) { await log(env, req, me.id, 'update', 'settings', id, 'failure', `db ${sr.status}`); return json({ error: 'db' }, 400); }
    await log(env, req, me.id, 'update', 'settings', id);
    return json({ ok: true });
  }
  if (id && !UUID.test(id)) return json({ error: 'bad_id' }, 400);

  if (table === 'media') {
    if (req.method === 'GET') { const x = await fetchRows(env, new URL(req.url), 'media?select=*&order=created_at.desc'); return x.ok ? rowsRes(x) : json({ error: 'db' }, 500); }
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
      await log(env, req, me.id, 'upload', 'media', key);
      return json(await r.json(), 201);
    }
    if (req.method === 'DELETE' && id) {
      const row = (await sb(env, `media?id=eq.${id}&select=object_key`).then(r => r.json())) as { object_key: string }[];
      if (row[0]) await env.MEDIA.delete(row[0].object_key);
      await sb(env, `media?id=eq.${id}`, { method: 'DELETE' });
      await log(env, req, me.id, 'delete', 'media', id);
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  }

  if (table === 'leads' && id && action === 'convert' && req.method === 'POST') {
    const [l] = (await sb(env, `leads?id=eq.${id}&select=*`).then(r => r.json())) as any[];
    if (!l) return json({ error: 'not_found' }, 404);
    const c = (await sb(env, 'contacts', { method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name: l.name, email: l.email, whatsapp: l.whatsapp }) }).then(r => r.json())) as any[];
    const d = await sb(env, 'deals', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ title: `Proyek ${l.name}`, contact_id: c[0]?.id ?? null, stage: 'baru', source: 'website', notes: l.brief }) });
    if (!d.ok) return json({ error: 'db' }, 400);
    await sb(env, `leads?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'contacted' }) });
    await log(env, req, me.id, 'convert', 'leads', id);
    return json({ ok: true }, 201);
  }
  const cfg = TABLES[table];
  if (!cfg) return json({ error: 'not_found' }, 404);
  if (req.method === 'GET' && table === 'projects') {
    const x = await fetchRows(env, new URL(req.url), `projects?select=*,project_technologies(technology_id,sort_order),project_media(object_key,alt_text,sort_order)&order=${cfg.order}`);
    if (!x.ok) return json({ error: 'db', detail: 'Jalankan ulang bagian "Portofolio ternormalisasi" di supabase/schema.sql' }, 500);
    return rowsRes(x, rs => rs.map(({ project_technologies, project_media, ...p }) => ({ ...p,
      technology_ids: [...project_technologies].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((x: any) => x.technology_id),
      gallery: [...project_media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((g: any) => ({ object_key: g.object_key, alt_text: g.alt_text || '' })) })));
  }
  if (req.method === 'GET' && DOC_EMBED[table]) {
    const x = await fetchRows(env, new URL(req.url), `${table}?select=*,${DOC_EMBED[table][0]}(position,description,qty,unit_price)&order=${cfg.order}`);
    if (!x.ok) return json({ error: 'db', detail: 'Jalankan ulang bagian Fase 3 di supabase/schema.sql' }, 500);
    return rowsRes(x, rs => rs.map(d => shapeDoc(table, d)));
  }
  if (req.method === 'GET' && table === 'tasks') {
    const x = await fetchRows(env, new URL(req.url), `tasks?select=*,ms:projects_delivery(title)&order=${cfg.order}`);
    if (!x.ok) return json({ error: 'db', detail: 'Jalankan ulang bagian Fase 3 di supabase/schema.sql' }, 500);
    // milestone (teks) tetap ada untuk tampilan: nama tonggak, atau teks lama bila belum dimigrasi
    return rowsRes(x, rs => rs.map(({ ms, ...t }) => ({ ...t, milestone: ms?.title ?? t.milestone ?? null })));
  }
  if (req.method === 'GET') { const x = await fetchRows(env, new URL(req.url), `${table}?select=*&order=${cfg.order}`); return x.ok ? rowsRes(x) : json({ error: 'db' }, 500); }
  if (req.method === 'DELETE') {
    if (cfg.del === false || !id) return json({ error: 'method' }, 405);
    const dr = await sb(env, `${table}?id=eq.${id}`, { method: 'DELETE' });
    if (!dr.ok) { await log(env, req, me.id, 'delete', table, id, 'failure', `db ${dr.status}`); return json({ error: 'db' }, 400); }
    await log(env, req, me.id, 'delete', table, id);
    return json({ ok: true });
  }
  if (req.method === 'POST' || req.method === 'PATCH') {
    if (!cfg.cols.length) return json({ error: 'method' }, 405);
    if (req.method === 'POST' && cfg.create === false) return json({ error: 'method' }, 405);
    if (req.method === 'PATCH' && !id) return json({ error: 'bad_id' }, 400);
    const raw = await req.text();
    if (raw.length > 60000) return json({ error: 'too_large' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
    const data = pick(cfg, body);
    if (req.method === 'POST' && (table === 'proposals' || table === 'invoices') && !data.number) {
      const d = new Date(); data.number = `${table === 'invoices' ? 'INV' : 'PNW'}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    }
    if (req.method === 'POST' && (table === 'project_categories' || table === 'technologies') && !data.slug && typeof data.name === 'string')
      data.slug = slugify(data.name) || `${table === 'technologies' ? 'tek' : 'kategori'}-${Date.now().toString(36)}`;
    if (typeof data.slug === 'string' && !/^[a-z0-9-]{1,100}$/.test(data.slug)) return json({ error: 'slug', detail: 'Slug: huruf kecil, angka, tanda minus' }, 400);
    const r = await sb(env, req.method === 'POST' ? table : `${table}?id=eq.${id}`, {
      method: req.method, headers: { Prefer: 'return=representation' }, body: JSON.stringify(data) });
    if (!r.ok) {
      const why = (await r.text()).slice(0, 200);
      await log(env, req, me.id, req.method === 'POST' ? 'create' : 'update', table, id, 'failure', `db ${r.status}`);
      return json({ error: 'db', detail: why }, 400);
    }
    const saved = (await r.json()) as any[];
    if (table === 'projects') {
      const pid = req.method === 'POST' ? saved[0]?.id : id;
      const bad = pid && UUID.test(pid) ? await syncProject(env, pid, body) : null;
      if (bad) return json({ error: 'db', detail: `Proyek tersimpan, tetapi ${bad} gagal disimpan. Coba simpan ulang.` }, 400);
    }
    if (DOC_EMBED[table] && Array.isArray(body.items)) {
      const did = req.method === 'POST' ? saved[0]?.id : id;
      if (!(did && UUID.test(did) && await syncItems(env, DOC_EMBED[table][1] as 'proposal' | 'invoice', did, body.items))) {
        await log(env, req, me.id, req.method === 'POST' ? 'create' : 'update', table, id, 'failure', 'rincian gagal disimpan');
        return json({ error: 'db', detail: 'Dokumen tersimpan, tetapi rincian gagal disimpan. Simpan ulang.' }, 400);
      }
    }
    await log(env, req, me.id, req.method === 'POST' ? 'create' : 'update', table, id);
    return json(saved, req.method === 'POST' ? 201 : 200);
  }
  return json({ error: 'method' }, 405);
}

// Diagnostik sementara: status koneksi ke Supabase tanpa menampilkan isi kunci. Aktif hanya bila DIAG = "1".
async function diag(env: Env): Promise<Response> {
  const fmt = (k: string) => !k ? 'kosong' : k.startsWith('sb_secret_') ? 'sb_secret (benar untuk SERVICE_ROLE)' : k.startsWith('sb_publishable_') ? 'sb_publishable (SALAH di SERVICE_ROLE: ini kunci publik)' : k.startsWith('eyJ') ? 'jwt-lama' : 'format tidak dikenal';
  const role = (k: string) => { try { return String(JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role || ''); } catch { return ''; } };
  const probe = async (path: string) => {
    try { const r = await sb(env, path); let m = ''; try { m = String(((await r.json()) as { message?: string })?.message || '').slice(0, 120); } catch { /* bukan JSON */ } return { status: r.status, message: m }; }
    catch { return { status: 0, message: 'fetch gagal (kunci/URL memuat karakter tidak valid, mis. spasi atau baris baru)' }; }
  };
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  let host = 'URL tidak valid'; try { host = new URL(env.SUPABASE_URL).host; } catch { /* biarkan */ }
  return json({
    supabase_host: host,
    service_key: { format: fmt(key), length: key.length, tanpa_spasi_tepi: key === key.trim(), jwt_role: role(key) || undefined },
    anon_key_format: fmt(env.SUPABASE_ANON_KEY || ''),
    admin_profiles: await probe('admin_profiles?select=user_id&limit=1'),
    site_settings: await probe('site_settings?select=key&limit=1'),
  });
}

async function publicContent(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default, key = new Request(new URL(req.url).origin + '/api/public/content');
  const hit = await cache.match(key);
  if (hit) return hit;
  // Respons error Supabase (mis. "Invalid API key") bukan array: jangan diteruskan ke halaman dan jangan di-cache.
  let degraded = false;
  const rows = async (r: Response, t: string): Promise<any[]> => {
    const d = r.ok ? await r.json().catch(() => null) : null;
    if (!Array.isArray(d)) { degraded = true; console.error('content', t, r.status); return []; }
    return d;
  };
  const q = (t: string, extra = '', flt = 'is_published=eq.true') => sb(env, `${t}?${flt}${extra}`).then(r => rows(r, t));
  const [services, projects, testimonials, clients, articles, st] = await Promise.all([
    q('services', '&select=title,slug,summary,icon&order=sort_order.asc'),
    q('projects', `&select=${PROJECT_LIST_COLS},${PROJECT_EMBED}&order=published_at.desc.nullslast,created_at.desc&limit=12`, 'status=eq.published')
      .then(p => p.map(shapeProject)),
    q('testimonials', '&select=client_name,organization,quote&order=created_at.desc&limit=6'),
    q('clients', '&select=name,logo_key,website_url'),
    sb(env, 'articles?status=eq.published&select=title,slug,excerpt,cover_key,created_at&order=created_at.desc&limit=6').then(async r => { const d = r.ok ? await r.json().catch(() => []) : []; return Array.isArray(d) ? d : []; }),
    sb(env, 'site_settings?select=key,value').then(r => rows(r, 'site_settings')) as Promise<{ key: string; value: unknown }[]>,
  ]);
  const settings = Object.fromEntries((Array.isArray(st) ? st : []).map(x => [x.key, x.value]));
  if (degraded) return json({ services, projects, testimonials, clients, articles, settings }, 200); // no-store: coba lagi di permintaan berikutnya
  const res = json({ services, projects, testimonials, clients, articles, settings }, 200, { 'Cache-Control': 'public, max-age=10, s-maxage=60' });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

async function handleLead(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || new URL(req.url).origin)) return json({ error: 'forbidden' }, 403);
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  if (await overLimit(env.RATE_LIMITER, ip, 'lead', 5)) return json({ error: 'rate_limited' }, 429);
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
  ctx.waitUntil(notifyLead(env, { name, email, whatsapp: whatsapp || null, service, brief: brief || null }));
  return json({ ok: true }, 201);
}

// Ukuran yang boleh diminta lewat ?w=… (daftar tetap agar tidak bisa dipakai membanjiri transformasi/cache).
const IMG_WIDTHS = [320, 480, 640, 960, 1280, 1600, 1920];
async function media(req: Request, env: Env, ctx: ExecutionContext, key: string): Promise<Response> {
  if (!/^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(key)) return new Response('Not found', { status: 404 });
  const url = new URL(req.url), w = Number(url.searchParams.get('w')), acc = req.headers.get('Accept') || '';
  const fmt = /image\/avif/.test(acc) ? 'avif' : /image\/webp/.test(acc) ? 'webp' : '';
  if (env.IMAGES && fmt && IMG_WIDTHS.includes(w) && !key.endsWith('.gif')) { // GIF dibiarkan utuh (bisa beranimasi)
    const ck = new Request(`${url.origin}/media/${key}?w=${w}&f=${fmt}`);
    const hit = await caches.default.match(ck);
    if (hit) return hit;
    const src = await env.MEDIA.get(key);
    if (!src) return new Response('Not found', { status: 404 });
    try {
      const out = (await env.IMAGES.input(src.body).transform({ width: w, fit: 'scale-down' }).output({ format: `image/${fmt}`, quality: 82 })).response();
      const res = new Response(out.body, { headers: { 'Content-Type': `image/${fmt}`, 'Cache-Control': 'public, max-age=31536000, immutable', Vary: 'Accept', 'X-Content-Type-Options': 'nosniff' } });
      ctx.waitUntil(caches.default.put(ck, res.clone()));
      return res;
    } catch (e) { console.error('images', e); } // gagal mengubah → jatuh ke berkas asli di bawah
  }
  const o = await env.MEDIA.get(key);
  if (!o) return new Response('Not found', { status: 404 });
  return new Response(o.body, { headers: { 'Content-Type': o.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', Vary: 'Accept' } });
}

const handler = {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(req.url);
    try {
      if (pathname === '/api/health') return json({ ok: true });
      // Konfigurasi publik halaman admin. Sengaja HANYA site key Turnstile (memang publik): alamat Supabase dan anon key
      // tidak dibuka ke publik karena browser admin tidak memakainya (semua lewat Worker).
      if (pathname === '/admin/config.js') return new Response(`window.CFG = ${JSON.stringify({ TURNSTILE_SITE_KEY: env.TURNSTILE_SITE_KEY || '' })};\n`,
        { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
      if (pathname === '/api/public/content' && req.method === 'GET') return publicContent(req, env, ctx);
      if (pathname === '/api/diag' && req.method === 'GET' && env.DIAG === '1') return diag(env);
      if (pathname === '/api/leads') return req.method === 'POST' ? handleLead(req, env, ctx) : json({ error: 'method' }, 405);
      if (pathname === '/api/auth/login') return req.method === 'POST' ? adminLogin(req, env) : json({ error: 'method' }, 405);
      if (pathname === '/api/auth/mfa') return req.method === 'POST' ? adminMfa(req, env) : json({ error: 'method' }, 405);
      if (pathname.startsWith('/api/admin/')) return admin(req, env, pathname.slice(11).split('/').filter(Boolean), ctx);
      if (pathname.startsWith('/media/') && req.method === 'GET') return media(req, env, ctx, pathname.slice(7));
      if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
      const pg = await pages(req, env, pathname.replace(/(.)\/$/, '$1'));
      if (pg) return pg;
    } catch (e) { console.error(e); return json({ error: 'server' }, 500); }
    return env.ASSETS.fetch(req);
  },
};

// Semua respons (termasuk aset statis) diberi header keamanan.
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url), host = url.hostname.toLowerCase();
    // HTTP -> HTTPS: HSTS tidak melindungi kunjungan HTTP pertama, jadi alihkan permanen (308 menjaga metode & body).
    // Localhost dikecualikan agar `wrangler dev` tetap berjalan.
    const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
    if (!local && (url.protocol === 'http:' || (req.headers.get('cf-visitor') || '').includes('"scheme":"http"'))) {
      url.protocol = 'https:';
      return secure(new Response(null, { status: 308, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } }), false, url.pathname);
    }
    return secure(await handler.fetch(req, env, ctx), env.CSP_REPORT_ONLY === '1', url.pathname);
  },
};
