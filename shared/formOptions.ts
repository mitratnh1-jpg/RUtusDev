// Pilihan "Layanan" di formulir kontak: satu sumber untuk formulir (web/src/Contact.tsx), validasi Worker, notifikasi, dan dashboard admin.
// Paket diambil dari siteFacts, layanan dari katalog, jadi daftar ini selalu mengikuti data di kedua tempat itu.
import { KATALOG } from './katalog';
import { PACKAGES } from './siteFacts';

export interface FormOpt { value: string; label: string; hint: string; href: string }
export const KONSULTASI: FormOpt = { value: 'konsultasi', label: 'Belum tahu, ingin konsultasi', hint: '', href: '/layanan' };
export const PAKET_OPTS: FormOpt[] = PACKAGES.map(p => ({ value: 'paket-' + p.n.toLowerCase(), label: 'Paket ' + p.n, hint: p.pr, href: p.href }));
export const LAYANAN_OPTS: FormOpt[] = KATALOG.filter(k => k.kind === 'price').map(k => ({ value: k.slug, label: k.short, hint: k.headline, href: `/layanan/${k.slug}` }));

// Nilai lama tetap diterima agar prospek lama di database tetap punya label di dashboard.
const LEGACY: Record<string, string> = { website: 'Website / landing page', webapp: 'Aplikasi web', system: 'Sistem informasi', custom: 'Aplikasi custom' };
export const SERVICE_LABELS: Record<string, string> = {
  ...LEGACY, [KONSULTASI.value]: KONSULTASI.label,
  ...Object.fromEntries([...PAKET_OPTS, ...LAYANAN_OPTS].map(o => [o.value, o.label])),
};
export const SERVICE_VALUES = Object.keys(SERVICE_LABELS);
export const findOpt = (v: string): FormOpt | undefined => [...PAKET_OPTS, ...LAYANAN_OPTS].find(o => o.value === v);
