import { useState, type FormEvent } from 'react';
import { api, setToken, errMsg, type Page } from './api';
import { L, T, fdt } from './meta';
import { ACT, ACT2, ENT, uaShort } from './util';
import { Pager, useLoad, Status } from './ui';
import type { Can, Me, Row } from './types';

const badge = (r: string) => (
  <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 12, background: r === 'success' ? '#dcfce7' : r === 'denied' ? '#fef3c7' : '#ffe4e6',
    color: r === 'success' ? '#047857' : r === 'denied' ? '#b45309' : '#be123c' }}>{L(r)}</span>);

// Pendaftaran / pencabutan MFA (TOTP). Setelah kode benar, Supabase memberi token baru level aal2 yang menggantikan token lama.
function Mfa({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const st = useLoad(() => api<{ enabled: boolean; required: boolean; factors: { id: string; status: string; name: string; created_at: string | null }[] }>('security/mfa'), [me.mfa?.enabled]);
  const [enr, setEnr] = useState<{ factor_id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setErr(''); setBusy(true); try { await fn(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); } };
  const start = () => run(async () => { setEnr(await api('security/mfa/enroll', { method: 'POST' })); setCode(''); });
  const verify = (e: FormEvent) => { e.preventDefault(); if (!enr) return; run(async () => {
    const d = await api<{ access_token: string }>('security/mfa/verify', { method: 'POST', json: { factor_id: enr.factor_id, code } });
    setToken(d.access_token); setEnr(null); onChanged();
  }); };
  const off = (id: string) => confirm('Nonaktifkan MFA? Akun hanya dilindungi kata sandi.') && run(async () => { await api('security/mfa/' + id, { method: 'DELETE' }); onChanged(); });
  const d = st.data, verified = d?.factors.find(f => f.status === 'verified');
  return (
    <section className="box" style={{ margin: '16px 0' }}>
      <h3>Verifikasi 2 langkah (MFA)</h3>
      <Status err={st.err} loading={!d} />
      {d && verified && !enr && <>
        <p><b style={{ color: '#047857' }}>Aktif</b> — login meminta kode 6 digit dari aplikasi autentikator.</p>
        {!d.required && <button className="d" disabled={busy} onClick={() => off(verified.id)}>Nonaktifkan MFA</button>}
        {d.required && <p className="dim">MFA diwajibkan oleh konfigurasi server (REQUIRE_MFA).</p>}
      </>}
      {d && !verified && !enr && <>
        <p className="dim">Belum aktif. Pasang aplikasi autentikator (Google Authenticator, Authy, 1Password, dll), lalu pindai kode QR.</p>
        <button disabled={busy} onClick={start}>Aktifkan MFA</button>
      </>}
      {enr && <form onSubmit={verify} style={{ background: 'none', padding: 0, margin: '8px 0 0' }}>
        <p>1. Pindai kode QR ini di aplikasi autentikator.</p>
        {enr.qr && <div className="qr"><img src={enr.qr} alt="Kode QR MFA" /></div>}
        <p className="dim">Tidak bisa memindai? Masukkan kunci ini manual: <code>{enr.secret}</code></p>
        <p>2. Masukkan 6 digit kode yang muncul untuk menyelesaikan.</p>
        <input value={code} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <div><button disabled={busy || code.length !== 6}>Aktifkan</button>{' '}<button type="button" className="g" onClick={() => setEnr(null)}>Batal</button></div>
      </form>}
      <p className="err">{err}</p>
    </section>
  );
}

export default function Security({ me, can, onChanged, onLogout }: { me: Me; can: Can; onChanged: () => void; onLogout: () => void }) {
  const adm = can('logs', 'r');
  const [filter, setFilter] = useState(''), [page, setPage] = useState(1), [e2, setE2] = useState('');
  const admins = useLoad(() => (adm ? api<Row[]>('security/admins') : Promise.resolve([] as Row[])), [adm]);
  const logs = useLoad(() => (adm ? api<Page<Row>>(`security/logs?page=${page}${filter ? '&result=' + filter : ''}`) : Promise.resolve(null)), [adm, page, filter]);
  const who: Record<string, string> = Object.fromEntries((admins.data || []).map(a => [a.user_id, a.name || a.email || String(a.user_id).slice(0, 8)]));
  const s = me.session;
  const logoutAll = async () => {
    if (!confirm('Keluar dari semua perangkat? Anda juga akan keluar dari sini.')) return;
    try { await api('security/logout-all', { method: 'POST' }); onLogout(); } catch (x) { setE2(errMsg(x)); }
  };
  return (
    <>
      <h1>Keamanan &amp; Log</h1>
      <section className="box" style={{ margin: '16px 0' }}><h3>Profil &amp; sesi saya</h3>
        <div className="row"><div><b>{me.name || me.email}</b><small>{me.email} · peran {L(me.role)}</small></div></div>
        <div className="row"><div>Login terakhir (Supabase)</div><small>{fdt(me.last_sign_in_at)}</small></div>
        <div className="row"><div>Sesi ini terbit</div><small>{fdt(s?.issued_at)}</small></div>
        <div className="row"><div>Sesi ini berakhir</div><small>{fdt(s?.expires_at)}</small></div>
        <div className="row"><div>Dari IP / perangkat</div><small title={s?.user_agent}>{s?.ip} · {uaShort(s?.user_agent)}</small></div>
        <p className="dim" style={{ margin: '12px 0 6px' }}>Login berhasil terakhir</p>
        {(me.recent_logins || []).map((x, i) => <div className="row" key={i}><div>{fdt(x.created_at)}</div><small title={x.user_agent}>{x.ip || '–'} · {uaShort(x.user_agent)}</small></div>)}
        {!me.recent_logins?.length && <p className="dim">Belum ada riwayat login tercatat.</p>}
        <div style={{ marginTop: 12 }}><button className="d" onClick={logoutAll}>Keluar dari semua perangkat</button> <span className="err">{e2}</span></div>
      </section>
      <Mfa me={me} onChanged={onChanged} />
      {adm && <>
        <section className="box" style={{ margin: '16px 0' }}><h3>Admin &amp; peran</h3>
          <Status err={admins.err} loading={!admins.data} />
          {(admins.data || []).map(a => <div className="row" key={a.user_id}><div><b>{a.name || a.email || a.user_id}</b><small>{a.email} · masuk terakhir {fdt(a.last_sign_in_at)}</small></div><div>{L(a.role)}</div></div>)}
          <p className="dim" style={{ marginTop: 10 }}>Ubah peran lewat SQL Editor Supabase: <code>update admin_profiles set role = 'editor' where user_id = '…'</code> (admin, editor, viewer).</p></section>
        <section className="box" style={{ margin: '16px 0' }}><h3>Log aktivitas</h3>
          <label>Tampilkan
            <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">Semua hasil</option><option value="failure">Gagal</option><option value="denied">Ditolak</option><option value="success">Berhasil</option>
            </select></label>
          <Status err={logs.err} loading={!logs.data} />
          {logs.data && logs.data.rows.map(l => (
            <div className="row" key={l.id} style={{ alignItems: 'flex-start' }}>
              <div><b>{ACT[l.action] || ACT2[l.action] || l.action} {T[l.entity]?.label || ENT[l.entity] || l.entity || ''}</b> {badge(l.result || 'success')}
                <small>{l.actor_id ? who[l.actor_id] || String(l.actor_id).slice(0, 8) : 'Tidak dikenal'} · {l.ip || '–'} · <span title={l.user_agent}>{uaShort(l.user_agent)}</span>{l.detail ? ' · ' + l.detail : ''}</small></div>
              <small>{fdt(l.created_at)}</small></div>))}
          {logs.data && !logs.data.rows.length && <p className="dim">Tidak ada log.</p>}
          {logs.data && <Pager page={logs.data.page} total={logs.data.total} per={logs.data.per} onPage={setPage} />}
        </section></>}
    </>
  );
}
