import { api } from './api';
import { T, rp } from './meta';
import { ACT, SVC } from './util';
import { useLoad, Status } from './ui';
import type { Row } from './types';

const mk = (y: number, mo: number) => `${y}-${String(mo + 1).padStart(2, '0')}`;
const group = (arr: Row[], f: (x: Row) => string | undefined, lab: (k: string) => string = k => k): [string, number][] => {
  const g: Record<string, number> = {};
  arr.forEach(x => { const k = lab(f(x) || '(tanpa data)'); g[k] = (g[k] || 0) + 1; });
  return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 6);
};
function HBars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return rows.length ? <>{rows.map(([k, n]) => <div className="hb" key={k}><span>{k}</span><i style={{ width: `${Math.max(4, 100 * n / max)}%` }} /><b>{n}</b></div>)}</> : <p className="dim">Belum ada data.</p>;
}

export default function Dashboard() {
  const { data, err } = useLoad(async () => {
    const names = ['leads', 'deals', 'invoices', 'proposals', 'tasks', 'activity_logs'];
    const r = await Promise.all(names.map(x => api<Row[]>(x).catch(e => { if (x === 'activity_logs') return [] as Row[]; throw e; })));
    return r;
  }, []);
  if (!data) return <><h1>Ringkasan</h1><Status err={err} loading /></>;
  const [leads, deals, invs, props, tasks, logs] = data;
  const now = new Date(), ym = mk(now.getFullYear(), now.getMonth());
  const today = now.toISOString().slice(0, 10), week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), ago7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const tot = (i: Row) => ((i.items || []) as Row[]).reduce((a, x) => a + x.qty * x.price, 0), val = (d: Row) => Number(d.value || 0);
  const open = deals.filter(d => !['menang', 'kalah'].includes(d.stage)), won = deals.filter(d => d.stage === 'menang'), lost = deals.filter(d => d.stage === 'kalah');
  const unpaid = invs.filter(i => ['terkirim', 'dibayar_sebagian'].includes(i.status));
  const piut = unpaid.reduce((a, i) => a + tot(i) - Number(i.paid_amount || 0), 0);
  const lewat = unpaid.filter(i => i.due_date && i.due_date < today), pending = tasks.filter(t => t.status !== 'selesai');
  const tlate = pending.filter(t => t.due_date && t.due_date < today), tsoon = pending.filter(t => t.due_date && t.due_date >= today && t.due_date <= week);
  const sent = props.filter(p => p.status === 'terkirim'), stale = sent.filter(p => (p.created_at || '') < ago7);
  const winRate = won.length + lost.length ? Math.round(100 * won.length / (won.length + lost.length)) + '%' : '–';
  const conv = leads.length ? Math.round(100 * deals.filter(d => d.source === 'website').length / leads.length) + '%' : '–';
  const kpi: [string, string | number, string, number?][] = [
    ['Prospek baru', leads.filter(l => l.status === 'new').length, `${leads.filter(l => (l.created_at || '').startsWith(ym)).length} masuk bulan ini`],
    ['Peluang aktif', open.length, rp(open.reduce((a, d) => a + val(d), 0))],
    ['Nilai menang', rp(won.reduce((a, d) => a + val(d), 0)), `${won.length} proyek`],
    ['Win rate', winRate, `${won.length} menang · ${lost.length} kalah`],
    ['Konversi prospek', conv, 'prospek website → peluang'],
    ['Piutang', rp(piut), `${lewat.length} lewat jatuh tempo`, lewat.length],
    ['Penawaran terkirim', sent.length, `${props.filter(p => p.status === 'draft').length} masih draft`],
    ['Tugas terlambat', tlate.length, `${tsoon.length} jatuh tempo ≤ 7 hari`, tlate.length]];
  const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return [mk(d.getFullYear(), d.getMonth()), d.toLocaleDateString('id-ID', { month: 'short' })] as const; });
  const per = months.map(([k]) => leads.filter(l => (l.created_at || '').slice(0, 7) === k).length), mx = Math.max(1, ...per);
  const attn: [string, string][] = [
    ...lewat.map((i): [string, string] => ['Faktur lewat jatuh tempo', `${i.number} · sisa ${rp(tot(i) - Number(i.paid_amount || 0))}`]),
    ...tlate.map((t): [string, string] => ['Tugas terlambat', `${t.title} · tenggat ${t.due_date}`]),
    ...stale.map((p): [string, string] => ['Penawaran perlu follow-up', `${p.number} · ${p.title}`])].slice(0, 8);
  return (
    <>
      <h1>Ringkasan</h1>
      <div className="kpis">{kpi.map(([l, v, s, w]) => <div key={l} className={'kpi' + (w ? ' warn' : '')}><small>{l}</small><b>{v}</b><span>{s}</span></div>)}</div>
      <div className="cols">
        <section className="box"><h3>Prospek 6 bulan terakhir</h3>
          <div className="trend">{per.map((n, i) => <div key={months[i][0]}><i style={{ height: `${Math.max(3, 100 * n / mx)}%` }} /><b>{n}</b><small>{months[i][1]}</small></div>)}</div></section>
        <section className="box"><h3>Perlu perhatian</h3>
          {attn.length ? attn.map(([k, v], i) => <div className="row" key={i}><div><b>{k}</b><small>{v}</small></div></div>) : <p className="dim">Tidak ada yang mendesak. 👍</p>}</section>
        <section className="box"><h3>Layanan paling diminati</h3><HBars rows={group(leads, l => l.service_interest, k => SVC[k] || k)} /></section>
        <section className="box"><h3>Sumber peluang</h3><HBars rows={group(deals, d => d.source)} /></section>
        <section className="box" style={{ gridColumn: '1/-1' }}><h3>Aktivitas terbaru</h3>
          {logs.slice(0, 8).map(l => <div className="row" key={l.id}><div>{ACT[l.action] || l.action} {T[l.entity]?.label || l.entity}</div>
            <small>{new Date(l.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div>)}
          {!logs.length && <p className="dim">Belum ada aktivitas.</p>}</section>
      </div>
      <p className="dim" style={{ marginTop: 16 }}>Dihitung dari 200 data terbaru per tabel. Statistik pengunjung website: buka Cloudflare → Analytics &amp; Logs → Web Analytics (token dipasang lewat CF_BEACON_TOKEN dan VITE_CF_BEACON_TOKEN).</p>
    </>
  );
}
