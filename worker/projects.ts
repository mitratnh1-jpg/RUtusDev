// Bentuk data portofolio ternormalisasi (projects + project_categories + technologies + project_media).
// Kolom eksplisit (bukan select=*) agar kolom warisan `category`/`technologies` tidak bentrok dengan hasil embed.
export const PROJECT_COLS = 'id,title,slug,summary,body,cover_key,demo_url,featured,created_at,published_at';
// Daftar di landing page: tanpa body/id/created_at.
export const PROJECT_LIST_COLS = 'title,slug,summary,cover_key,demo_url,featured';
export const PROJECT_EMBED = 'cat:project_categories(name,slug),project_technologies(sort_order,tech:technologies(name,slug)),gallery:project_media(object_key,alt_text,sort_order)';
const bySort = (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

// Hasil akhir tetap kompatibel dengan frontend: category (string), technologies (string[]), plus gallery.
export type ShapedProject = Record<string, any> & { category: string | null; technologies: string[]; gallery: { object_key: string; alt_text: string }[] };
export function shapeProject(p: any): ShapedProject {
  const { cat, project_technologies, gallery, ...rest } = p;
  return {
    ...rest,
    category: cat?.name ?? null,
    technologies: ((project_technologies || []) as any[]).sort(bySort).map(x => x.tech?.name).filter(Boolean) as string[],
    gallery: ((gallery || []) as any[]).sort(bySort).map(g => ({ object_key: g.object_key as string, alt_text: (g.alt_text as string) || '' })),
  };
}
