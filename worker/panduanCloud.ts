// Artikel panduan: "Jasa Pembuatan Website dan Aplikasi dengan Cloud Hosting Sesuai Kebutuhan Traffic dan Pengguna".
// Hanya tampil jika pengunjung membuka alamatnya (tidak ada di landing page). Dirender server, tanpa database.
// Tabel harga diambil dari shared/katalog.ts agar selalu sama dengan halaman /layanan.
import { KATALOG, price } from '../shared/katalog';

import { PANDUAN_SLUG, PANDUAN_PATH, PANDUAN_LABEL, PANDUAN_TITLE } from '../shared/panduanMeta';
export { PANDUAN_SLUG, PANDUAN_PATH, PANDUAN_LABEL };

const TITLE = 'Jasa Pembuatan Website & Aplikasi Profesional dengan Cloud Hosting';
const DESC = 'Layanan pembuatan website, company profile, toko online, dan aplikasi web dengan cloud hosting fleksibel. Ketahui batas traffic, jumlah pengguna, database, dan kebutuhan server sesuai skala bisnis.';
const H1 = PANDUAN_TITLE;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const p = (t: string) => `<p>${esc(t)}</p>`;
const ul = (a: string[]) => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
const ol = (a: string[]) => `<ol>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
const h2 = (id: string, t: string) => `<h2 id="${id}">${esc(t)}</h2>`;
const h3 = (t: string) => `<h3>${esc(t)}</h3>`;
const table = (head: string[], rows: string[][]) => `<div class="kt-tw" tabindex="0" role="region" aria-label="Tabel"><table class="kt-table"><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
// Infografis: WebP 836/1672 px (web/public/artikel), ukuran tetap dideklarasikan agar halaman tidak melompat saat gambar dimuat.
// Teks di dalam gambar kecil di ponsel, jadi gambar bisa diketuk untuk dibuka penuh (cubit untuk zoom) dan ringkasannya ditulis di caption (juga dibaca mesin pencari).
const IMG_W = 1672, IMG_H = 941;
const fig = (file: string, alt: string, cap: string, first = false) => {
  const src = `/artikel/${file}.webp`;
  return `<figure class="ar-fig"><a href="${src}" target="_blank" rel="noopener" aria-label="Buka gambar ukuran penuh: ${esc(alt)}"><img src="${src}" srcset="/artikel/${file}-836.webp 836w, ${src} 1672w" sizes="(min-width: 1120px) 1040px, calc(100vw - 40px)" width="${IMG_W}" height="${IMG_H}" alt="${esc(alt)}" ${first ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}></a><figcaption><span class="ar-fig-hint" aria-hidden="true">Ketuk gambar untuk memperbesar</span>${esc(cap)}</figcaption></figure>`;
};
const note = (t: string) => `<aside class="kt-note"><span aria-hidden="true">i</span><p>${esc(t)}</p></aside>`;

const FAQ: [string, string][] = [
  ['Apakah website company profile harus menggunakan server berbayar?', 'Tidak. Website company profile yang bersifat statis umumnya dapat menggunakan infrastruktur gratis sesuai kuota dan ketentuan provider.'],
  ['Apakah website bisa menampung 10.000 pengunjung per bulan tanpa server berbayar?', 'Bisa, khususnya website statis yang dioptimalkan dan menggunakan CDN. Namun, website dinamis dengan database dan aktivitas pengguna memerlukan evaluasi kapasitas backend.'],
  ['Berapa jumlah pengguna maksimal untuk Cloud Business?', 'Batas rekomendasi awal paket Cloud Business adalah 500 akun terdaftar dan maksimal 30 pengguna aktif bersamaan. Kapasitas aktual bergantung pada pola penggunaan aplikasi.'],
  ['Apakah 1.000 pengguna harus menggunakan server dedicated?', 'Tidak selalu. Jika pengguna tidak mengakses aplikasi secara bersamaan dan aktivitas database ringan, infrastruktur bersama dapat mencukupi. Pengujian beban diperlukan sebelum menentukan kebutuhan server.'],
  ['Apakah kapasitas storage bisa ditambah?', 'Bisa. Penyimpanan dapat ditingkatkan sesuai kebutuhan, baik melalui peningkatan paket maupun penggunaan object storage terpisah.'],
  ['Apakah biaya cloud sudah termasuk domain?', 'Tidak. Domain dibeli dan diperpanjang secara terpisah. Sebaiknya domain didaftarkan menggunakan identitas dan akun pelanggan sendiri.'],
  ['Apakah ada garansi jika website mengalami bug atau diretas?', 'Ada garansi perbaikan bug selama 30 hari. Jika insiden terbukti berasal dari kesalahan implementasi penyedia, perbaikan dan pemulihan yang menjadi tanggung jawab penyedia dilakukan tanpa biaya tambahan sesuai ketentuan kerja sama.'],
];

const TOC: [string, string][] = [
  ['layanan', 'Jenis layanan website dan aplikasi'], ['kapan-cloud', 'Kapan website membutuhkan cloud atau server?'], ['kapasitas', 'Klasifikasi kapasitas hosting'],
  ['paket', 'Rincian paket Cloud'], ['pengguna-bersamaan', 'Pengguna bersamaan vs jumlah akun'], ['storage', 'Penyimpanan file'], ['cloudflare-supabase', 'Cloudflare dan Supabase'],
  ['upgrade', 'Kapan perlu upgrade paket'], ['keamanan', 'Keamanan dan tanggung jawab'], ['harga', 'Harga layanan'], ['faq', 'Pertanyaan umum'],
];

// Harga diambil dari katalog supaya tidak berbeda dengan halaman /layanan.
function priceRows(): string[][] {
  const all = (slug: string) => KATALOG.find(k => k.slug === slug)!.groups.flatMap(g => g.items);
  return [
    ...all('website-statis').map(i => [i.n, price(i)]),
    ['Website Dinamis', 'Rp2.000.000 – Rp8.000.000'],
    ['Toko Online', 'Rp3.000.000 – Rp15.000.000+'],
    ...all('aplikasi-web').map(i => [i.n, price(i) + (i.sub ? ` (${i.sub})` : '')]),
  ];
}

export function panduanCloud(origin: string) {
  const path = PANDUAN_PATH;
  const body = [
    `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Beranda</a><i>›</i><a href="/jasa">Jasa</a><i>›</i><span>Cloud hosting</span></nav>`,
    `<article class="ar"><header class="kt-head"><p class="kt-tag">Panduan</p><h1>${esc(H1)}</h1>`,
    `<p class="lead">Website bukan hanya sarana memperkenalkan bisnis. Saat ini, website dapat menjadi pusat informasi, katalog produk, sistem pemesanan, pengelolaan pelanggan, hingga operasional perusahaan.</p>`,
    `<p class="cta"><a class="btn btn-blue" href="/#contact">Konsultasi &amp; minta estimasi</a><a class="btn btn-line" href="/layanan/cloud-server">Lihat paket cloud</a></p></header>`,
    fig('cloud-hosting-ringkasan', 'Infografis RUtusdev: jasa pembuatan website dan aplikasi dengan cloud hosting, dilengkapi pilihan Cloudflare dan Supabase serta estimasi biaya berdasarkan jumlah pengunjung per bulan', 'Ringkasan layanan: website statis, website dinamis, toko online, dan aplikasi web. Biaya hosting mengikuti skala: website ringan (hingga 10.000 pengunjung/bulan) tanpa biaya hosting tambahan, bisnis menengah (hingga 100.000) Rp125 ribu/bulan, dan skala besar (di atas 100.000) mulai Rp350 ribu/bulan.', true),
    `<nav class="ar-toc" aria-label="Daftar isi"><b>Daftar isi</b><ol>${TOC.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>`,

    p('Namun, tidak semua website membutuhkan server dengan kapasitas besar. Website company profile yang hanya menampilkan informasi tentu memiliki kebutuhan infrastruktur berbeda dengan aplikasi absensi, toko online, sistem pendaftaran, atau aplikasi database yang digunakan ratusan hingga ribuan orang.'),
    p('Karena itu, layanan pengembangan website dan aplikasi kami dirancang dengan pendekatan cloud hosting sesuai kebutuhan. Pelanggan tidak harus membayar server mahal apabila website masih dapat berjalan dengan baik menggunakan infrastruktur gratis atau paket ringan.'),
    p('Kami menyediakan layanan pembuatan website profesional, website dinamis, toko online, dan aplikasi berbasis web dengan pilihan infrastruktur yang dapat ditingkatkan mengikuti pertumbuhan bisnis.'),

    h2('layanan', 'Jenis Layanan Website dan Aplikasi'),
    h3('1. Website Landing Page dan Company Profile'),
    p('Cocok untuk UMKM, kontraktor, bengkel, perusahaan jasa, lembaga pendidikan, organisasi, dan bisnis yang membutuhkan identitas digital profesional. Fitur yang dapat disediakan antara lain:'),
    ul(['Profil perusahaan atau usaha.', 'Informasi produk dan layanan.', 'Galeri foto dan portofolio.', 'Halaman kontak dan lokasi.', 'Tombol konsultasi atau pemesanan WhatsApp.', 'Optimasi SEO dasar.', 'Tampilan responsif untuk smartphone dan komputer.']),
    p('Website statis dengan konten yang tidak terlalu sering berubah umumnya tidak membutuhkan database atau server aplikasi khusus. Infrastruktur seperti Cloudflare dapat digunakan untuk menyajikan halaman website secara cepat dengan biaya hosting tambahan Rp0, selama penggunaan masih sesuai kuota dan ketentuan layanan provider.'),
    h3('2. Website Dinamis dan Panel Admin'),
    p('Website dinamis memungkinkan pemilik website memperbarui informasi melalui halaman administrasi tanpa harus mengubah kode program. Contohnya:'),
    ul(['Website berita dan artikel.', 'Website sekolah.', 'Katalog produk yang dapat diperbarui.', 'Dashboard pengelolaan data.', 'Sistem manajemen konten.', 'Portal informasi pelanggan.']),
    p('Jenis website ini mulai membutuhkan layanan database dan backend. Infrastruktur cloud menjadi relevan ketika data harus disimpan, diperbarui, dicari, dan diakses oleh banyak pengguna.'),
    h3('3. Toko Online dan E-Commerce'),
    p('Toko online membutuhkan pengelolaan data yang lebih kompleks dibandingkan website company profile. Fitur yang dapat dikembangkan meliputi:'),
    ul(['Katalog dan kategori produk.', 'Keranjang belanja.', 'Checkout.', 'Manajemen pesanan.', 'Pengelolaan stok.', 'Integrasi pembayaran.', 'Integrasi pengiriman.', 'Laporan transaksi.']),
    p('Ketika transaksi, pengguna, dan jumlah produk bertambah, kebutuhan database, penyimpanan, dan pemrosesan aplikasi juga meningkat. Karena itu, toko online yang aktif bertransaksi lebih disarankan menggunakan paket cloud yang sesuai.'),
    h3('4. Aplikasi Web dan Sistem Informasi'),
    p('Kami juga melayani pengembangan aplikasi berbasis web untuk kebutuhan operasional bisnis dan organisasi, seperti:'),
    ul(['Sistem absensi online.', 'Sistem pendaftaran peserta didik.', 'Sistem inventaris.', 'Sistem keuangan.', 'Sistem informasi sekolah.', 'Sistem manajemen bengkel.', 'CRM atau pengelolaan pelanggan.', 'Learning Management System (LMS).', 'Aplikasi database dan dashboard khusus.']),
    p('Aplikasi tersebut umumnya membutuhkan backend, database, autentikasi pengguna, pengaturan hak akses, serta mekanisme backup. Infrastruktur cloud atau server menjadi bagian penting dari operasionalnya.'),

    h2('kapan-cloud', 'Kapan Website Membutuhkan Cloud Hosting atau Server?'),
    p('Salah satu kesalahpahaman yang sering terjadi adalah menganggap semua website harus menggunakan server berbayar. Padahal, kebutuhan infrastruktur sangat bergantung pada cara website digunakan. Ada empat faktor utama yang menentukan kebutuhan cloud dan server:'),
    h3('1. Traffic website'),
    p('Traffic menunjukkan jumlah kunjungan atau permintaan halaman dalam periode tertentu. Website dengan 50.000 pengunjung per bulan belum tentu membutuhkan server besar apabila sebagian besar halamannya statis dan disajikan melalui CDN.'),
    h3('2. Jumlah pengguna aktif'),
    p('Jumlah akun terdaftar tidak sama dengan jumlah pengguna aktif secara bersamaan. Aplikasi dengan 5.000 akun tetapi hanya digunakan 50 orang pada waktu yang sama dapat memiliki kebutuhan berbeda dengan aplikasi yang digunakan 500 orang secara bersamaan.'),
    h3('3. Aktivitas database'),
    p('Aplikasi yang hanya menampilkan informasi memiliki beban berbeda dengan aplikasi yang terus melakukan pencatatan absensi, transaksi, pencarian data, dan pembuatan laporan.'),
    h3('4. Kebutuhan penyimpanan'),
    p('Foto produk, dokumen PDF, hasil scan, video, dan berkas pengguna memerlukan ruang penyimpanan. Semakin banyak file yang diunggah, semakin besar kebutuhan storage dan backup.'),

    h2('kapasitas', 'Klasifikasi Kapasitas Hosting Berdasarkan Kebutuhan'),
    p('Berikut adalah batas kapasitas operasional awal yang kami gunakan sebagai acuan untuk menentukan paket layanan.'),
    fig('cloud-hosting-pilihan-infrastruktur', 'Infografis pilihan infrastruktur: Cloudflare hosting statis, shared hosting, VPS, Cloudflare plus Supabase, dan cloud dedicated, beserta batas kapasitas rekomendasi dan tanda perlu upgrade', 'Dari hosting statis hingga server khusus: kapasitas rekomendasi berkisar 10 ribu sampai 100 ribu lebih kunjungan per bulan, 0 sampai 100 lebih pengguna bersamaan, database 1–5 GB, dan storage file 5–25 GB. Angka ini rekomendasi paket, bukan batas mutlak.'),
    note('Angka ini merupakan batas rekomendasi paket layanan, bukan batas mutlak dari Cloudflare, Supabase, atau penyedia cloud lainnya. Kapasitas sebenarnya tetap bergantung pada ukuran halaman, kompleksitas kode, pola akses database, ukuran file, konfigurasi cache, dan spesifikasi infrastruktur.'),
    table(['Parameter', 'Cloud Basic', 'Cloud Business', 'Cloud Advanced', 'Cloud Dedicated'], [
      ['Estimasi kunjungan/bulan', '≤10.000', '≤30.000', '≤100.000', 'Di atas 100.000'],
      ['Estimasi page views/bulan', '≤30.000', '≤100.000', '≤300.000', 'Sesuai kapasitas'],
      ['Pengguna terdaftar', 'Tidak dibatasi oleh hosting statis*', '≤500', '≤2.000', 'Sesuai kapasitas'],
      ['Pengguna aktif bersamaan', 'Tidak relevan untuk situs statis*', '≤30', '≤100', 'Sesuai pengujian'],
      ['Database', 'Tidak diperlukan', '≤1 GB', '≤5 GB', 'Disesuaikan'],
      ['File storage', 'Sesuai layanan statis/CDN', '≤5 GB', '≤25 GB', 'Disesuaikan'],
      ['Jenis aplikasi', 'Website statis', 'Website dinamis ringan', 'Aplikasi database aktif', 'Aplikasi intensif/kritis'],
    ]),
    `<p class="kt-small">* Untuk website statis tanpa akun dan database aplikasi, jumlah pengunjung tidak dibatasi berdasarkan jumlah akun. Namun, penggunaan tetap tunduk pada kuota, kebijakan penggunaan wajar, batas teknis, dan ketentuan provider. Angka kunjungan pada tabel adalah target operasional paket, bukan jaminan kapasitas maksimum.</p>`,

    h2('paket', 'Rincian Paket Cloud'),
    h3('1. Cloud Basic — Rp0 biaya hosting tambahan'),
    p('Untuk website ringan yang tidak memerlukan backend dan database dinamis. Batas rekomendasi layanan:'),
    ul(['Target hingga 10.000 kunjungan per bulan.', 'Target hingga 30.000 page views per bulan.', 'Tidak menyediakan database aplikasi.', 'Tidak menyediakan akun pengguna dan dashboard dinamis.', 'Konten disajikan sebagai halaman statis.', 'Penyimpanan mengikuti fasilitas dan ketentuan provider.']),
    p('Contoh penggunaan: landing page, company profile, website profil usaha, website portofolio, halaman promosi produk, dan website informasi sederhana. Paket ini cocok bagi bisnis yang baru membangun kehadiran digital dan belum membutuhkan sistem pengelolaan data online.'),
    note('Website statis dapat menangani traffic lebih besar daripada angka target di atas jika optimasi dan distribusi CDN memadai. Jika traffic meningkat, kapasitas perlu dievaluasi berdasarkan penggunaan aktual, bukan sekadar jumlah pengunjung.'),
    h3('2. Cloud Business — Rp125.000/bulan'),
    p('Untuk website dinamis dan aplikasi ringan yang sudah membutuhkan backend serta database. Batas rekomendasi layanan:'),
    ul(['Hingga 30.000 kunjungan per bulan.', 'Hingga 100.000 page views per bulan.', 'Maksimal 500 akun pengguna terdaftar.', 'Target maksimal 30 pengguna aktif bersamaan.', 'Database hingga 1 GB.', 'File storage hingga 5 GB.']),
    p('Contoh penggunaan: website sekolah dengan panel admin, website berita atau blog, katalog produk dinamis, dashboard pengelolaan sederhana, sistem pendataan ringan, dan aplikasi internal usaha berskala kecil.'),
    h3('3. Cloud Advanced — Rp200.000/bulan'),
    p('Untuk aplikasi dengan aktivitas database lebih intensif dan jumlah pengguna lebih banyak. Batas rekomendasi layanan:'),
    ul(['Hingga 100.000 kunjungan per bulan.', 'Hingga 300.000 page views per bulan.', 'Maksimal 2.000 akun pengguna terdaftar.', 'Target maksimal 100 pengguna aktif bersamaan.', 'Database hingga 5 GB.', 'File storage hingga 25 GB.']),
    p('Contoh penggunaan: sistem absensi online, sistem pendaftaran online, aplikasi inventaris, sistem informasi sekolah, dashboard laporan dan transaksi, aplikasi manajemen bengkel, dan sistem pengelolaan pelanggan.'),
    h3('4. Cloud Dedicated — mulai Rp350.000/bulan'),
    p('Untuk aplikasi yang membutuhkan resource lebih besar, isolasi database, atau konfigurasi infrastruktur khusus. Batas kapasitas:'),
    ul(['Traffic di atas 100.000 kunjungan per bulan.', 'Pengguna terdaftar lebih dari 2.000 akun.', 'Pengguna aktif bersamaan di atas 100 orang.', 'Database di atas 5 GB.', 'File storage di atas 25 GB.', 'Kebutuhan backup, monitoring, dan resource yang lebih besar.']),
    note('Kapasitas aktual ditentukan melalui analisis dan pengujian beban. Harga mulai Rp350.000 per bulan bukan berarti seluruh kebutuhan server besar sudah termasuk tanpa batas. Jika diperlukan compute yang lebih tinggi, database terpisah, penyimpanan tambahan, atau VPS, biaya dihitung berdasarkan spesifikasi aktual.'),

    h2('pengguna-bersamaan', 'Mengapa Jumlah Pengguna Bersamaan Lebih Penting daripada Jumlah Akun?'),
    p('Sebagai contoh, sebuah aplikasi sekolah memiliki 1.500 akun siswa, 100 akun guru, dan 10 akun admin. Apakah aplikasi tersebut otomatis membutuhkan server besar? Belum tentu.'),
    p('Jika sebagian besar siswa hanya membuka aplikasi pada waktu berbeda, beban server dapat relatif ringan. Namun, apabila 1.000 siswa melakukan login dan mengirim data absensi pada menit yang sama, beban backend dan database dapat meningkat tajam.'),
    table(['Kondisi', 'Akun terdaftar', 'Pengguna bersamaan', 'Kebutuhan'], [
      ['Website profil', '0', '50 pengunjung', 'Cloud Basic'], ['Portal sekolah', '500', '20 pengguna', 'Cloud Business'],
      ['Aplikasi absensi', '1.500', '100 pengguna', 'Cloud Advanced'], ['Sistem transaksi besar', '5.000', '500 pengguna', 'Evaluasi Dedicated'],
    ]),
    `<p class="kt-small">Angka tersebut merupakan contoh klasifikasi awal. Penentuan paket akhir tetap membutuhkan pengujian performa dan analisis pola penggunaan.</p>`,

    h2('storage', 'Bagaimana dengan Layanan Storage atau Penyimpanan File?'),
    p('Selain database, aplikasi juga dapat membutuhkan ruang penyimpanan untuk dokumen dan media. Database dan file storage merupakan dua komponen berbeda.'),
    p('Database digunakan untuk menyimpan data terstruktur seperti nama pengguna, data pelanggan, data siswa, riwayat transaksi, data absensi, status pesanan, dan informasi produk. File storage digunakan untuk menyimpan foto profil, foto produk, dokumen pendaftaran, file PDF, hasil scan, bukti pembayaran, dan lampiran laporan.'),
    p('Sebagai contoh, sistem pendaftaran online dengan 1.000 pendaftar mungkin hanya membutuhkan database yang relatif kecil, tetapi dapat memerlukan storage cukup besar apabila setiap peserta mengunggah beberapa dokumen.'),
    h3('Rekomendasi kapasitas penyimpanan'),
    table(['Kebutuhan', 'Kapasitas awal'], [
      ['Website sederhana', '1 GB atau sesuai fasilitas provider'], ['Website dinamis ringan', '5 GB'], ['Aplikasi dengan unggahan dokumen', '25 GB'],
      ['Aplikasi dengan banyak foto/file', '50–100 GB'], ['Aplikasi dengan video atau arsip besar', 'Sesuai analisis kebutuhan'],
    ]),
    p('Penyimpanan file dapat menggunakan layanan object storage atau storage provider terpisah. Tidak semua file harus disimpan di database utama. Untuk menghemat biaya, file dapat dikompresi, gambar dioptimalkan ke format WebP, ukuran unggahan dibatasi, dan file lama dapat diarsipkan sesuai kebijakan pelanggan.'),

    h2('cloudflare-supabase', 'Mengapa Cloudflare dan Supabase Digunakan?'),
    p('Infrastruktur aplikasi dapat menggunakan beberapa layanan cloud yang memiliki fungsi berbeda. Cloudflare dapat digunakan untuk:'),
    ul(['Menyajikan halaman website melalui CDN.', 'Mengelola DNS.', 'Menggunakan SSL/TLS.', 'Menjalankan backend melalui Workers.', 'Membantu melindungi dan mengatur lalu lintas aplikasi.', 'Mengelola cache dan distribusi konten.']),
    p('Supabase dapat digunakan untuk:'),
    ul(['Database PostgreSQL.', 'Autentikasi pengguna.', 'Penyimpanan file.', 'Realtime.', 'Backend API.', 'Pengaturan akses data melalui Row Level Security (RLS).']),
    p('Kombinasi keduanya memungkinkan website dan aplikasi dikembangkan secara fleksibel. Website statis tidak perlu menggunakan database jika memang tidak membutuhkannya, sementara aplikasi yang mengelola banyak data dapat menggunakan backend dan database sesuai kebutuhan. Pemilihan arsitektur tidak hanya berdasarkan jumlah pengunjung, tetapi juga kebutuhan keamanan, kompleksitas aplikasi, dan intensitas transaksi.'),
    fig('cloud-hosting-perbandingan', 'Infografis perbandingan opsi hosting: Cloudflare plus Supabase, shared hosting, VPS, dan cloud dedicated atau custom server, lengkap dengan kisaran harga, tabel perbandingan, dan rekomendasi pemilihan', 'Perbandingan opsi hosting: Cloudflare + Supabase mulai Rp0–Rp350.000/bulan, shared hosting Rp100.000–Rp500.000/bulan, VPS Rp300.000–Rp1.500.000/bulan, dan cloud dedicated mulai Rp350.000+/bulan. Harga bergantung pada provider, spesifikasi, dan kebutuhan.'),

    h2('upgrade', 'Kapan Pelanggan Harus Upgrade Paket Cloud?'),
    p('Upgrade direkomendasikan apabila terjadi salah satu kondisi berikut:'),
    ol(['Traffic aktual secara konsisten mendekati atau melewati batas target paket.', 'Pengguna aktif bersamaan sering melebihi kapasitas yang ditetapkan.', 'Database mendekati batas penyimpanan.', 'File storage semakin penuh.', 'Aplikasi mengalami perlambatan karena beban database atau backend.', 'Proses laporan, pencarian, dan transaksi membutuhkan resource lebih besar.', 'Aplikasi memerlukan pemisahan database atau infrastruktur khusus.']),
    note('Kami tidak akan otomatis menaikkan paket dan membebankan biaya tambahan tanpa pemberitahuan. Evaluasi kebutuhan dan estimasi biaya akan disampaikan terlebih dahulu kepada pelanggan.'),

    h2('keamanan', 'Keamanan Website dan Tanggung Jawab Pemeliharaan'),
    p('Selain kapasitas, keamanan merupakan bagian penting dalam pengembangan website dan aplikasi. Implementasi keamanan disesuaikan dengan karakteristik proyek, antara lain:'),
    ul(['Validasi data dan input pengguna.', 'Pengaturan autentikasi dan hak akses.', 'Pengamanan endpoint backend.', 'Penggunaan environment variable untuk menyimpan secret.', 'Pembatasan akses database.', 'Penerapan Row Level Security (RLS) jika menggunakan Supabase.', 'Rate limiting pada endpoint yang sesuai.', 'Pembaruan dependency dan pemeriksaan konfigurasi.', 'Backup sesuai paket yang disepakati.']),
    p('Kami juga memberikan garansi perbaikan bug selama 30 hari kalender sejak serah terima, sesuai ruang lingkup dan spesifikasi proyek. Apabila ditemukan bug atau insiden keamanan yang terbukti berasal dari kesalahan kode, konfigurasi, atau implementasi yang menjadi tanggung jawab penyedia, perbaikan dilakukan tanpa biaya tambahan.'),
    p('Tidak ada sistem yang dapat dijamin 100% kebal terhadap peretasan. Oleh karena itu, penanganan insiden dilakukan berdasarkan hasil investigasi dan akar masalah. Insiden akibat kredensial pelanggan bocor, perubahan oleh pihak lain, layanan provider eksternal, atau faktor di luar kendali penyedia ditangani sesuai ketentuan kerja sama.'),
    `<p class="kt-small"><a href="/layanan/keamanan-garansi">Baca selengkapnya: keamanan, garansi bug &amp; tanggung jawab →</a></p>`,

    h2('harga', 'Harga Layanan Website, Aplikasi, dan Cloud Hosting'),
    h3('Ringkasan harga pengembangan'),
    table(['Kategori layanan', 'Harga'], priceRows()),
    h3('Biaya infrastruktur'),
    table(['Paket', 'Harga'], [['Cloud Basic', 'Rp0 biaya hosting tambahan'], ['Cloud Business', 'Rp125.000/bulan'], ['Cloud Advanced', 'Rp200.000/bulan'], ['Cloud Dedicated', 'Mulai Rp350.000/bulan'], ['Custom Server', 'Berdasarkan spesifikasi']]),
    p('Harga pengembangan merupakan biaya satu kali sesuai ruang lingkup. Domain, biaya layanan pihak ketiga, dan pemeliharaan berkala dihitung terpisah. Rincian lengkap per paket ada di halaman katalog layanan.'),
    `<p class="kt-small"><a href="/layanan">Katalog layanan &amp; harga →</a> · <a href="/layanan/cloud-server">Paket cloud &amp; server →</a></p>`,

    h2('konsultasi', 'Konsultasikan Kebutuhan Website dan Aplikasi Anda'),
    p('Setiap bisnis memiliki kebutuhan digital yang berbeda. Website company profile tidak membutuhkan infrastruktur yang sama dengan aplikasi transaksi atau sistem informasi yang digunakan banyak orang.'),
    p('Kami membantu menentukan jenis website, fitur, database, kapasitas storage, serta kebutuhan cloud hosting berdasarkan skala penggunaan yang sebenarnya. Dengan pendekatan ini, pelanggan tidak perlu membayar infrastruktur yang belum dibutuhkan dan tetap memiliki jalur peningkatan kapasitas ketika bisnis berkembang.'),
    p('Hubungi kami untuk konsultasi dan estimasi biaya pembuatan website atau aplikasi sesuai kebutuhan bisnis Anda.'),
    `<p class="cta"><a class="btn btn-blue" href="/#contact">Minta penawaran</a><a class="btn btn-line" href="/jasa">Semua layanan &amp; wilayah</a></p>`,

    h2('faq', 'Pertanyaan Umum (FAQ)'),
    `<div class="faq">${FAQ.map(([q, a], i) => `<h3>${i + 1}. ${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</div></article>`,
  ].join('');

  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Jasa', item: origin + '/jasa' },
      { '@type': 'ListItem', position: 3, name: 'Cloud hosting', item: origin + path }] },
    { '@context': 'https://schema.org', '@type': 'Article', headline: H1, description: DESC, mainEntityOfPage: origin + path, inLanguage: 'id',
      image: ['cloud-hosting-ringkasan', 'cloud-hosting-pilihan-infrastruktur', 'cloud-hosting-perbandingan'].map(f => `${origin}/artikel/${f}.webp`),
      author: { '@id': origin + '/#organization' }, publisher: { '@id': origin + '/#organization' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return { title: TITLE, desc: DESC, path, body, ld, wide: true as const,
    kw: ['jasa pembuatan website', 'jasa pembuatan aplikasi web', 'cloud hosting', 'server website', 'hosting website bisnis', 'website company profile', 'website dinamis', 'aplikasi database online', 'cloud server Indonesia', 'hosting toko online', 'sistem informasi berbasis web'] };
}
