// Gambar responsif dari R2: Worker mengubah ukuran dan memilih AVIF/WebP sesuai peramban (?w=…, lihat media() di worker/index.ts).
// GIF disajikan apa adanya (bisa beranimasi). Lebar yang valid harus ada di IMG_WIDTHS pada worker.
const WIDTHS = [320, 640, 960, 1280];
export function imgProps(key: string, sizes: string, max = 1280): { src: string; srcSet?: string; sizes?: string } {
  if (/\.gif$/i.test(key)) return { src: `/media/${key}` };
  const ws = WIDTHS.filter(w => w <= max);
  const use = ws.length ? ws : [WIDTHS[0]];
  return { src: `/media/${key}?w=${use[use.length - 1]}`, srcSet: use.map(w => `/media/${key}?w=${w} ${w}w`).join(', '), sizes };
}
