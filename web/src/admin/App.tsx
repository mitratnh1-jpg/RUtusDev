import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, setOnExpire, errMsg } from './api';
import { T, GRP, L } from './meta';
import Login from './Login';
import Crud from './Crud';
import Dashboard from './Dashboard';
import Security from './Security';
import { Pipeline, Media, Settings } from './Views';
import { Icon, TAB_ICON, NAV_GROUPS } from './icons';
import type { Can, Me } from './types';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [me, setMe] = useState<Me | null>(null), [tab, setTab] = useState('ringkasan'), [err, setErr] = useState(''), [drawer, setDrawer] = useState(false);

  const logout = useCallback(() => { setToken(''); setMe(null); setAuthed(false); }, []);
  useEffect(() => { setOnExpire(() => { setMe(null); setAuthed(false); }); }, []);

  const load = useCallback(async () => {
    try { setMe(await api<Me>('security/me')); setErr(''); } catch (e) { if (getToken()) setErr(errMsg(e)); }
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  if (!me) return <main className="solo">{err ? <p className="err">{err}</p> : <p className="dim">Memuat…</p>}{err && <button className="g" onClick={logout}>Keluar</button>}</main>;

  const can: Can = (g, l) => (me.perm?.[g] || '').includes(l);
  const mustMfa = !!me.mfa?.required && !me.mfa.enabled; // server hanya mengizinkan tab Keamanan sampai MFA aktif
  const allowed = (k: string) => (mustMfa ? k === 'keamanan' : k === 'keamanan' ? true : k === 'ringkasan' ? can('crm', 'r') && can('finance', 'r') : can(GRP[k], 'r'));
  const cur = allowed(tab) ? tab : Object.keys(T).find(allowed) || 'keamanan';
  const t = T[cur];
  const go = (k: string) => { setTab(k); setDrawer(false); window.scrollTo(0, 0); };
  const initials = (me.name || me.email || 'A').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();

  const menu = (
    <>
      {NAV_GROUPS.map(([label, keys]) => {
        const items = keys.filter(k => T[k] && allowed(k));
        return items.length ? (
          <div key={label} className="ng">
            <div className="cap">{label}</div>
            {items.map(k => <button key={k} className={'ni' + (k === cur ? ' on' : '')} onClick={() => go(k)} aria-current={k === cur ? 'page' : undefined}><Icon n={TAB_ICON[k] || 'dash'} /><span>{T[k].label}</span></button>)}
          </div>
        ) : null;
      })}
    </>
  );

  return (
    <div id="app">
      <header className="top">
        <div className="tl">
          <button className="ib menu" onClick={() => setDrawer(!drawer)} aria-label="Menu">{<Icon n={drawer ? 'x' : 'menu'} s={20} />}</button>
          <div className="brand"><span className="logo">R</span><b>RUtus<i>dev</i></b></div>
          <span className="sub">Dashboard Administrator</span>
        </div>
        <div className="tr">
          <a className="soft" href="/" target="_blank" rel="noopener noreferrer"><span>Lihat Situs</span><Icon n="ext" s={14} /></a>
          <div className="who">
            <span className="av">{initials}</span>
            <div><b>{me.name || me.email}</b><small><Icon n="shield" s={12} />{L(me.role)}</small></div>
          </div>
          <button className="ib out" onClick={logout} title="Keluar dari akun" aria-label="Keluar"><Icon n="out" s={18} /></button>
        </div>
      </header>
      <div className="body">
        <aside className="side"><nav>{menu}</nav>
          <div className="foot"><b>RUtusdev Admin</b><span>Prospek, proyek, keuangan &amp; konten dalam satu panel.</span></div>
        </aside>
        {drawer && (
          <div className="drawer">
            <div className="shade" onClick={() => setDrawer(false)} />
            <div className="sheet"><nav>{menu}</nav><button className="g wide" onClick={logout}>Keluar Akun</button></div>
          </div>
        )}
        <main>
          <div className="wrap">
            {mustMfa && <p className="banner">Akun ini wajib memakai verifikasi 2 langkah. Aktifkan MFA di bawah untuk membuka menu lainnya.</p>}
            {t.dash ? <Dashboard can={can} onNav={go} />
              : t.security ? <Security me={me} can={can} onChanged={load} onLogout={logout} />
              : t.pipeline ? <Pipeline can={can} />
              : t.media ? <Media can={can} />
              : t.settings ? <Settings can={can} />
              : <Crud key={cur} tab={cur} can={can} />}
          </div>
        </main>
      </div>
    </div>
  );
}
