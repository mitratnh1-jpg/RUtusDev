const C = window.CFG, $ = s => document.querySelector(s);
let tok = sessionStorage.getItem('t') || '', cur = 'ringkasan', me = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const PUB = ['is_published','check'], SORT = ['sort_order','number'];
const STAGES = ['baru','dihubungi','discovery','proposal','negosiasi','menang','kalah'];
const LBL = { title:'Judul', slug:'Slug (huruf kecil-dan-minus)', summary:'Ringkasan', description:'Deskripsi', icon:'Ikon', sort_order:'Urutan', is_published:'Terbitkan',
  body:'Isi (mendukung Markdown)', category_id:'Kategori', technology_ids:'Teknologi', gallery:'Galeri tambahan — satu baris per gambar: uploads/… | teks alternatif', cover_key:'Gambar sampul', demo_url:'Tautan demo', featured:'Unggulan',
  excerpt:'Kutipan singkat', seo_title:'Judul SEO', seo_description:'Deskripsi SEO', status:'Status', client_name:'Nama klien', organization:'Organisasi', quote:'Isi testimoni',
  avatar_key:'Foto', name:'Nama', logo_key:'Logo', website_url:'Situs web', notes:'Catatan', website:'Situs web', industry:'Industri', position:'Jabatan', email:'Email',
  whatsapp:'WhatsApp', projects:'Proyek selesai (contoh: 12+)', timeline:'Minggu hingga situs live (contoh: 4–6)', organization_id:'Organisasi', contact_id:'Kontak', deal_id:'Peluang', value:'Nilai (Rp)', stage:'Tahap', source:'Sumber', expected_close:'Target closing',
  kind:'Jenis', note:'Isi catatan', eyebrow:'Label atas', headline:'Judul utama', headline_dim:'Lanjutan judul', subheadline:'Sub-judul', cta_primary:'Tombol utama', cta_secondary:'Tombol kedua',
  baru:'Baru', dihubungi:'Dihubungi', discovery:'Penjajakan', proposal:'Proposal', negosiasi:'Negosiasi', menang:'Menang', kalah:'Kalah',
  new:'Baru', contacted:'Dihubungi', won:'Menang', lost:'Kalah', draft:'Draf', published:'Terbit', catatan:'Catatan', telepon:'Telepon', rapat:'Rapat',
  number:'Nomor (kosongkan untuk otomatis)', valid_until:'Berlaku hingga', scope:'Ruang lingkup pekerjaan', terms:'Syarat & ketentuan',
  items:'Rincian — satu baris per item: Deskripsi | Jumlah | Harga satuan (Rp)', issue_date:'Tanggal terbit', due_date:'Jatuh tempo / tenggat', paid_amount:'Sudah dibayar (Rp)',
  milestone:'Tonggak', milestone_id:'Tonggak pengerjaan', rencana:'Rencana', tertunda:'Tertunda', priority:'Prioritas', terkirim:'Terkirim', disetujui:'Disetujui', ditolak:'Ditolak', draf:'Draf', dibayar_sebagian:'Dibayar sebagian', lunas:'Lunas', batal:'Batal',
  todo:'Belum mulai', berjalan:'Berjalan', selesai:'Selesai', rendah:'Rendah', sedang:'Sedang', tinggi:'Tinggi',
  archived:'Arsip', admin:'Admin', editor:'Editor', viewer:'Pembaca', success:'Berhasil', failure:'Gagal', denied:'Ditolak' };
// Kelompok hak akses tiap tab (harus selaras dengan GROUP di worker/index.ts; server tetap yang memutuskan).
const GRP = { projects_delivery:'crm', leads:'crm', pipeline:'crm', deals:'crm', organizations:'crm', contacts:'crm', interactions:'crm', tasks:'crm', proposals:'finance', invoices:'finance',
  services:'content', projects:'content', project_categories:'content', technologies:'content', articles:'content', testimonials:'content', clients:'content', media:'content', settings:'content' };
const can = (g, l) => ((me && me.perm && me.perm[g]) || '').includes(l);
const allowed = k => k === 'keamanan' ? true : k === 'ringkasan' ? can('crm', 'r') && can('finance', 'r') : can(GRP[k], 'r');
const L = k => LBL[k] || k;
const T = {
  ringkasan: { label:'Ringkasan', dash:true },
  leads: { label:'Prospek', title:'name', sub:['email','whatsapp','service_interest','brief'], ro:true,
    f:[['status','select',['new','contacted','discovery','proposal','won','lost']],['notes','textarea']] },
  pipeline: { label:'Alur penjualan', pipeline:true },
  deals: { label:'Peluang', title:'title', sub:['stage','value'], f:[['title'],['organization_id','ref','organizations'],['contact_id','ref','contacts'],['value','number'],['stage','select',STAGES],['source'],['expected_close','date'],['notes','textarea']] },
  organizations: { label:'Organisasi', title:'name', sub:['industry','website'], f:[['name'],['website'],['industry'],['notes','textarea']] },
  contacts: { label:'Kontak', title:'name', sub:['position','email','whatsapp'], f:[['name'],['position'],['email'],['whatsapp'],['organization_id','ref','organizations'],['notes','textarea']] },
  interactions: { label:'Riwayat', title:'note', sub:['kind','created_at'], f:[['deal_id','ref','deals'],['kind','select',['catatan','telepon','whatsapp','email','rapat']],['note','textarea']] },
  proposals: { label:'Penawaran', title:'title', sub:['number','status'], print:'proposal', f:[['number'],['title'],['deal_id','ref','deals'],['status','select',['draft','terkirim','disetujui','ditolak']],['valid_until','date'],['items','items'],['scope','textarea'],['terms','textarea']] },
  invoices: { label:'Faktur', title:'title', sub:['number','status','due_date'], print:'invoice', f:[['number'],['title'],['deal_id','ref','deals'],['organization_id','ref','organizations'],['status','select',['draf','terkirim','dibayar_sebagian','lunas','batal']],['issue_date','date'],['due_date','date'],['items','items'],['paid_amount','number'],['notes','textarea']] },
  tasks: { label:'Tugas', title:'title', sub:['milestone','status','priority','due_date'], f:[['title'],['deal_id','ref','deals'],['milestone_id','ref','projects_delivery'],['status','select',['todo','berjalan','selesai']],['priority','select',['rendah','sedang','tinggi']],['due_date','date'],['notes','textarea']] },
  projects_delivery: { label:'Tonggak proyek', title:'title', sub:['status','due_date'], f:[['title'],['deal_id','ref','deals'],['status','select',['rencana','berjalan','selesai','tertunda']],['due_date','date'],['sort_order','number'],['notes','textarea']] },
  services: { label:'Layanan', title:'title', f:[['title'],['slug'],['summary'],['description','textarea'],['icon'],SORT,PUB] },
  projects: { label:'Portofolio', title:'title', f:[['title'],['slug'],['summary'],['body','textarea'],['category_id','ref','project_categories'],['technology_ids','multi','technologies'],['cover_key','image'],['gallery','gallery'],['demo_url'],['featured','check'],['status','select',['draft','published','archived']]] },
  project_categories: { label:'Kategori proyek', title:'name', sub:['slug'], f:[['name'],['slug'],SORT] },
  technologies: { label:'Teknologi', title:'name', sub:['slug'], f:[['name'],['slug']] },
  articles: { label:'Artikel', title:'title', f:[['title'],['slug'],['excerpt'],['body','textarea'],['seo_title'],['seo_description'],['cover_key','image'],['status','select',['draft','published']]] },
  testimonials: { label:'Testimoni', title:'client_name', f:[['client_name'],['organization'],['quote','textarea'],['avatar_key','image'],PUB] },
  clients: { label:'Klien', title:'name', f:[['name'],['logo_key','image'],['website_url'],PUB] },
  media: { label:'Media', media:true },
  settings: { label:'Pengaturan', settings:true },
  keamanan: { label:'Keamanan & Log', security:true },
};
async function api(path, o = {}) {
  const r = await fetch('/api/admin/' + path, { method:o.method||'GET', body:o.json?JSON.stringify(o.json):o.body,
    headers:{ Authorization:'Bearer ' + tok, ...(o.json?{'Content-Type':'application/json'}:{}) } });
  if (r.status === 401) { logout(); throw new Error('Sesi berakhir'); }
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(r.status === 403 ? (d.detail || 'Akses ditolak untuk peran Anda.') : (d.error || r.status)); return d;
}
function logout() { sessionStorage.removeItem('t'); tok = ''; $('#app').style.display = 'none'; $('#login').style.display = 'grid'; }
// Perlindungan brute-force login: Turnstile dikirim sebagai captcha_token ke Supabase Auth.
// Aktifkan juga di Supabase → Authentication → Attack Protection → CAPTCHA (provider Turnstile, secret yang sama).
const capKey = C.TURNSTILE_SITE_KEY && !/^GANTI/i.test(C.TURNSTILE_SITE_KEY) ? C.TURNSTILE_SITE_KEY : '', capBox = $('#cap');
let capId;
if (capKey) { const t = setInterval(() => { if (window.turnstile && !capId) { capId = window.turnstile.render(capBox, { sitekey: capKey, theme: 'dark' }); clearInterval(t); } }, 200); }
$('#login').onsubmit = async e => {
  e.preventDefault(); $('#lerr').textContent = '';
  const captcha = capKey ? window.turnstile?.getResponse(capId) : '';
  if (capKey && !captcha) { $('#lerr').textContent = 'Selesaikan verifikasi keamanan dulu.'; return; }
  // Login lewat Worker agar percobaan berhasil/gagal tercatat (IP & perangkat). Worker meneruskan captcha ke Supabase Auth.
  const r = await fetch('/api/auth/login', { method:'POST', headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ email:$('#em').value, password:$('#pw').value, captcha }) });
  const d = await r.json().catch(() => ({})); if (capKey) window.turnstile?.reset(capId);
  if (!r.ok) { $('#lerr').textContent = r.status === 429 ? 'Terlalu banyak percobaan. Tunggu beberapa menit.' : 'Email atau password salah.'; return; }
  tok = d.access_token; sessionStorage.setItem('t', tok); $('#pw').value = ''; start();
};
async function start() {
  try { me = await api('security/me'); } catch { logout(); return; }
  if (!allowed(cur)) cur = Object.keys(T).find(allowed) || 'keamanan';
  render();
}
function render() {
  $('#login').style.display = 'none'; $('#app').style.display = 'grid';
  $('#nav').innerHTML = Object.entries(T).filter(([k]) => allowed(k)).map(([k, v]) => `<button data-k="${k}" class="${k===cur?'on':''}">${v.label}</button>`).join('') + `<small class="dim" style="padding:8px 14px">Peran: ${esc(L(me.role))}</small><button id="out" class="g">Keluar</button>`;
  $('#nav').onclick = e => { const k = e.target.dataset.k; if (k) { cur = k; render(); } if (e.target.id === 'out') logout(); };
  show();
}
async function show() {
  const m = $('#main'), t = T[cur]; m.innerHTML = '<p>Memuat…</p>';
  try { t.dash ? await showDash(m) : t.security ? await showSecurity(m) : t.pipeline ? await showPipeline(m) : t.media ? await showMedia(m) : t.settings ? await showSettings(m) : await showList(m, t); } catch (e) { if (tok) m.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
async function upload(file, alt) {
  const r = await fetch('/api/admin/media?alt=' + encodeURIComponent(alt || ''), { method:'POST', body:file, headers:{ Authorization:'Bearer ' + tok } });
  const d = await r.json(); if (!r.ok) throw new Error(d.error === 'type' ? 'Hanya PNG/JPG/WebP/GIF' : d.error === 'size' ? 'Maks 5 MB' : d.error); return d[0] || d;
}
const SET = { hero:[['eyebrow'],['headline'],['headline_dim'],['subheadline','textarea'],['cta_primary'],['cta_secondary']], contact:[['whatsapp'],['email']], stats:[['projects'],['timeline']] };
async function showSettings(m) {
  const rows = await api('settings'), v = Object.fromEntries(rows.map(r => [r.key, r.value]));
  m.innerHTML = '<h1>Pengaturan</h1><p style="color:var(--dim)">Kosongkan kolom untuk memakai teks bawaan. WhatsApp: angka saja, contoh 628123456789 (kosong = tombol WhatsApp disembunyikan). Statistik hanya tampil bila diisi dengan data asli.</p>' + Object.entries(SET).map(([k, fs]) =>
    `<form data-k="${k}"><b>${k === 'hero' ? 'Hero' : k === 'stats' ? 'Statistik landing (kosongkan = disembunyikan)' : 'Kontak'}</b>${fs.map(([n, ty]) => `<label>${L(n)}${ty === 'textarea' ? `<textarea name="${n}" rows="3">${esc(v[k]?.[n])}</textarea>` : `<input name="${n}" value="${esc(v[k]?.[n])}">`}</label>`).join('')}${can('content', 'w') ? '<div><button>Simpan</button></div>' : ''}<p class="err"></p></form>`).join('');
  if (!can('content', 'w')) m.querySelectorAll('input,textarea').forEach(el => el.disabled = true);
  m.querySelectorAll('form').forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const o = {}; new FormData(f).forEach((x, n) => o[n] = x); const er = f.querySelector('.err');
    try { await api('settings/' + f.dataset.k, { method:'PUT', json:o }); er.style.color = '#7ee787'; er.textContent = 'Tersimpan. Tampil di situs dalam ±60 detik.'; }
    catch (x) { er.style.color = ''; er.textContent = x.message; }
  });
}
const ACT = { create:'Membuat', update:'Mengubah', delete:'Menghapus', upload:'Mengunggah', convert:'Mengonversi' };
const SVC = { website:'Website / landing page', webapp:'Aplikasi web', system:'Sistem informasi', custom:'Aplikasi custom' };
const ENT = { auth:'Autentikasi', admin:'Panel admin', settings:'Pengaturan', media:'Media', 'security/admins':'Daftar admin', 'security/logs':'Log keamanan' };
const ACT2 = { export:'Mengunduh', login:'Masuk', logout_all:'Keluar semua perangkat', access:'Akses', read:'Membaca', origin_check:'Cek asal permintaan' };
const fdt = s => s ? new Date(s).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '–';
// Ringkas user agent menjadi "Browser · OS"; teks lengkap ada di tooltip.
const uaShort = s => { s = s || ''; if (!s) return '–'; const b = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Lainnya';
  const o = /Windows/.test(s) ? 'Windows' : /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : ''; return b + (o ? ' · ' + o : ''); };
const badge = r => `<span style="padding:1px 8px;border-radius:99px;font-size:12px;background:${r === 'success' ? '#14351f' : r === 'denied' ? '#4a3a12' : '#4a1a22'};color:${r === 'success' ? '#7ee787' : r === 'denied' ? '#ffd479' : '#ff8a8a'}">${esc(L(r))}</span>`;
async function showSecurity(m, filter = '') {
  const adm = can('logs', 'r');
  const [admins, logs] = adm ? await Promise.all([api('security/admins'), api('security/logs' + (filter ? '?result=' + filter : ''))]) : [[], []];
  const who = Object.fromEntries(admins.map(a => [a.user_id, a.name || a.email || a.user_id.slice(0, 8)]));
  const s = me.session || {};
  m.innerHTML = `<h1>Keamanan & Log</h1>
  <section class="box" style="margin:16px 0"><h3>Profil &amp; sesi saya</h3>
    <div class="row"><div><b>${esc(me.name || me.email)}</b><small>${esc(me.email)} · peran ${esc(L(me.role))}</small></div></div>
    <div class="row"><div>Login terakhir (Supabase)</div><small>${fdt(me.last_sign_in_at)}</small></div>
    <div class="row"><div>Sesi ini terbit</div><small>${fdt(s.issued_at)}</small></div>
    <div class="row"><div>Sesi ini berakhir</div><small>${fdt(s.expires_at)}</small></div>
    <div class="row"><div>Dari IP / perangkat</div><small title="${esc(s.user_agent)}">${esc(s.ip)} · ${esc(uaShort(s.user_agent))}</small></div>
    <p class="dim" style="margin:12px 0 6px">Login berhasil terakhir</p>
    ${(me.recent_logins || []).map(x => `<div class="row"><div>${fdt(x.created_at)}</div><small title="${esc(x.user_agent)}">${esc(x.ip || '–')} · ${esc(uaShort(x.user_agent))}</small></div>`).join('') || '<p class="dim">Belum ada riwayat login tercatat.</p>'}
    <div style="margin-top:12px"><button class="d" id="lo-all">Keluar dari semua perangkat</button> <span class="err" id="lo-err"></span></div></section>
  ${adm ? `<section class="box" style="margin:16px 0"><h3>Admin &amp; peran</h3>${admins.map(a => `<div class="row"><div><b>${esc(a.name || a.email || a.user_id)}</b><small>${esc(a.email)} · masuk terakhir ${fdt(a.last_sign_in_at)}</small></div><div>${esc(L(a.role))}</div></div>`).join('') || '<p class="dim">Tidak ada data.</p>'}
    <p class="dim" style="margin-top:10px">Ubah peran lewat SQL Editor Supabase: <code>update admin_profiles set role = 'editor' where user_id = '…'</code> (admin, editor, viewer).</p></section>
  <section class="box" style="margin:16px 0"><h3>Log aktivitas</h3><label>Tampilkan<select id="lf"><option value="">Semua hasil</option><option value="failure" ${filter === 'failure' ? 'selected' : ''}>Gagal</option><option value="denied" ${filter === 'denied' ? 'selected' : ''}>Ditolak</option><option value="success" ${filter === 'success' ? 'selected' : ''}>Berhasil</option></select></label>
    ${logs.map(l => `<div class="row" style="align-items:flex-start"><div><b>${esc(ACT[l.action] || ACT2[l.action] || l.action)} ${esc(T[l.entity]?.label || ENT[l.entity] || l.entity || '')}</b> ${badge(l.result || 'success')}<small>${esc(l.actor_id ? (who[l.actor_id] || l.actor_id.slice(0, 8)) : 'Tidak dikenal')} · ${esc(l.ip || '–')} · <span title="${esc(l.user_agent)}">${esc(uaShort(l.user_agent))}</span>${l.detail ? ' · ' + esc(l.detail) : ''}</small></div><small>${fdt(l.created_at)}</small></div>`).join('') || '<p class="dim">Tidak ada log.</p>'}
    <p class="dim" style="margin-top:10px">Menampilkan sampai 100 entri terbaru.</p></section>` : ''}`;
  m.querySelector('#lo-all').onclick = async () => {
    if (!confirm('Keluar dari semua perangkat? Anda juga akan keluar dari sini.')) return;
    try { await api('security/logout-all', { method:'POST' }); logout(); } catch (x) { m.querySelector('#lo-err').textContent = x.message; }
  };
  const lf = m.querySelector('#lf'); if (lf) lf.onchange = async () => { try { await showSecurity(m, lf.value); } catch (x) { m.innerHTML = `<p class="err">${esc(x.message)}</p>`; } };
}
async function showDash(m) {
  const [leads, deals, invs, props, tasks, logs] = await Promise.all(['leads','deals','invoices','proposals','tasks','activity_logs'].map(x => api(x).catch(e => { if (x === 'activity_logs') return []; throw e; })));
  const now = new Date(), mk = (y, mo) => `${y}-${String(mo + 1).padStart(2, '0')}`, ym = mk(now.getFullYear(), now.getMonth());
  const today = now.toISOString().slice(0, 10), week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), ago7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const rp = n => 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID'), tot = i => (i.items || []).reduce((a, x) => a + x.qty * x.price, 0), val = d => Number(d.value || 0);
  const open = deals.filter(d => !['menang', 'kalah'].includes(d.stage)), won = deals.filter(d => d.stage === 'menang'), lost = deals.filter(d => d.stage === 'kalah');
  const unpaid = invs.filter(i => ['terkirim', 'dibayar_sebagian'].includes(i.status)), piut = unpaid.reduce((a, i) => a + tot(i) - Number(i.paid_amount || 0), 0);
  const lewat = unpaid.filter(i => i.due_date && i.due_date < today), pending = tasks.filter(t => t.status !== 'selesai');
  const tlate = pending.filter(t => t.due_date && t.due_date < today), tsoon = pending.filter(t => t.due_date && t.due_date >= today && t.due_date <= week);
  const sent = props.filter(p => p.status === 'terkirim'), stale = sent.filter(p => (p.created_at || '') < ago7);
  const winRate = won.length + lost.length ? Math.round(100 * won.length / (won.length + lost.length)) + '%' : '–';
  const conv = leads.length ? Math.round(100 * deals.filter(d => d.source === 'website').length / leads.length) + '%' : '–';
  const kpi = [
    ['Prospek baru', leads.filter(l => l.status === 'new').length, `${leads.filter(l => (l.created_at || '').startsWith(ym)).length} masuk bulan ini`],
    ['Peluang aktif', open.length, rp(open.reduce((a, d) => a + val(d), 0))],
    ['Nilai menang', rp(won.reduce((a, d) => a + val(d), 0)), `${won.length} proyek`],
    ['Win rate', winRate, `${won.length} menang · ${lost.length} kalah`],
    ['Konversi prospek', conv, 'prospek website → peluang'],
    ['Piutang', rp(piut), `${lewat.length} lewat jatuh tempo`, lewat.length],
    ['Penawaran terkirim', sent.length, `${props.filter(p => p.status === 'draft').length} masih draft`],
    ['Tugas terlambat', tlate.length, `${tsoon.length} jatuh tempo ≤ 7 hari`, tlate.length]];
  const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return [mk(d.getFullYear(), d.getMonth()), d.toLocaleDateString('id-ID', { month:'short' })]; });
  const per = months.map(([k]) => leads.filter(l => (l.created_at || '').slice(0, 7) === k).length), mx = Math.max(1, ...per);
  const group = (arr, f, lab = x => x) => { const g = {}; arr.forEach(x => { const k = lab(f(x) || '(tanpa data)'); g[k] = (g[k] || 0) + 1; }); return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 6); };
  const hbars = rows => { const max = Math.max(1, ...rows.map(r => r[1])); return rows.length ? rows.map(([k, n]) => `<div class="hb"><span>${esc(k)}</span><i style="width:${Math.max(4, 100 * n / max)}%"></i><b>${n}</b></div>`).join('') : '<p class="dim">Belum ada data.</p>'; };
  const attn = [
    ...lewat.map(i => ['Faktur lewat jatuh tempo', `${i.number} · sisa ${rp(tot(i) - Number(i.paid_amount || 0))}`]),
    ...tlate.map(t => ['Tugas terlambat', `${t.title} · tenggat ${t.due_date}`]),
    ...stale.map(p => ['Penawaran perlu follow-up', `${p.number} · ${p.title}`])].slice(0, 8);
  m.innerHTML = `<h1>Ringkasan</h1><div class="kpis">${kpi.map(([l, v, s, w]) => `<div class="kpi${w ? ' warn' : ''}"><small>${l}</small><b>${esc(v)}</b><span>${esc(s)}</span></div>`).join('')}</div>
  <div class="cols"><section class="box"><h3>Prospek 6 bulan terakhir</h3><div class="trend">${per.map((n, i) => `<div><i style="height:${Math.max(3, 100 * n / mx)}%"></i><b>${n}</b><small>${months[i][1]}</small></div>`).join('')}</div></section>
  <section class="box"><h3>Perlu perhatian</h3>${attn.length ? attn.map(([k, v]) => `<div class="row"><div><b>${esc(k)}</b><small>${esc(v)}</small></div></div>`).join('') : '<p class="dim">Tidak ada yang mendesak. 👍</p>'}</section>
  <section class="box"><h3>Layanan paling diminati</h3>${hbars(group(leads, l => l.service_interest, k => SVC[k] || k))}</section>
  <section class="box"><h3>Sumber peluang</h3>${hbars(group(deals, d => d.source))}</section>
  <section class="box" style="grid-column:1/-1"><h3>Aktivitas terbaru</h3>${logs.slice(0, 8).map(l => `<div class="row"><div>${esc(ACT[l.action] || l.action)} ${esc(T[l.entity]?.label || l.entity)}</div><small>${new Date(l.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</small></div>`).join('') || '<p class="dim">Belum ada aktivitas.</p>'}</section></div>
  <p class="dim" style="margin-top:16px">Dihitung dari 200 data terbaru per tabel. Statistik pengunjung website: buka Cloudflare → Analytics &amp; Logs → Web Analytics (token dipasang lewat CF_BEACON_TOKEN dan VITE_CF_BEACON_TOKEN).</p>`;
}
async function showPipeline(m) {
  const [ds, orgs, invs] = await Promise.all([api('deals'), api('organizations'), api('invoices')]);
  const piutang = invs.filter(i => ['terkirim','dibayar_sebagian'].includes(i.status)).reduce((a, i) => a + (i.items || []).reduce((b, x) => b + x.qty * x.price, 0) - Number(i.paid_amount || 0), 0);
  const on = Object.fromEntries(orgs.map(o => [o.id, o.name])), rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  const sum = f => ds.filter(f).reduce((a, d) => a + Number(d.value || 0), 0);
  m.innerHTML = `<h1>Pipeline</h1><p style="color:var(--dim)">Nilai pipeline aktif: <b style="color:#fff">${rp(sum(d => !['menang','kalah'].includes(d.stage)))}</b> · Menang: <b style="color:#7ee787">${rp(sum(d => d.stage === 'menang'))}</b> · Piutang invoice: <b style="color:#ffd479">${rp(piutang)}</b></p>
  <p style="color:var(--dim)">Tambah peluang di tab <b>Peluang</b>, atau ubah prospek menjadi peluang di tab <b>Prospek</b>. Pindahkan tahap lewat menu di tiap kartu.</p>
  <div class="kan">${STAGES.map(st => { const c = ds.filter(d => d.stage === st); return `<section><h3>${L(st)} <small>${c.length}</small></h3>${c.map(d =>
    `<div class="k"><b>${esc(d.title)}</b><small>${esc(on[d.organization_id] || '')} ${d.value ? rp(d.value) : ''}</small><select data-id="${d.id}" ${can('crm', 'w') ? '' : 'disabled'}>${STAGES.map(x => `<option value="${x}" ${x === st ? 'selected' : ''}>${L(x)}</option>`).join('')}</select></div>`).join('')}</section>`; }).join('')}</div>`;
  m.onchange = async e => { const id = e.target.dataset.id; if (id) { try { await api('deals/' + id, { method:'PATCH', json:{ stage:e.target.value } }); } catch (x) { alert(x.message); } show(); } };
}
async function showMedia(m) {
  const rows = await api('media');
  m.innerHTML = `<h1>Media</h1>${can('content', 'w') ? '<form><label>Unggah gambar (maks 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><p class="err"></p></form>' : ''}<div class="grid">${rows.map(r =>
    `<div><img src="/media/${esc(r.object_key)}" alt=""><p>${esc(r.object_key)}</p>${can('content', 'd') ? `<button class="d" data-del="${r.id}">Hapus</button>` : ''}</div>`).join('')}</div>`;
  const up = m.querySelector('input'); if (up) up.onchange = async e => { try { await upload(e.target.files[0]); show(); } catch (x) { m.querySelector('.err').textContent = x.message; } };
  m.onclick = async e => { if (e.target.dataset.del && confirm('Hapus gambar?')) { await api('media/' + e.target.dataset.del, { method:'DELETE' }); show(); } };
}
async function showList(m, t) {
  const rows = await api(cur), refs = {};
  for (const [, ty, o] of t.f) if ((ty === 'ref' || ty === 'multi') && !refs[o]) refs[o] = await api(o);
  const cw = can(GRP[cur], 'w');
  m.innerHTML = `<h1>${t.label}</h1>${t.ro || !cw ? '' : '<button id="new">+ Tambah</button>'}<div id="form"></div>` + (rows.length ? rows.map(r =>
    `<div class="row"><div><b>${esc(r[t.title])}</b><small>${esc((t.sub || []).map(k => L(r[k])).filter(Boolean).join(' · ') || (r.status ? L(r.status) : r.is_published === false ? 'Draf' : '') + (r.published_at ? ' · terbit ' + r.published_at.slice(0, 10) : ''))}</small></div><div><button class="g" data-e="${r.id}">${cw ? 'Edit' : 'Lihat'}</button></div></div>`).join('') : '<p>Belum ada data.</p>');
  const open = r => form(m.querySelector('#form'), t, r, refs);
  m.onclick = e => { if (e.target.id === 'new') open({}); const id = e.target.dataset.e; if (id) { open(rows.find(r => r.id === id)); scrollTo(0, 0); } };
}
const parseItems = txt => txt.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a[0]).map(a => ({ desc:a[0], qty:Number((a[1] || '1').replace(',', '.').replace(/[^\d.]/g, '')) || 1, price:Number((a[2] || '0').replace(/[^\d]/g, '')) || 0 }));
function form(box, t, r, refs = {}) {
  box.innerHTML = `<form>${t.f.map(([k, type = 'text', opt]) => {
    const v = Array.isArray(r[k]) ? r[k].join(', ') : r[k] ?? '';
    if (type === 'check') return `<label class="c"><input type="checkbox" name="${k}" ${r[k] ? 'checked' : ''}>${L(k)}</label>`;
    if (type === 'textarea') return `<label>${L(k)}<textarea name="${k}" rows="5">${esc(v)}</textarea></label>`;
    if (type === 'items') return `<label>${L(k)}<textarea name="${k}" rows="6" placeholder="Pembuatan landing page | 1 | 3500000">${esc((r.items || []).map(x => `${x.desc} | ${x.qty} | ${x.price}`).join('\n'))}</textarea></label>`;
    if (type === 'ref') return `<label>${L(k)}<select name="${k}"><option value="">— tidak ada —</option>${(refs[opt] || []).map(x => `<option value="${x.id}" ${x.id === v ? 'selected' : ''}>${esc(x.name || x.title)}</option>`).join('')}</select></label>`;
    if (type === 'multi') { const sel = r[k] || []; return `<fieldset data-multi="${k}"><legend>${L(k)}</legend>${(refs[opt] || []).map(x => `<label class="c"><input type="checkbox" value="${x.id}" ${sel.includes(x.id) ? 'checked' : ''}>${esc(x.name)}</label>`).join('') || '<small>Belum ada. Tambahkan di tab Teknologi.</small>'}</fieldset>`; }
    if (type === 'gallery') return `<label>${L(k)}<textarea name="${k}" rows="4" placeholder="uploads/… | teks alternatif">${esc((r.gallery || []).map(g => g.alt_text ? `${g.object_key} | ${g.alt_text}` : g.object_key).join('\n'))}</textarea><input type="file" data-gal="${k}" accept="image/*" multiple></label>`;
    if (type === 'select') return `<label>${L(k)}<select name="${k}">${opt.map(o => `<option value="${o}" ${o === v ? 'selected' : ''}>${L(o)}</option>`).join('')}</select></label>`;
    if (type === 'image') return `<label>${L(k)}<input name="${k}" value="${esc(v)}" placeholder="uploads/…"><input type="file" data-up="${k}" accept="image/*"></label>`;
    return `<label>${L(k)}<input name="${k}" type="${type}" value="${esc(v)}"></label>`;
  }).join('')}<div>${can(GRP[cur], 'w') && !t.ro ? '<button>Simpan</button>' : ''} ${r.id && !t.ro && can(GRP[cur], 'd') ? '<button type="button" class="d" id="del">Hapus</button>' : ''} ${t.print && r.id ? '<button type="button" class="g" id="pdf">Unduh PDF</button> <button type="button" class="g" id="prn">Cetak</button>' : ''} ${cur === 'leads' && r.id && can('crm', 'w') ? '<button type="button" class="g" id="conv">Jadikan peluang</button>' : ''}</div><p class="err"></p></form>`;
  const f = box.querySelector('form'), err = f.querySelector('.err');
  if (!can(GRP[cur], 'w') || t.ro) f.querySelectorAll('input,select,textarea').forEach(el => el.disabled = true);
  f.onchange = async e => {
    const g = e.target.dataset.gal;
    if (g) { try { for (const file of e.target.files) { const o = await upload(file); f[g].value = (f[g].value.trim() ? f[g].value.trim() + '\n' : '') + o.object_key; } e.target.value = ''; } catch (x) { err.textContent = x.message; } return; }
    const k = e.target.dataset.up; if (!k) return; try { f[k].value = (await upload(e.target.files[0])).object_key; } catch (x) { err.textContent = x.message; } };
  f.onsubmit = async e => {
    e.preventDefault(); const o = {};
    for (const [k, type] of t.f) o[k] = type === 'multi' ? [...f.querySelectorAll(`fieldset[data-multi="${k}"] input:checked`)].map(i => i.value) : type === 'gallery' ? f[k].value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a[0]).map(a => ({ object_key:a[0], alt_text:a[1] || '' })) : type === 'items' ? parseItems(f[k].value) : type === 'check' ? f[k].checked : type === 'number' ? Number(f[k].value) || 0 : f[k].value;
    try { await api(r.id ? `${cur}/${r.id}` : cur, { method:r.id ? 'PATCH' : 'POST', json:o }); show(); } catch (x) { err.textContent = x.message; }
  };
  const pr = f.querySelector('#prn'); if (pr) pr.onclick = () => window.open(`cetak.html?t=${t.print}&id=${r.id}`, '_blank');
  const pf = f.querySelector('#pdf');
  if (pf) pf.onclick = async () => {
    err.textContent = ''; pf.disabled = true;
    try {
      const x = await fetch(`/api/admin/pdf/${t.print}/${r.id}`, { headers:{ Authorization:'Bearer ' + tok } });
      if (x.status === 401) { logout(); return; }
      if (!x.ok) { const d = await x.json().catch(() => ({})); throw new Error(x.status === 403 ? (d.detail || 'Akses ditolak.') : 'Gagal membuat PDF'); }
      const a = document.createElement('a'); a.href = URL.createObjectURL(await x.blob()); a.download = (r.number || t.print) + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { err.textContent = e.message; } finally { pf.disabled = false; }
  };
  const cv = f.querySelector('#conv');
  if (cv) cv.onclick = async () => { try { await api(`leads/${r.id}/convert`, { method:'POST' }); alert('Prospek dijadikan peluang (status: Baru). Lihat di tab Alur penjualan.'); show(); } catch (x) { err.textContent = x.message; } };
  const d = f.querySelector('#del'); if (d) d.onclick = async () => { if (confirm('Hapus data ini?')) { await api(`${cur}/${r.id}`, { method:'DELETE' }); show(); } };
}
if (tok) start();
