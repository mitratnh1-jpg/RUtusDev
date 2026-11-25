// Header keamanan untuk SEMUA respons Worker (API, halaman SSR, media, dan aset statis dari ASSETS).
// Daftar domain di CSP mengikuti yang benar-benar dipakai: Turnstile, Google Fonts, Cloudflare Web Analytics.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // 'unsafe-inline': React memakai atribut style
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://cloudflareinsights.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// reportOnly = true: CSP hanya dilaporkan di konsol browser (tidak memblokir). Dipakai untuk uji pertama setelah deploy.
export function secure(r: Response, reportOnly: boolean): Response {
  const h = new Headers(r.headers);
  h.set(reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', CSP);
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  h.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}
