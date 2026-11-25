// Konfigurasi tabel admin (dipindahkan dari admin.js lama). Kelompok hak akses harus selaras dengan GROUP di worker/index.ts;
// server tetap yang memutuskan.
export type Field = [string, string?, any?];
export type Tab = { label: string; title?: string; sub?: string[]; ro?: boolean; f?: Field[]; print?: string;
  dash?: boolean; pipeline?: boolean; media?: boolean; settings?: boolean; security?: boolean };
export type Perm = Record<string, string>;
const PUB: Field = ['is_published', 'check'], SORT: Field = ['sort_order', 'number'];
export const STAGES = ['baru', 'dihubungi', 'discovery', 'proposal', 'negosiasi', 'menang', 'kalah'];
const LBL: Record<string, string> = { title:'Judul', slug:'Slug (huruf kecil-dan-minus)', summary:'Ringkasan', description:'Deskripsi', icon:'Ikon', sort_order:'Urutan', is_published:'Terbitkan',
  body:'Isi (mendukung Markdown)', category_id:'Kategori', technology_ids:'Teknologi', gallery:'Galeri tambahan — satu baris per gambar: uploads/… | teks alternatif', cover_key:'Gambar sampul', demo_url:'Tautan demo', featured:'Unggulan',
  excerpt:'Kutipan singkat', seo_title:'Judul SEO', seo_description:'Deskripsi SEO', status:'Status', client_name:'Nama klien', organization:'Organisasi', quote:'Isi testimoni',
  avatar_key:'Foto', name:'Nama', logo_key:'Logo', website_url:'Situs web', notes:'Catatan', website:'Situs web', industry:'Industri', position:'Jabatan', email:'Email',
  whatsapp:'WhatsApp', projects:'Proyek selesai (contoh: 12+)', timeline:'Minggu hingga situs live (contoh: 4–6)', organization_id:'Organisasi', contact_id:'Kontak', deal_id:'Peluang', value:'Nilai (Rp)', stage:'Tahap', source:'Sumber', expected_close:'Target closing',
  kind:'Jenis', note:'Isi catatan', eyebrow:'Label atas', headline:'Judul utama', headline_dim:'Lanjutan judul', subheadline:'Sub-judul', cta_primary:'Tombol utama', cta_secondary:'Tombol kedua',
  baru:'Baru', dihubungi:'Dihubungi', discovery:'Penjajakan', proposal:'Proposal', negosiasi:'Negosiasi', menang:'Menang', kalah:'Kalah',
  new:'Baru', contacted:'Dihubungi', won:'Menang', lost:'Kalah', draft:'Draf', published:'Terbit', catatan:'Catatan', telepon:'Telepon', rapat:'Rapat',
  number:'Nomor (kosongkan untuk otomatis)', valid_until:'Berlaku hingga', scope:'Ruang lingkup pekerjaan', terms:'Syarat & ketentuan',
  items:'Rincian — satu baris per item: Deskripsi | Jumlah | Harga satuan (Rp)', issue_date:'Tanggal terbit', due_date:'Jatuh tempo / tenggat', paid_amount:'Sudah dibayar (Rp)',
  milestone:'Tonggak', milestone_id:'Tonggak pengerjaan', rencana:'Rencana', tertunda:'Tertunda', priority:'Prioritas', terkirim:'Terkirim', disetujui:'Disetujui', ditolak:'Ditolak', draf:'Draf', dibayar_sebagian:'Dibayar sebagian', lunas:'Lunas', batal:'Batal',
  todo:'Belum mulai', berjalan:'Berjalan', selesai:'Selesai', rendah:'Rendah', sedang:'Sedang', tinggi:'Tinggi',
  archived:'Arsip', admin:'Admin', editor:'Editor', viewer:'Pembaca', success:'Berhasil', failure:'Gagal', denied:'Ditolak' };
export const GRP: Record<string, string> = { projects_delivery:'crm', leads:'crm', pipeline:'crm', deals:'crm', organizations:'crm', contacts:'crm', interactions:'crm', tasks:'crm', proposals:'finance', invoices:'finance',
  services:'content', projects:'content', project_categories:'content', technologies:'content', articles:'content', testimonials:'content', clients:'content', media:'content', settings:'content' };
export const L = (k: unknown): string => (k == null || k === '' ? '' : LBL[String(k)] || String(k));
export const T: Record<string, Tab> = {
  ringkasan: { label:'Ringkasan', dash:true },
  leads: { label:'Prospek', title:'name', sub:['email','whatsapp','service_interest','brief'], ro:true,
    f:[['status','select',['new','contacted','discovery','proposal','won','lost']],['notes','textarea']] },
  pipeline: { label:'Alur penjualan', pipeline:true },
  deals: { label:'Peluang', title:'title', sub:['stage','value'], f:[['title'],['organization_id','ref','organizations'],['contact_id','ref','contacts'],['value','number'],['stage','select',STAGES],['source'],['expected_close','date'],['notes','textarea']] },
  organizations: { label:'Organisasi', title:'name', sub:['industry','website'], f:[['name'],['website'],['industry'],['notes','textarea']] },
  contacts: { label:'Kontak', title:'name', sub:['position','email','whatsapp'], f:[['name'],['position'],['email'],['whatsapp'],['organization_id','ref','organizations'],['notes','textarea']] },
  interactions: { label:'Riwayat', title:'note', sub:['kind','created_at'], f:[['deal_id','ref','deals'],['kind','select',['catatan','telepon','whatsapp','email','rapat']],['note','textarea']] },
  proposals: { label:'Penawaran', title:'title', sub:['number','status'], print:'proposal', f:[['number'],['title'],['deal_id','ref','deals'],['status','select',['draft','terkirim','disetujui','ditolak']],['valid_until','date'],['items','items'],['scope','textarea'],['terms','textarea']] },
  invoices: { label:'Faktur', title:'title', sub:['number','status','due_date'], print:'invoice', f:[['number'],['title'],['deal_id','ref','deals'],['organization_id','ref','organizations'],['status','select',['draf','terkirim','dibayar_sebagian','lunas','batal']],['issue_date','date'],['due_date','date'],['items','items'],['paid_amount','number'],['notes','textarea']] },
  tasks: { label:'Tugas', title:'title', sub:['milestone','status','priority','due_date'], f:[['title'],['deal_id','ref','deals'],['milestone_id','ref','projects_delivery'],['status','select',['todo','berjalan','selesai']],['priority','select',['rendah','sedang','tinggi']],['due_date','date'],['notes','textarea']] },
  projects_delivery: { label:'Tonggak proyek', title:'title', sub:['status','due_date'], f:[['title'],['deal_id','ref','deals'],['status','select',['rencana','berjalan','selesai','tertunda']],['due_date','date'],['sort_order','number'],['notes','textarea']] },
  services: { label:'Layanan', title:'title', f:[['title'],['slug'],['summary'],['description','textarea'],['icon'],SORT,PUB] },
  projects: { label:'Portofolio', title:'title', f:[['title'],['slug'],['summary'],['body','textarea'],['category_id','ref','project_categories'],['technology_ids','multi','technologies'],['cover_key','image'],['gallery','gallery'],['demo_url'],['featured','check'],['status','select',['draft','published','archived']]] },
  project_categories: { label:'Kategori proyek', title:'name', sub:['slug'], f:[['name'],['slug'],SORT] },
  technologies: { label:'Teknologi', title:'name', sub:['slug'], f:[['name'],['slug']] },
  articles: { label:'Artikel', title:'title', f:[['title'],['slug'],['excerpt'],['body','textarea'],['seo_title'],['seo_description'],['cover_key','image'],['status','select',['draft','published']]] },
  testimonials: { label:'Testimoni', title:'client_name', f:[['client_name'],['organization'],['quote','textarea'],['avatar_key','image'],PUB] },
  clients: { label:'Klien', title:'name', f:[['name'],['logo_key','image'],['website_url'],PUB] },
  media: { label:'Media', media:true },
  settings: { label:'Pengaturan', settings:true },
  keamanan: { label:'Keamanan & Log', security:true },
};
export const rp = (n: unknown) => 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID');
export const fdt = (s?: string | null) => (s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–');
