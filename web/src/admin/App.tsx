import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, setOnExpire, errMsg } from './api';
import { T, GRP, L } from './meta';
import Login from './Login';
import Crud from './Crud';
import Dashboard from './Dashboard';
import Security from './Security';
import { Pipeline, Media, Settings } from './Views';
import type { Can, Me } from './types';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [me, setMe] = useState<Me | null>(null), [tab, setTab] = useState('ringkasan'), [err, setErr] = useState('');

  const logout = useCallback(() => { setToken(''); setMe(null); setAuthed(false); }, []);
  useEffect(() => { setOnExpire(() => { setMe(null); setAuthed(false); }); }, []);

  const load = useCallback(async () => {
    try { setMe(await api<Me>('security/me')); setErr(''); } catch (e) { if (getToken()) setErr(errMsg(e)); }
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  if (!me) return <main>{err ? <p className="err">{err}</p> : <p>Memuat…</p>}{err && <button className="g" onClick={logout}>Keluar</button>}</main>;

  const can: Can = (g, l) => (me.perm?.[g] || '').includes(l);
  const mustMfa = !!me.mfa?.required && !me.mfa.enabled; // server hanya mengizinkan tab Keamanan sampai MFA aktif
  const allowed = (k: string) => (mustMfa ? k === 'keamanan' : k === 'keamanan' ? true : k === 'ringkasan' ? can('crm', 'r') && can('finance', 'r') : can(GRP[k], 'r'));
  const cur = allowed(tab) ? tab : Object.keys(T).find(allowed) || 'keamanan';
  const t = T[cur];

  return (
    <div id="app">
      <nav>
        {Object.entries(T).filter(([k]) => allowed(k)).map(([k, v]) => <button key={k} className={k === cur ? 'on' : ''} onClick={() => setTab(k)}>{v.label}</button>)}
        <small className="dim" style={{ padding: '8px 14px' }}>Peran: {L(me.role)}</small>
        <button className="g" onClick={logout}>Keluar</button>
      </nav>
      <main>
        {mustMfa && <p className="banner">Akun ini wajib memakai verifikasi 2 langkah. Aktifkan MFA di bawah untuk membuka menu lainnya.</p>}
        {t.dash ? <Dashboard />
          : t.security ? <Security me={me} can={can} onChanged={load} onLogout={logout} />
          : t.pipeline ? <Pipeline can={can} />
          : t.media ? <Media can={can} />
          : t.settings ? <Settings can={can} />
          : <Crud key={cur} tab={cur} can={can} />}
      </main>
    </div>
  );
}
