const q = new URLSearchParams(location.search), tok = sessionStorage.getItem('t') || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const rp = n => 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID');
const tgl = d => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '-';
const api = async p => { const r = await fetch('/api/admin/' + p, { headers:{ Authorization:'Bearer ' + tok } }); if (!r.ok) throw new Error(r.status === 401 ? 'Sesi berakhir. Masuk ulang di halaman admin, lalu buka dokumen lagi.' : 'Gagal memuat'); return r.json(); };
(async () => {
  const el = document.getElementById('doc'), type = q.get('t') === 'invoice' ? 'invoice' : 'proposal', id = q.get('id');
  try {
    const [docs, deals, orgs, cons, st] = await Promise.all([api(type === 'invoice' ? 'invoices' : 'proposals'), api('deals'), api('organizations'), api('contacts'), api('settings')]);
    const d = docs.find(x => x.id === id); if (!d) throw new Error('Dokumen tidak ditemukan');
    const deal = deals.find(x => x.id === d.deal_id) || {}, org = orgs.find(x => x.id === (d.organization_id || deal.organization_id)) || {}, con = cons.find(x => x.id === deal.contact_id) || {};
    const contact = (st.find(x => x.key === 'contact') || {}).value || {};
    const items = d.items || [], total = items.reduce((a, x) => a + x.qty * x.price, 0), inv = type === 'invoice';
    el.innerHTML = `<div class="top"><div class="logo">RUtusdev<span>.</span><p style="font:12px Inter;color:#6b6f7b">Studio pengembangan digital</p></div>
      <div class="doc"><h1>${inv ? 'FAKTUR' : 'PENAWARAN'}</h1><div>${esc(d.number)}</div></div></div>
      <div class="meta"><div><small>Ditujukan kepada</small><b>${esc(org.name || con.name || '-')}</b><br>${esc(org.name && con.name ? 'u.p. ' + con.name : '')}${con.email ? '<br>' + esc(con.email) : ''}</div>
      <div>${inv ? `<small>Tanggal terbit</small>${tgl(d.issue_date)}<br><small>Jatuh tempo</small>${tgl(d.due_date)}` : `<small>Tanggal</small>${tgl(d.created_at)}<br><small>Berlaku hingga</small>${tgl(d.valid_until)}`}</div></div>
      <h3>${esc(d.title)}</h3>
      <table><tr><th>No</th><th>Deskripsi</th><th class="r">Jml</th><th class="r">Harga satuan</th><th class="r">Subtotal</th></tr>${items.map((x, i) =>
        `<tr><td>${i + 1}</td><td>${esc(x.desc)}</td><td class="r">${x.qty}</td><td class="r">${rp(x.price)}</td><td class="r">${rp(x.qty * x.price)}</td></tr>`).join('') || '<tr><td colspan="5">Belum ada rincian.</td></tr>'}
        <tr class="tot grand"><td colspan="4" class="r">Total</td><td class="r">${rp(total)}</td></tr>
        ${inv ? `<tr class="tot"><td colspan="4" class="r">Sudah dibayar</td><td class="r">${rp(d.paid_amount)}</td></tr><tr class="tot"><td colspan="4" class="r">Sisa tagihan</td><td class="r">${rp(Math.max(0, total - Number(d.paid_amount || 0)))}</td></tr>` : ''}</table>
      ${inv ? (d.notes ? `<h3>Catatan pembayaran</h3><p>${esc(d.notes)}</p>` : '') : `${d.scope ? `<h3>Ruang lingkup pekerjaan</h3><p>${esc(d.scope)}</p>` : ''}${d.terms ? `<h3>Syarat &amp; ketentuan</h3><p>${esc(d.terms)}</p>` : ''}`}
      <div class="foot">RUtusdev${contact.email ? ' · ' + esc(contact.email) : ''}${contact.whatsapp ? ' · WhatsApp ' + esc(contact.whatsapp) : ''}</div>`;
    document.title = (inv ? 'Faktur ' : 'Penawaran ') + d.number;
  } catch (e) { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
})();
