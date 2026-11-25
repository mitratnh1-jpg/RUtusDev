// Header keamanan untuk SEMUA respons Worker (API, halaman SSR, media, dan aset statis dari ASSETS).
// Daftar domain di CSP mengikuti yang benar-benar dipakai: Turnstile, Google Fonts, Cloudflare Web Analytics.
// Tingkat perlindungan disetarakan dengan (dan di beberapa bagian melampaui) proyek Muhiba:
// CSP + upgrade-insecure-requests, X-Frame-Options, HSTS, COOP, CORP (API & admin), Permissions-Policy diperluas,
// CSP super-ketat khusus /api/*, dan Cache-Control: no-store untuk halaman admin & API.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // 'unsafe-inline': React memakai atribut style
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://cloudflareinsights.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

// Respons JSON/API tidak pernah perlu memuat sumber daya apa pun.
const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const PERMISSIONS = [
  'accelerometer=()', 'autoplay=()', 'bluetooth=()', 'camera=()', 'display-capture=()', 'geolocation=()', 'gyroscope=()',
  'magnetometer=()', 'microphone=()', 'midi=()', 'payment=()', 'publickey-credentials-get=()', 'serial=()', 'usb=()', 'xr-spatial-tracking=()',
].join(', ');

// reportOnly = true: CSP hanya dilaporkan di konsol browser (tidak memblokir). Dipakai untuk uji pertama setelah deploy.
export function secure(r: Response, reportOnly: boolean, pathname = '/'): Response {
  // Respons pengalihan 101/WebSocket tidak boleh dibungkus ulang.
  if (r.status === 101) return r;
  const h = new Headers(r.headers);
  const isApi = /^\/api(\/|$)/i.test(pathname), isAdmin = /^\/admin(\/|$)/i.test(pathname);
  const cspName = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  h.set(cspName, isApi ? API_CSP : CSP);
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', isApi || isAdmin ? 'no-referrer' : 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', PERMISSIONS);
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('X-Permitted-Cross-Domain-Policies', 'none');
  h.set('X-DNS-Prefetch-Control', 'off');
  h.set('Origin-Agent-Cluster', '?1');
  // API & panel admin: tidak boleh dibaca situs lain dan tidak boleh disimpan di cache bersama/peramban.
  if (isApi || isAdmin) h.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (isApi && !h.has('Cache-Control')) h.set('Cache-Control', 'no-store');
  if (isAdmin && (h.get('Content-Type') || '').includes('text/html')) h.set('Cache-Control', 'no-store');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}
