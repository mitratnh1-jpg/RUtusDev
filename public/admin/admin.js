const C = window.CFG, $ = s => document.querySelector(s);
let tok = sessionStorage.getItem('t') || '', cur = 'leads';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const PUB = ['is_published','check'], SORT = ['sort_order','number'];
const T = {
  leads: { label:'Leads', title:'name', sub:['email','whatsapp','service_interest','brief'], ro:true,
    f:[['status','select',['new','contacted','discovery','proposal','won','lost']],['notes','textarea']] },
  services: { label:'Services', title:'title', f:[['title'],['slug'],['summary'],['description','textarea'],['icon'],SORT,PUB] },
  projects: { label:'Portfolio', title:'title', f:[['title'],['slug'],['summary'],['body','textarea'],['category'],['technologies'],['cover_key','image'],['demo_url'],['featured','check'],PUB] },
  articles: { label:'Articles', title:'title', f:[['title'],['slug'],['excerpt'],['body','textarea'],['seo_title'],['seo_description'],['cover_key','image'],['status','select',['draft','published']]] },
  testimonials: { label:'Testimonials', title:'client_name', f:[['client_name'],['organization'],['quote','textarea'],['avatar_key','image'],PUB] },
  clients: { label:'Clients', title:'name', f:[['name'],['logo_key','image'],['website_url'],PUB] },
  media: { label:'Media', media:true },
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
  try { t.media ? await showMedia(m) : await showList(m, t); } catch (e) { if (tok) m.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
async function upload(file, alt) {
  const r = await fetch('/api/admin/media?alt=' + encodeURIComponent(alt || ''), { method:'POST', body:file, headers:{ Authorization:'Bearer ' + tok } });
  const d = await r.json(); if (!r.ok) throw new Error(d.error === 'type' ? 'Hanya PNG/JPG/WebP/GIF' : d.error === 'size' ? 'Maks 5 MB' : d.error); return d[0] || d;
}
async function showMedia(m) {
  const rows = await api('media');
  m.innerHTML = `<h1>Media</h1><form><label>Unggah gambar (maks 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><p class="err"></p></form><div class="grid">${rows.map(r =>
    `<div><img src="/media/${esc(r.object_key)}" alt=""><p>${esc(r.object_key)}</p><button class="d" data-del="${r.id}">Hapus</button></div>`).join('')}</div>`;
  m.querySelector('input').onchange = async e => { try { await upload(e.target.files[0]); show(); } catch (x) { m.querySelector('.err').textContent = x.message; } };
  m.onclick = async e => { if (e.target.dataset.del && confirm('Hapus gambar?')) { await api('media/' + e.target.dataset.del, { method:'DELETE' }); show(); } };
}
async function showList(m, t) {
  const rows = await api(cur);
  m.innerHTML = `<h1>${t.label}</h1>${t.ro ? '' : '<button id="new">+ Tambah</button>'}<div id="form"></div>` + (rows.length ? rows.map(r =>
    `<div class="row"><div><b>${esc(r[t.title])}</b><small>${esc((t.sub || []).map(k => r[k]).filter(Boolean).join(' · ') || (r.is_published === false ? 'Draft' : r.status || ''))}</small></div><div><button class="g" data-e="${r.id}">Edit</button></div></div>`).join('') : '<p>Belum ada data.</p>');
  const open = r => form(m.querySelector('#form'), t, r);
  m.onclick = e => { if (e.target.id === 'new') open({}); const id = e.target.dataset.e; if (id) { open(rows.find(r => r.id === id)); scrollTo(0, 0); } };
}
function form(box, t, r) {
  box.innerHTML = `<form>${t.f.map(([k, type = 'text', opt]) => {
    const v = Array.isArray(r[k]) ? r[k].join(', ') : r[k] ?? '';
    if (type === 'check') return `<label class="c"><input type="checkbox" name="${k}" ${r[k] ? 'checked' : ''}>${k}</label>`;
    if (type === 'textarea') return `<label>${k}<textarea name="${k}" rows="5">${esc(v)}</textarea></label>`;
    if (type === 'select') return `<label>${k}<select name="${k}">${opt.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    if (type === 'image') return `<label>${k}<input name="${k}" value="${esc(v)}" placeholder="uploads/…"><input type="file" data-up="${k}" accept="image/*"></label>`;
    return `<label>${k}<input name="${k}" type="${type}" value="${esc(v)}"></label>`;
  }).join('')}<div><button>Simpan</button> ${r.id && !t.ro ? '<button type="button" class="d" id="del">Hapus</button>' : ''}</div><p class="err"></p></form>`;
  const f = box.querySelector('form'), err = f.querySelector('.err');
  f.onchange = async e => { const k = e.target.dataset.up; if (!k) return; try { f[k].value = (await upload(e.target.files[0])).object_key; } catch (x) { err.textContent = x.message; } };
  f.onsubmit = async e => {
    e.preventDefault(); const o = {};
    for (const [k, type] of t.f) o[k] = type === 'check' ? f[k].checked : type === 'number' ? Number(f[k].value) || 0 : f[k].value;
    try { await api(r.id ? `${cur}/${r.id}` : cur, { method:r.id ? 'PATCH' : 'POST', json:o }); show(); } catch (x) { err.textContent = x.message; }
  };
  const d = f.querySelector('#del'); if (d) d.onclick = async () => { if (confirm('Hapus data ini?')) { await api(`${cur}/${r.id}`, { method:'DELETE' }); show(); } };
}
if (tok) start();
