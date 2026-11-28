import { SERVICE_LABELS } from '../../../shared/formOptions';
export const ACT: Record<string, string> = { create: 'Membuat', update: 'Mengubah', delete: 'Menghapus', upload: 'Mengunggah', convert: 'Mengonversi' };
export const ACT2: Record<string, string> = { export: 'Mengunduh', login: 'Masuk', logout_all: 'Keluar semua perangkat', access: 'Akses', read: 'Membaca', origin_check: 'Cek asal permintaan',
  mfa: 'Verifikasi MFA', mfa_enroll: 'Mendaftarkan MFA', mfa_enable: 'Mengaktifkan MFA', mfa_disable: 'Menonaktifkan MFA' };
export const SVC: Record<string, string> = SERVICE_LABELS;
export const ENT: Record<string, string> = { auth: 'Autentikasi', admin: 'Panel admin', settings: 'Pengaturan', media: 'Media', 'security/admins': 'Daftar admin', 'security/logs': 'Log keamanan' };
// Ringkas user agent menjadi "Browser · OS"; teks lengkap ada di tooltip.
export const uaShort = (s?: string) => {
  s = s || ''; if (!s) return '–';
  const b = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Lainnya';
  const o = /Windows/.test(s) ? 'Windows' : /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : '';
  return b + (o ? ' · ' + o : '');
};
