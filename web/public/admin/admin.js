const C = window.CFG, $ = s => document.querySelector(s);
let tok = sessionStorage.getItem('t') || '', cur = 'ringkasan';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const PUB = ['is_published','check'], SORT = ['sort_order','number'];
const STAGES = ['baru','dihubungi','discovery','proposal','negosiasi','menang','kalah'];
const LBL = { title:'Judul', slug:'Slug (huruf kecil-dan-minus)', summary:'Ringkasan', description:'Deskripsi', icon:'Ikon', sort_order:'Urutan', is_published:'Terbitkan',
  body:'Isi (mendukung Markdown)', category:'Kategori', technologies:'Teknologi (pisahkan dengan koma)', cover_key:'Gambar sampul', demo_url:'Tautan demo', featured:'Unggulan',
  excerpt:'Kutipan singkat', seo_title:'Judul SEO', seo_description:'Deskripsi SEO', status:'Status', client_name:'Nama klien', organization:'Organisasi', quote:'Isi testimoni',
  avatar_key:'Foto', name:'Nama', logo_key:'Logo', website_url:'Situs web', notes:'Catatan', website:'Situs web', industry:'Industri', position:'Jabatan', email:'Email',
  whatsapp:'WhatsApp', organization_id:'Organisasi', contact_id:'Kontak', deal_id:'Peluang', value:'Nilai (Rp)', stage:'Tahap', source:'Sumber', expected_close:'Target closing',
  kind:'Jenis', note:'Isi catatan', eyebrow:'Label atas', headline:'Judul utama', headline_dim:'Lanjutan judul', subheadline:'Sub-judul', cta_primary:'Tombol utama', cta_secondary:'Tombol kedua',
  baru:'Baru', dihubungi:'Dihubungi', discovery:'Discovery', proposal:'Proposal', negosiasi:'Negosiasi', menang:'Menang', kalah:'Kalah',
  new:'Baru', contacted:'Dihubungi', won:'Menang', lost:'Kalah', draft:'Draft', published:'Terbit', catatan:'Catatan', telepon:'Telepon', rapat:'Rapat',
  number:'Nomor (kosongkan untuk otomatis)', valid_until:'Berlaku hingga', scope:'Ruang lingkup pekerjaan', terms:'Syarat & ketentuan',
  items:'Rincian — satu baris per item: Deskripsi | Jumlah | Harga satuan (Rp)', issue_date:'Tanggal terbit', due_date:'Jatuh tempo / tenggat', paid_amount:'Sudah dibayar (Rp)',
  milestone:'Milestone', priority:'Prioritas', terkirim:'Terkirim', disetujui:'Disetujui', ditolak:'Ditolak', draf:'Draf', dibayar_sebagian:'Dibayar sebagian', lunas:'Lunas', batal:'Batal',
  todo:'Belum mulai', berjalan:'Berjalan', selesai:'Selesai', rendah:'Rendah', sedang:'Sedang', tinggi:'Tinggi' };
const L = k => LBL[k] || k;
const T = {
  ringkasan: { label:'Ringkasan', dash:true },
  leads: { label:'Prospek', title:'name', sub:['email','whatsapp','service_interest','brief'], ro:true,
    f:[['status','select',['new','contacted','discovery','proposal','won','lost']],['notes','textarea']] },
  pipeline: { label:'Pipeline', pipeline:true },
  deals: { label:'Peluang', title:'title', sub:['stage','value'], f:[['title'],['organization_id','ref','organizations'],['contact_id','ref','contacts'],['value','number'],['stage','select',STAGES],['source'],['expected_close','date'],['notes','textarea']] },
  organizations: { label:'Organisasi', title:'name', sub:['industry','website'], f:[['name'],['website'],['industry'],['notes','textarea']] },
  contacts: { label:'Kontak', title:'name', sub:['position','email','whatsapp'], f:[['name'],['position'],['email'],['whatsapp'],['organization_id','ref','organizations'],['notes','textarea']] },
  interactions: { label:'Riwayat', title:'note', sub:['kind','created_at'], f:[['deal_id','ref','deals'],['kind','select',['catatan','telepon','whatsapp','email','rapat']],['note','textarea']] },
  proposals: { label:'Penawaran', title:'title', sub:['number','status'], print:'proposal', f:[['number'],['title'],['deal_id','ref','deals'],['status','select',['draft','terkirim','disetujui','ditolak']],['valid_until','date'],['items','items'],['scope','textarea'],['terms','textarea']] },
  invoices: { label:'Invoice', title:'title', sub:['number','status','due_date'], print:'invoice', f:[['number'],['title'],['deal_id','ref','deals'],['organization_id','ref','organizations'],['status','select',['draf','terkirim','dibayar_sebagian','lunas','batal']],['issue_date','date'],['due_date','date'],['items','items'],['paid_amount','number'],['notes','textarea']] },
  tasks: { label:'Tugas', title:'title', sub:['milestone','status','priority','due_date'], f:[['title'],['deal_id','ref','deals'],['milestone'],['status','select',['todo','berjalan','selesai']],['priority','select',['rendah','sedang','tinggi']],['due_date','date'],['notes','textarea']] },
  services: { label:'Layanan', title:'title', f:[['title'],['slug'],['summary'],['description','textarea'],['icon'],SORT,PUB] },
  projects: { label:'Portofolio', title:'title', f:[['title'],['slug'],['summary'],['body','textarea'],['category'],['technologies'],['cover_key','image'],['demo_url'],['featured','check'],PUB] },
  articles: { label:'Artikel', title:'title', f:[['title'],['slug'],['excerpt'],['body','textarea'],['seo_title'],['seo_description'],['cover_key','image'],['status','select',['draft','published']]] },
  testimonials: { label:'Testimoni', title:'client_name', f:[['client_name'],['organization'],['quote','textarea'],['avatar_key','image'],PUB] },
  clients: { label:'Klien', title:'name', f:[['name'],['logo_key','image'],['website_url'],PUB] },
  media: { label:'Media', media:true },
  settings: { label:'Pengaturan', settings:true },
};
async function api(path, o = {}) {
  const r = await fetch('/api/admin/' + path, { method:o.method||'GET', body:o.json?JSON.stringify(o.json):o.body,
    headers:{ Authorization:'Bearer ' + tok, ...(o.json?{'Content-Type':'application/json'}:{}) } });
  if (r.status === 401) { logout(); throw new Error('Sesi berakhir'); }
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || r.status); return d;
}
function logout() { sessionStorage.removeItem('t'); tok = ''; $('#app').style.display = 'none'; $('#login').style.display = 'grid'; }
$('#login').onsubmit = async e => {
  e.preventDefault(); $('#lerr').textContent = '';
  const r = await fetch(C.SUPABASE_URL + '/auth/v1/token?grant_type=password', { method:'POST',
    headers:{ apikey:C.ANON_KEY, 'Content-Type':'application/json' }, body:JSON.stringify({ email:$('#em').value, password:$('#pw').value }) });
  const d = await r.json(); if (!r.ok) { $('#lerr').textContent = 'Email atau password salah.'; return; }
  tok = d.access_token; sessionStorage.setItem('t', tok); $('#pw').value = ''; start();
};
function start() {
  $('#login').style.display = 'none'; $('#app').style.display = 'grid';
  $('#nav').innerHTML = Object.entries(T).map(([k, v]) => `<button data-k="${k}" class="${k===cur?'on':''}">${v.label}</button>`).join('') + '<button id="out" class="g">Keluar</button>';
  $('#nav').onclick = e => { const k = e.target.dataset.k; if (k) { cur = k; start(); } if (e.target.id === 'out') logout(); };
  show();
}
async function show() {
  const m = $('#main'), t = T[cur]; m.innerHTML = '<p>Memuat…</p>';
  try { t.dash ? await showDash(m) : t.pipeline ? await showPipeline(m) : t.media ? await showMedia(m) : t.settings ? await showSettings(m) : await showList(m, t); } catch (e) { if (tok) m.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
async function upload(file, alt) {
  const r = await fetch('/api/admin/media?alt=' + encodeURIComponent(alt || ''), { method:'POST', body:file, headers:{ Authorization:'Bearer ' + tok } });
  const d = await r.json(); if (!r.ok) throw new Error(d.error === 'type' ? 'Hanya PNG/JPG/WebP/GIF' : d.error === 'size' ? 'Maks 5 MB' : d.error); return d[0] || d;
}
const SET = { hero:[['eyebrow'],['headline'],['headline_dim'],['subheadline','textarea'],['cta_primary'],['cta_secondary']], contact:[['whatsapp'],['email']] };
async function showSettings(m) {
  const rows = await api('settings'), v = Object.fromEntries(rows.map(r => [r.key, r.value]));
  m.innerHTML = '<h1>Settings</h1><p style="color:var(--dim)">Kosongkan kolom untuk memakai teks bawaan. WhatsApp: angka saja, contoh 628123456789.</p>' + Object.entries(SET).map(([k, fs]) =>
    `<form data-k="${k}"><b>${k === 'hero' ? 'Hero' : 'Kontak'}</b>${fs.map(([n, ty]) => `<label>${L(n)}${ty === 'textarea' ? `<textarea name="${n}" rows="3">${esc(v[k]?.[n])}</textarea>` : `<input name="${n}" value="${esc(v[k]?.[n])}">`}</label>`).join('')}<div><button>Simpan</button></div><p class="err"></p></form>`).join('');
  m.querySelectorAll('form').forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const o = {}; new FormData(f).forEach((x, n) => o[n] = x); const er = f.querySelector('.err');
    try { await api('settings/' + f.dataset.k, { method:'PUT', json:o }); er.style.color = '#7ee787'; er.textContent = 'Tersimpan. Tampil di situs dalam ±60 detik.'; }
    catch (x) { er.style.color = ''; er.textContent = x.message; }
  });
}
const ACT = { create:'Membuat', update:'Mengubah', delete:'Menghapus', upload:'Mengunggah', convert:'Mengonversi' };
const SVC = { website:'Website / landing page', webapp:'Aplikasi web', system:'Sistem informasi', custom:'Aplikasi custom' };
async function showDash(m) {
  const [leads, deals, invs, props, tasks, logs] = await Promise.all(['leads','deals','invoices','proposals','tasks','activity_logs'].map(x => api(x)));
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
    ...lewat.map(i => ['Invoice lewat jatuh tempo', `${i.number} · sisa ${rp(tot(i) - Number(i.paid_amount || 0))}`]),
    ...tlate.map(t => ['Tugas terlambat', `${t.title} · tenggat ${t.due_date}`]),
    ...stale.map(p => ['Penawaran perlu follow-up', `${p.number} · ${p.title}`])].slice(0, 8);
  m.innerHTML = `<h1>Ringkasan</h1><div class="kpis">${kpi.map(([l, v, s, w]) => `<div class="kpi${w ? ' warn' : ''}"><small>${l}</small><b>${esc(v)}</b><span>${esc(s)}</span></div>`).join('')}</div>
  <div class="cols"><section class="box"><h3>Prospek 6 bulan terakhir</h3><div class="trend">${per.map((n, i) => `<div><i style="height:${Math.max(3, 100 * n / mx)}%"></i><b>${n}</b><small>${months[i][1]}</small></div>`).join('')}</div></section>
  <section class="box"><h3>Perlu perhatian</h3>${attn.length ? attn.map(([k, v]) => `<div class="row"><div><b>${esc(k)}</b><small>${esc(v)}</small></div></div>`).join('') : '<p class="dim">Tidak ada yang mendesak. 👍</p>'}</section>
  <section class="box"><h3>Layanan paling diminati</h3>${hbars(group(leads, l => l.service_interest, k => SVC[k] || k))}</section>
  <section class="box"><h3>Sumber peluang</h3>${hbars(group(deals, d => d.source))}</section>
  <section class="box" style="grid-column:1/-1"><h3>Aktivitas terbaru</h3>${logs.slice(0, 8).map(l => `<div class="row"><div>${esc(ACT[l.action] || l.action)} ${esc(T[l.entity]?.label || l.entity)}</div><small>${new Date(l.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</small></div>`).join('') || '<p class="dim">Belum ada aktivitas.</p>'}</section></div>
  <p class="dim" style="margin-top:16px">Dihitung dari 200 data terbaru per tabel. Statistik pengunjung website: aktifkan Cloudflare Web Analytics di dashboard Cloudflare.</p>`;
}
async function showPipeline(m) {
  const [ds, orgs, invs] = await Promise.all([api('deals'), api('organizations'), api('invoices')]);
  const piutang = invs.filter(i => ['terkirim','dibayar_sebagian'].includes(i.status)).reduce((a, i) => a + (i.items || []).reduce((b, x) => b + x.qty * x.price, 0) - Number(i.paid_amount || 0), 0);
  const on = Object.fromEntries(orgs.map(o => [o.id, o.name])), rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  const sum = f => ds.filter(f).reduce((a, d) => a + Number(d.value || 0), 0);
  m.innerHTML = `<h1>Pipeline</h1><p style="color:var(--dim)">Nilai pipeline aktif: <b style="color:#fff">${rp(sum(d => !['menang','kalah'].includes(d.stage)))}</b> · Menang: <b style="color:#7ee787">${rp(sum(d => d.stage === 'menang'))}</b> · Piutang invoice: <b style="color:#ffd479">${rp(piutang)}</b></p>
  <p style="color:var(--dim)">Tambah peluang di tab <b>Peluang</b>, atau ubah prospek menjadi peluang di tab <b>Prospek</b>. Pindahkan tahap lewat menu di tiap kartu.</p>
  <div class="kan">${STAGES.map(st => { const c = ds.filter(d => d.stage === st); return `<section><h3>${L(st)} <small>${c.length}</small></h3>${c.map(d =>
    `<div class="k"><b>${esc(d.title)}</b><small>${esc(on[d.organization_id] || '')} ${d.value ? rp(d.value) : ''}</small><select data-id="${d.id}">${STAGES.map(x => `<option value="${x}" ${x === st ? 'selected' : ''}>${L(x)}</option>`).join('')}</select></div>`).join('')}</section>`; }).join('')}</div>`;
  m.onchange = async e => { const id = e.target.dataset.id; if (id) { try { await api('deals/' + id, { method:'PATCH', json:{ stage:e.target.value } }); } catch (x) { alert(x.message); } show(); } };
}
async function showMedia(m) {
  const rows = await api('media');
  m.innerHTML = `<h1>Media</h1><form><label>Unggah gambar (maks 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><p class="err"></p></form><div class="grid">${rows.map(r =>
    `<div><img src="/media/${esc(r.object_key)}" alt=""><p>${esc(r.object_key)}</p><button class="d" data-del="${r.id}">Hapus</button></div>`).join('')}</div>`;
  m.querySelector('input').onchange = async e => { try { await upload(e.target.files[0]); show(); } catch (x) { m.querySelector('.err').textContent = x.message; } };
  m.onclick = async e => { if (e.target.dataset.del && confirm('Hapus gambar?')) { await api('media/' + e.target.dataset.del, { method:'DELETE' }); show(); } };
}
async function showList(m, t) {
  const rows = await api(cur), refs = {};
  for (const [, ty, o] of t.f) if (ty === 'ref') refs[o] = await api(o);
  m.innerHTML = `<h1>${t.label}</h1>${t.ro ? '' : '<button id="new">+ Tambah</button>'}<div id="form"></div>` + (rows.length ? rows.map(r =>
    `<div class="row"><div><b>${esc(r[t.title])}</b><small>${esc((t.sub || []).map(k => L(r[k])).filter(Boolean).join(' · ') || (r.is_published === false ? 'Draft' : L(r.status) || ''))}</small></div><div><button class="g" data-e="${r.id}">Edit</button></div></div>`).join('') : '<p>Belum ada data.</p>');
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
    if (type === 'select') return `<label>${L(k)}<select name="${k}">${opt.map(o => `<option value="${o}" ${o === v ? 'selected' : ''}>${L(o)}</option>`).join('')}</select></label>`;
    if (type === 'image') return `<label>${L(k)}<input name="${k}" value="${esc(v)}" placeholder="uploads/…"><input type="file" data-up="${k}" accept="image/*"></label>`;
    return `<label>${L(k)}<input name="${k}" type="${type}" value="${esc(v)}"></label>`;
  }).join('')}<div><button>Simpan</button> ${r.id && !t.ro ? '<button type="button" class="d" id="del">Hapus</button>' : ''} ${t.print && r.id ? '<button type="button" class="g" id="prn">Cetak / PDF</button>' : ''} ${cur === 'leads' && r.id ? '<button type="button" class="g" id="conv">Jadikan peluang</button>' : ''}</div><p class="err"></p></form>`;
  const f = box.querySelector('form'), err = f.querySelector('.err');
  f.onchange = async e => { const k = e.target.dataset.up; if (!k) return; try { f[k].value = (await upload(e.target.files[0])).object_key; } catch (x) { err.textContent = x.message; } };
  f.onsubmit = async e => {
    e.preventDefault(); const o = {};
    for (const [k, type] of t.f) o[k] = type === 'items' ? parseItems(f[k].value) : type === 'check' ? f[k].checked : type === 'number' ? Number(f[k].value) || 0 : f[k].value;
    try { await api(r.id ? `${cur}/${r.id}` : cur, { method:r.id ? 'PATCH' : 'POST', json:o }); show(); } catch (x) { err.textContent = x.message; }
  };
  const pr = f.querySelector('#prn'); if (pr) pr.onclick = () => window.open(`cetak.html?t=${t.print}&id=${r.id}`, '_blank');
  const cv = f.querySelector('#conv');
  if (cv) cv.onclick = async () => { try { await api(`leads/${r.id}/convert`, { method:'POST' }); alert('Prospek dijadikan peluang (status: Baru). Lihat di tab Pipeline.'); show(); } catch (x) { err.textContent = x.message; } };
  const d = f.querySelector('#del'); if (d) d.onclick = async () => { if (confirm('Hapus data ini?')) { await api(`${cur}/${r.id}`, { method:'DELETE' }); show(); } };
}
if (tok) start();
