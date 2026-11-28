// Katalog layanan RUtusdev (sumber: PDF "Katalog Layanan Website & Aplikasi").
// Satu sumber data untuk: kartu di landing (web/src/Catalog.tsx), halaman anak /layanan/* (worker/katalogPages.ts), dan chatbot.
// Murni data: tanpa React, DOM, maupun API Worker. Hanya harga jual yang tampil; biaya pokok/margin internal TIDAK boleh ada di sini.

export interface KItem {
  n: string;            // nama paket / fitur
  d?: string;           // cakupan
  lo?: number;          // harga terendah (IDR)
  hi?: number;          // harga tertinggi (IDR)
  from?: boolean;       // "Mulai Rp…"
  plus?: boolean;       // "Rp… – Rp…+"
  per?: string;         // satuan berulang, mis. "/bulan"
  txt?: string;         // teks harga bebas (mis. "Penawaran khusus"); menggantikan angka
  sub?: string;         // keterangan singkat di bawah harga (mis. "tergantung kompleksitas")
  tiers?: string[][];   // fitur per tingkat kompleksitas: [dasar, menengah, kompleks]
}
export const TIER_LABELS = ['Dasar', 'Menengah', 'Kompleks'];
export const TIER_HINTS = ['mendekati batas bawah', 'di rentang tengah', 'mendekati batas atas / perlu analisis'];

// Isi ikon (SVG 24×24, garis) per kategori; dipakai kartu landing (React) dan halaman server.
export const ICON_SVG: Record<string, string> = {
  page: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7 14h6M7 17h3"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16M13 9h5M13 13h5M13 17h3"/>',
  cart: '<path d="M3 4h2.2l2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  app: '<rect x="3" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="M17.2 14v6.5M14 17.2h6.5"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.6a4.5 4.5 0 0 1-.5 8.9H7Z"/><path d="M12 12v4.5m0 0-1.8-1.8M12 16.5l1.8-1.8"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 2.8 7.6 7 9.5 4.2-1.9 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  plus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5"/>',
  flow: '<circle cx="5.5" cy="6" r="2.2"/><circle cx="18.5" cy="12" r="2.2"/><circle cx="5.5" cy="18" r="2.2"/><path d="M7.7 6h4.8a3 3 0 0 1 3 3v.8M7.7 18h4.8a3 3 0 0 0 3-3v-.8"/>',
};
export interface KGroup { title?: string; intro?: string; items: KItem[] }
export interface KCat {
  slug: string;
  kind: 'price' | 'security' | 'terms';
  no: string;           // nomor bagian pada katalog
  title: string;        // judul lengkap
  short: string;        // judul pendek untuk kartu
  icon: string;         // kunci ikon (Catalog.tsx)
  headline: string;     // ringkasan harga/jaminan di kartu
  summary: string;
  points: string[];     // 3 sorotan di kartu
  audience?: string;    // "Cocok untuk"
  groups: KGroup[];
  notes: string[];
  seo: { title: string; desc: string };
}

const rb = (n: number) => n.toLocaleString('id-ID');
export function price(i: KItem): string {
  if (i.txt) return i.txt;
  const per = i.per || '';
  if (i.lo == null) return '';
  if (i.hi != null) return `Rp${rb(i.lo)} – Rp${rb(i.hi)}${i.plus ? '+' : ''}${per}`;
  return `${i.from ? 'Mulai ' : ''}Rp${rb(i.lo)}${i.plus ? '+' : ''}${per}`;
}

export const KATALOG: KCat[] = [
  {
    slug: 'website-statis', kind: 'price', no: '01', title: 'Website statis & company profile', short: 'Website statis & company profile', icon: 'page',
    headline: 'Rp300 rb – Rp3 jt', summary: 'Kehadiran online, informasi layanan, dan portofolio tanpa sistem transaksi atau database kompleks.',
    points: ['Landing page sampai company profile 8 halaman', 'Responsif, tombol WhatsApp, SEO dasar', 'Hosting statis bisa Rp0 tambahan'],
    audience: 'UMKM, kontraktor, jasa profesional, bengkel, usaha lokal, organisasi, dan profil perusahaan.',
    groups: [{ items: [
      { n: 'Landing Page Basic', lo: 300000, hi: 500000, d: 'Satu halaman; informasi usaha; layanan/produk; tombol WhatsApp; tampilan responsif.' },
      { n: 'Landing Page Business', lo: 750000, hi: 1250000, d: 'Desain lebih disesuaikan; beberapa bagian konten; CTA; formulir kontak sederhana.' },
      { n: 'Company Profile', lo: 1000000, hi: 1750000, d: '3–5 halaman; profil; layanan; galeri; kontak; tampilan responsif.' },
      { n: 'Company Profile Professional', lo: 1750000, hi: 2500000, d: '5–8 halaman; desain lebih khusus; struktur konten; SEO dasar; optimasi dasar.' },
      { n: 'Product Catalog Website', lo: 1500000, hi: 3000000, d: 'Katalog produk; kategori; detail produk; tombol pemesanan/WhatsApp.' },
    ] }],
    notes: ['Harga entry-level mengasumsikan materi teks dan gambar disediakan pelanggan, memakai komponen/template yang sesuai, dan revisi dibatasi dalam kesepakatan proyek.'],
    seo: { title: 'Jasa Website Statis & Company Profile — Harga | RUtusdev', desc: 'Landing page mulai Rp300.000, company profile Rp1–2,5 juta, katalog produk Rp1,5–3 juta. Responsif, SEO dasar, estimasi transparan dari RUtusdev.' },
  },
  {
    slug: 'website-dinamis', kind: 'price', no: '02', title: 'Website dinamis & panel admin', short: 'Website dinamis & panel admin', icon: 'panel',
    headline: 'Rp2 jt – Rp8 jt', summary: 'Konten dan data yang bisa Anda kelola sendiri lewat panel admin: dari blog dan sekolah sampai sistem multi-role.',
    points: ['Login admin, CRUD data, dashboard', 'Blog, berita, dan website sekolah', 'Multi-role, hak akses, laporan, ekspor'],
    groups: [{ items: [
      { n: 'Blog / News Website', lo: 2000000, hi: 3500000, d: 'Artikel/kategori; halaman berita; penulis; panel admin untuk kelola konten.' },
      { n: 'School Website', lo: 2500000, hi: 4000000, d: 'Profil sekolah; berita; informasi; galeri; panel pengelolaan konten.' },
      { n: 'Dynamic Basic', lo: 2000000, hi: 3000000, d: 'Login admin; tambah/ubah/hapus data dasar; dashboard sederhana.' },
      { n: 'Dynamic Business', lo: 3500000, hi: 5000000, d: 'Panel admin; kategori; pencarian; pengelolaan data.' },
      { n: 'Dynamic Professional', lo: 5000000, hi: 8000000, d: 'Multi-role; hak akses; laporan; ekspor data; alur kerja lebih kompleks.' },
    ] }],
    notes: ['Admin panel sederhana berbeda dari sistem administrasi multi-role. Hak akses, workflow, audit log, laporan, dan ekspor data dihitung berdasarkan kompleksitas.'],
    seo: { title: 'Jasa Website Dinamis & Panel Admin — Harga | RUtusdev', desc: 'Website blog, sekolah, dan panel admin multi-role Rp2–8 juta. Kelola konten dan data sendiri, aman, dan mudah dirawat.' },
  },
  {
    slug: 'toko-online', kind: 'price', no: '03', title: 'Toko online & e-commerce', short: 'Toko online & e-commerce', icon: 'cart',
    headline: 'Rp3 jt – Rp15 jt+', summary: 'Dari katalog dengan pemesanan WhatsApp sampai toko lengkap dengan payment gateway, stok, dan laporan transaksi.',
    points: ['Pemesanan via WhatsApp atau checkout penuh', 'Payment gateway, stok, laporan transaksi', 'Add-on modular sesuai kebutuhan'],
    groups: [
      { title: 'Paket toko online', items: [
        { n: 'Store Starter', lo: 3000000, hi: 4000000, d: 'Katalog produk; kategori; tombol pemesanan melalui WhatsApp.' },
        { n: 'Store Business', lo: 6000000, hi: 8000000, d: 'Keranjang; checkout; pengelolaan pesanan dasar.' },
        { n: 'Store Professional', lo: 10000000, hi: 15000000, d: 'Payment gateway; stok; laporan transaksi; bergantung pada penyedia pihak ketiga.' },
        { n: 'Store Custom', lo: 15000000, from: true, d: 'Multi-role; promosi kompleks; integrasi khusus; ruang lingkup melalui analisis.' },
      ] },
      { title: 'Add-on e-commerce & integrasi', intro: 'Tambahkan fitur satu per satu sesuai kebutuhan toko Anda.', items: [
        { n: 'Keranjang belanja', lo: 750000, hi: 1500000 },
        { n: 'Checkout', lo: 750000, hi: 1500000 },
        { n: 'Manajemen pesanan', lo: 1000000, hi: 2000000 },
        { n: 'Integrasi payment gateway', lo: 1500000, hi: 3000000 },
        { n: 'Integrasi pengiriman', lo: 1000000, hi: 2500000 },
        { n: 'Manajemen stok', lo: 750000, hi: 1500000 },
        { n: 'Laporan transaksi', lo: 1000000, hi: 2000000 },
        { n: 'Otomatisasi WhatsApp', lo: 750000, hi: 2000000 },
      ] },
    ],
    notes: ['Biaya transaksi payment gateway, provider WhatsApp, SMS, email premium, ongkir/API, dan biaya pihak ketiga lainnya dibayar terpisah oleh pelanggan sesuai tagihan penyedia masing-masing.'],
    seo: { title: 'Jasa Pembuatan Toko Online & E-commerce — Harga | RUtusdev', desc: 'Toko online mulai Rp3 juta: katalog WhatsApp, keranjang & checkout, payment gateway, stok, dan laporan. Add-on modular, harga transparan.' },
  },
  {
    slug: 'aplikasi-web', kind: 'price', no: '04', title: 'Aplikasi web & sistem informasi', short: 'Aplikasi web & sistem informasi', icon: 'app',
    headline: 'Rp1 jt – Rp12 jt+', summary: 'Sistem yang mengikuti alur kerja Anda: absensi, inventaris, keuangan, CRM, bengkel, sekolah, LMS, hingga aplikasi custom. Harga mengikuti kompleksitas dan fitur.',
    points: ['9 jenis sistem, tiap jenis punya 3 tingkat kompleksitas', 'Harga menyesuaikan fitur yang dipilih', 'Aplikasi custom Rp8–15 jt+'],
    groups: [{ intro: 'Buka tiap kartu untuk melihat contoh fitur per tingkat kompleksitas. Makin banyak fitur dan integrasi, harga makin mendekati batas atas.', items: [
      { n: 'Sistem absensi', lo: 1000000, hi: 5000000, sub: 'tergantung kompleksitas', d: 'Presensi, rekap, filter periode, ekspor laporan.', tiers: [
        ['Login pengguna', 'Presensi harian', 'Rekap sederhana'], ['Filter periode', 'Ekspor laporan', 'Dashboard rekap'], ['Beberapa peran (admin, atasan, karyawan)', 'Jadwal/shift, izin, dan cuti', 'Banyak lokasi atau cabang']] },
      { n: 'Pendaftaran online', lo: 2000000, hi: 5000000, sub: 'tergantung kompleksitas', d: 'Formulir, unggah berkas, status pendaftaran, panel admin.', tiers: [
        ['Formulir pendaftaran', 'Data pendaftar', 'Panel admin sederhana'], ['Unggah berkas', 'Status pendaftaran', 'Filter dan ekspor data'], ['Beberapa jalur/gelombang pendaftaran', 'Verifikasi bertahap', 'Notifikasi dan integrasi pihak ketiga']] },
      { n: 'Inventaris', lo: 3000000, hi: 7500000, sub: 'tergantung kompleksitas', d: 'Data barang, stok, mutasi, laporan.', tiers: [
        ['Data barang', 'Stok masuk dan keluar'], ['Mutasi barang', 'Kategori', 'Laporan stok'], ['Beberapa gudang/cabang', 'Hak akses berbasis peran', 'Audit log dan laporan lanjutan']] },
      { n: 'Keuangan', lo: 3000000, hi: 7500000, sub: 'tergantung kompleksitas', d: 'Pencatatan transaksi, kategori, laporan dasar.', tiers: [
        ['Pencatatan pemasukan dan pengeluaran', 'Kategori transaksi'], ['Laporan dasar per periode', 'Ekspor laporan'], ['Beberapa akun/kas', 'Anggaran dan persetujuan', 'Hak akses dan audit log']] },
      { n: 'CRM', lo: 3000000, hi: 7500000, sub: 'tergantung kompleksitas', d: 'Data pelanggan, tindak lanjut, riwayat interaksi.', tiers: [
        ['Data pelanggan', 'Riwayat interaksi'], ['Tindak lanjut dan pengingat', 'Status prospek', 'Pencarian dan filter'], ['Alur penjualan banyak tim', 'Hak akses dan laporan', 'Integrasi WhatsApp/email']] },
      { n: 'Sistem bengkel', lo: 3000000, hi: 7500000, sub: 'tergantung kompleksitas', d: 'Data pelanggan/kendaraan, servis, status pekerjaan, transaksi.', tiers: [
        ['Data pelanggan dan kendaraan', 'Pencatatan servis'], ['Status pekerjaan', 'Transaksi dan riwayat servis'], ['Stok suku cadang', 'Beberapa cabang', 'Laporan dan notifikasi otomatis']] },
      { n: 'Sistem informasi sekolah', lo: 5000000, hi: 10000000, sub: 'tergantung kompleksitas', d: 'Modul data sekolah (siswa, kelas, pengguna, administrasi) sesuai kebutuhan dan hak akses.', tiers: [
        ['Data siswa', 'Data kelas', 'Pengguna dasar'], ['Administrasi sekolah', 'Hak akses admin dan guru', 'Laporan'], ['Modul tambahan (nilai, absensi, keuangan sekolah)', 'Banyak peran pengguna', 'Ekspor dan laporan lanjutan']] },
      { n: 'LMS', lo: 5000000, hi: 12000000, sub: 'tergantung kompleksitas', d: 'Materi, kelas, tugas, evaluasi, pengguna, progres belajar.', tiers: [
        ['Kelas dan materi', 'Pengguna (pengajar dan siswa)'], ['Tugas', 'Evaluasi/kuis', 'Progres belajar'], ['Banyak peran dan kelas', 'Laporan lanjutan', 'Integrasi dan jumlah pengguna besar (melalui analisis)']] },
      { n: 'Aplikasi web custom', lo: 8000000, hi: 15000000, plus: true, d: 'Fitur dan modul khusus berdasarkan analisis kebutuhan.' },
    ] }],
    notes: ['Rincian fitur per tingkat kompleksitas adalah contoh cakupan untuk membantu memperkirakan biaya. Harga akhir ditetapkan setelah analisis kebutuhan.', 'Sistem multi-modul, multi-cabang, multi-tenant, integrasi kompleks, atau jumlah pengguna besar wajib melalui analisis kebutuhan dan penawaran khusus.'],
    seo: { title: 'Jasa Pembuatan Aplikasi Web & Sistem Informasi — Harga | RUtusdev', desc: 'Sistem absensi mulai Rp1 juta, pendaftaran online Rp2–5 juta, inventaris, keuangan, CRM, bengkel Rp3–7,5 juta, sekolah dan LMS Rp5–12 juta. Harga sesuai kompleksitas.' },
  },
  {
    slug: 'cloud-server', kind: 'price', no: '05', title: 'Cloud hosting & server', short: 'Cloud hosting & server', icon: 'cloud',
    headline: 'Rp0 – Rp350 rb+/bln', summary: 'Infrastruktur berbayar hanya jika kebutuhan trafik, database, penyimpanan, atau isolasi sistem memang memerlukannya.',
    points: ['Website ringan: Rp0 biaya tambahan', 'Cloud Business, Advanced, Dedicated', 'Upgrade hanya setelah persetujuan Anda'],
    groups: [{ items: [
      { n: 'Cloud Basic', txt: 'Rp0 biaya tambahan', d: 'Website statis/ringan memakai infrastruktur gratis sesuai kuota dan ketentuan provider (SSL, CDN).' },
      { n: 'Cloud Business', lo: 125000, per: '/bulan', d: 'Aplikasi dinamis ringan; API/database bersama; pemakaian wajar.' },
      { n: 'Cloud Advanced', lo: 200000, per: '/bulan', d: 'Database lebih aktif; kebutuhan backup dan monitoring lebih intensif.' },
      { n: 'Cloud Dedicated', lo: 350000, from: true, per: '/bulan', d: 'Kebutuhan isolasi infrastruktur/database; kapasitas disesuaikan.' },
      { n: 'Custom Server', txt: 'Penawaran khusus', d: 'VPS/server khusus, resource dan konfigurasi sesuai kebutuhan.' },
    ] }],
    notes: ['Biaya cloud/server adalah biaya layanan pengelolaan infrastruktur, bukan biaya resmi provider dan bukan janji kapasitas tanpa batas.', 'Batas request, CPU, database, storage, bandwidth/egress, backup, dan jumlah pengguna ditetapkan sesuai provider dan paket aktual. Upgrade dilakukan setelah persetujuan pelanggan.'],
    seo: { title: 'Cloud Hosting & Server Aplikasi — Harga Bulanan | RUtusdev', desc: 'Cloud Basic Rp0, Business Rp125.000, Advanced Rp200.000, Dedicated mulai Rp350.000 per bulan. Bayar infrastruktur hanya jika dibutuhkan.' },
  },
  {
    slug: 'pemeliharaan', kind: 'price', no: '06', title: 'Pemeliharaan & dukungan', short: 'Pemeliharaan & dukungan', icon: 'shield',
    headline: 'Rp75 rb – Rp350 rb/bln', summary: 'Pemeriksaan berkala, monitoring, backup, dan penanganan kendala agar website dan aplikasi tetap sehat setelah live.',
    points: ['Basic, Business, Priority, Custom SLA', 'Monitoring dan pemeriksaan keamanan', 'Koordinasi pemulihan dan laporan ringkas'],
    groups: [{ items: [
      { n: 'Basic', lo: 75000, hi: 100000, per: '/bulan', d: 'Pemeriksaan dasar; monitoring ringan; bantuan teknis terbatas; pembaruan minor yang aman.' },
      { n: 'Business', lo: 150000, hi: 200000, per: '/bulan', d: 'Monitoring berkala; pemeriksaan keamanan dasar; backup sesuai konfigurasi; dukungan lebih responsif.' },
      { n: 'Priority', lo: 250000, hi: 350000, per: '/bulan', d: 'Prioritas penanganan; pemeriksaan lebih rutin; koordinasi pemulihan dan laporan ringkas.' },
      { n: 'Custom', txt: 'Sesuai SLA', d: 'Untuk aplikasi kritis, jam dukungan khusus, target respons, dan kebutuhan operasional khusus.' },
    ] }],
    notes: ['Pemeliharaan tidak mencakup pembuatan fitur baru, perubahan besar desain/alur, penambahan modul, migrasi besar, biaya layanan pihak ketiga, atau pekerjaan di luar ruang lingkup paket.'],
    seo: { title: 'Maintenance Website & Aplikasi — Harga Bulanan | RUtusdev', desc: 'Paket maintenance Basic Rp75–100 rb, Business Rp150–200 rb, Priority Rp250–350 rb per bulan. Monitoring, keamanan dasar, dan dukungan teknis.' },
  },
  {
    slug: 'layanan-tambahan', kind: 'price', no: '07', title: 'Layanan tambahan', short: 'Layanan tambahan', icon: 'plus',
    headline: 'Mulai Rp100 rb', summary: 'Domain, migrasi, pelatihan admin, integrasi API, audit keamanan, hingga PWA — dipilih hanya saat dibutuhkan.',
    points: ['Setup domain/DNS dan migrasi website', 'Audit keamanan mulai Rp750 rb', 'PWA mulai Rp3,5 jt'],
    groups: [{ items: [
      { n: 'Setup domain/DNS', lo: 100000, hi: 200000 },
      { n: 'Migrasi website', lo: 250000, from: true },
      { n: 'Input konten awal', txt: 'Berdasarkan jumlah/volume' },
      { n: 'Pelatihan admin', lo: 250000, from: true },
      { n: 'Integrasi API eksternal', lo: 1000000, from: true },
      { n: 'Audit keamanan', lo: 750000, from: true },
      { n: 'Modul tambahan', txt: 'Berdasarkan kompleksitas' },
      { n: 'PWA (Progressive Web App)', lo: 3500000, from: true },
    ] }],
    notes: ['Domain tidak termasuk harga pengembangan. Domain idealnya didaftarkan atas nama dan akun pelanggan; biaya registrasi dan perpanjangan dibayar terpisah.'],
    seo: { title: 'Layanan Tambahan Website: Domain, Migrasi, Audit, PWA | RUtusdev', desc: 'Setup domain/DNS, migrasi website, pelatihan admin, integrasi API, audit keamanan mulai Rp750.000, dan PWA mulai Rp3,5 juta.' },
  },
  {
    slug: 'keamanan-garansi', kind: 'security', no: '08', title: 'Keamanan, garansi bug & tanggung jawab', short: 'Keamanan & garansi', icon: 'lock',
    headline: 'Garansi bug 30 hari', summary: 'Keamanan dibangun sejak awal, dengan tanggung jawab teknis yang jelas dan batas jaminan yang jujur.',
    points: ['Garansi perbaikan bug 30 hari kalender', 'Insiden akibat kesalahan kami ditangani tanpa biaya', 'Batas jaminan dijelaskan terbuka'],
    groups: [],
    notes: [],
    seo: { title: 'Jaminan Keamanan, Garansi Bug & Tanggung Jawab | RUtusdev', desc: 'Garansi bug 30 hari, penanganan insiden keamanan tanpa biaya bila akibat kesalahan implementasi, dan standar keamanan yang diterapkan RUtusdev.' },
  },
  {
    slug: 'ketentuan', kind: 'terms', no: '09', title: 'Ketentuan kerja sama & alur pengembangan', short: 'Ketentuan & alur kerja', icon: 'flow',
    headline: 'DP 50% · 30% · 20%', summary: 'Ruang lingkup, pembayaran, revisi, dan serah terima ditulis jelas sejak penawaran, sehingga Anda tahu apa yang dibayar dan dijamin.',
    points: ['5 tahap: konsultasi sampai garansi', 'Pembayaran bertahap yang disarankan', 'Revisi dan serah terima tertulis'],
    groups: [],
    notes: [],
    seo: { title: 'Ketentuan Kerja Sama, Pembayaran & Alur Pengembangan | RUtusdev', desc: 'Skema pembayaran 50% uang muka, 30% setelah demo, 20% sebelum serah terima. Alur konsultasi, penawaran, pengembangan, UAT, dan garansi.' },
  },
];

export const KATALOG_NOTE = 'Harga dalam Rupiah (IDR), merupakan estimasi penawaran awal. Harga final mengikuti analisis kebutuhan, konten, integrasi, jumlah pengguna, dan kompleksitas.';

export const PRINSIP: [string, string][] = [
  ['Harga sesuai ruang lingkup', 'Harga berdasarkan kategori dan ruang lingkup yang disepakati. Tidak ada fitur tambahan di luar kesepakatan yang dianggap otomatis termasuk.'],
  ['Keamanan sejak awal', 'Praktik coding aman, kontrol akses, validasi input, konfigurasi, dan pengujian sesuai jenis proyek.'],
  ['Tanggung jawab teknis jelas', 'Bug atau insiden yang terbukti disebabkan kesalahan implementasi penyedia diperbaiki tanpa biaya tambahan sesuai ketentuan garansi.'],
  ['Infrastruktur fleksibel', 'Website statis ringan dapat memakai layanan gratis sesuai kuota dan ketentuan penyedia; cloud berbayar hanya jika dibutuhkan.'],
];

// Bagian 8 katalog
export const KEAMANAN: [string, string][] = [
  ['Akun & akses', 'Hak akses berbasis peran; prinsip least privilege; pengamanan akun admin; tidak membagikan kredensial.'],
  ['Data & database', 'Validasi input; pembatasan akses data; penerapan RLS/otorisasi server bila relevan; pemisahan data pelanggan/tenant.'],
  ['Rahasia sistem', 'API key dan secret disimpan di environment/server; secret sensitif tidak ditanam di frontend atau repositori publik.'],
  ['Aplikasi & API', 'Validasi sisi server; pemeriksaan otorisasi; proteksi endpoint; rate limiting sesuai kebutuhan; penanganan error yang tidak membocorkan detail sensitif.'],
  ['Rilis & pemeliharaan', 'Pemeriksaan dependency dan konfigurasi; pengujian fungsi utama; pembaruan keamanan yang kompatibel; backup dan uji pemulihan sesuai paket.'],
  ['Komunikasi insiden', 'Pemberitahuan kepada pelanggan; isolasi masalah; investigasi akar masalah; pemulihan dan catatan tindakan.'],
];
export const KEAMANAN_NOTE = 'Kontrol yang digunakan menyesuaikan teknologi, risiko, dan paket. Audit penetrasi independen, sertifikasi, pemantauan SOC 24/7, WAF berbayar, serta disaster recovery tingkat enterprise tidak otomatis termasuk kecuali tertulis dalam kontrak.';

// Bagian 9 katalog
export const GARANSI: [string, string, string][] = [
  ['A', 'Garansi bug setelah serah terima', 'Garansi perbaikan bug berlaku selama 30 hari kalender sejak serah terima/website dinyatakan live, kecuali proposal menyebut masa yang lebih panjang. Bug adalah fungsi yang tidak berjalan sesuai spesifikasi tertulis dan dapat direproduksi. Perbaikan bug yang berasal dari pekerjaan penyedia dilakukan tanpa biaya tambahan.'],
  ['B', 'Jika website diretas atau terjadi insiden keamanan', 'Penyedia bertanggung jawab melakukan pemeriksaan dan penanganan tanpa biaya tambahan apabila investigasi menunjukkan insiden disebabkan oleh kesalahan kode, konfigurasi, kontrol akses, atau kelalaian implementasi yang menjadi tanggung jawab penyedia. Penanganan meliputi pembatasan dampak, perbaikan celah, pemulihan dari backup yang tersedia, dan pengujian ulang sesuai kondisi teknis.'],
  ['C', 'Kewajiban penyedia', 'Menerima laporan; melakukan triase; menjelaskan temuan awal; memperbaiki penyebab yang berada dalam kendali penyedia; serta menyampaikan ringkasan tindakan. Target respons dan jam dukungan mengikuti paket/SLA yang disepakati. Jika tidak ada SLA tertulis, penanganan dilakukan pada jam kerja dengan prioritas berdasarkan tingkat dampak.'],
  ['D', 'Kondisi yang tidak otomatis menjadi tanggung jawab penyedia', 'Insiden akibat password/OTP/API key pelanggan bocor; perangkat/email pelanggan diambil alih; tindakan pelanggan atau pihak lain; plugin/kode yang dipasang pihak lain; perubahan langsung di server/database tanpa persetujuan; layanan cloud/domain/provider pihak ketiga bermasalah; serangan yang mengeksploitasi celah baru pada layanan eksternal; atau force majeure. Penyedia tetap dapat membantu investigasi dan pemulihan, tetapi biaya pihak ketiga atau pekerjaan di luar kendali penyedia dapat ditagihkan setelah persetujuan pelanggan.'],
  ['E', 'Batas jaminan yang jujur', 'Tidak ada sistem yang dapat dijamin 100% bebas dari peretasan, gangguan, kehilangan data, atau downtime. Jaminan ini adalah komitmen standar pengamanan, respons, dan perbaikan atas kesalahan yang menjadi tanggung jawab penyedia, bukan janji bahwa serangan tidak akan pernah terjadi. Pemulihan data bergantung pada keberadaan, kondisi, dan jadwal backup yang termasuk dalam paket.'],
];

// Bagian 11 & 12 katalog
export const KETENTUAN: string[] = [
  'Biaya pengembangan dibayar satu kali sesuai ruang lingkup, spesifikasi, dan hasil akhir yang disepakati.',
  'Domain tidak termasuk harga pengembangan. Domain idealnya didaftarkan atas nama dan akun pelanggan; biaya registrasi/perpanjangan dibayar terpisah.',
  'Cloud/server berbayar hanya diterapkan apabila kebutuhan aplikasi melampaui kemampuan paket gratis atau membutuhkan resource/isolasi khusus.',
  'Biaya pihak ketiga seperti payment gateway, WhatsApp API, email/SMS, peta, lisensi, dan layanan eksternal menjadi tanggungan pelanggan.',
  'Revisi desain/konten dibatasi sesuai proposal. Perubahan kebutuhan atau fitur di luar ruang lingkup dihitung sebagai pekerjaan tambahan.',
  'Source code, akses admin, dokumentasi, dan hak penggunaan/serah terima ditentukan secara tertulis dalam proposal.',
  'Pelanggan wajib menjaga kerahasiaan akun, password, OTP, dan akses admin; menggunakan password kuat; serta memberi tahu penyedia jika ada dugaan kompromi.',
  'Backup, frekuensi backup, retensi, lokasi penyimpanan, dan uji pemulihan harus dicantumkan pada paket/proposal. Backup bukan pengganti pengamanan akun pelanggan.',
  'Garansi bug dan tanggung jawab keamanan berlaku sesuai bagian jaminan dan tidak menghapus kewajiban pelanggan menjaga akun serta menggunakan sistem sesuai petunjuk.',
];
export const PEMBAYARAN: [string, number, string][] = [
  ['Uang muka', 50, 'Setelah penawaran dan ruang lingkup disetujui'],
  ['Demo / staging', 30, 'Setelah fungsi utama dapat diuji'],
  ['Pelunasan', 20, 'Sebelum serah terima dan publikasi final'],
];
export const ALUR: [string, string][] = [
  ['Konsultasi', 'Identifikasi tujuan, pengguna, fitur, data, integrasi, dan kebutuhan hosting.'],
  ['Penawaran', 'Ruang lingkup, harga, timeline, batas revisi, SLA, garansi, dan biaya pihak ketiga dituangkan tertulis.'],
  ['Pengembangan', 'Pembuatan desain dan fungsi; demo bertahap; pengujian sesuai spesifikasi.'],
  ['Uji & serah terima', 'UAT bersama pelanggan; perbaikan temuan; penyerahan akses/dokumentasi sesuai kesepakatan.'],
  ['Garansi & pemeliharaan', 'Masa garansi bug; pemeliharaan berkala bila dipilih; penanganan insiden mengikuti ketentuan.'],
];
export const KATALOG_CLOSING = 'Dokumen ini merupakan katalog harga dan ketentuan awal. Perjanjian kerja/proposal proyek menjadi dokumen acuan final apabila terdapat rincian yang lebih spesifik.';

export const katalogBySlug = (s: string) => KATALOG.find(k => k.slug === s);
