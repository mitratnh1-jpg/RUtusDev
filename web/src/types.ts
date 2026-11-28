export type Hero = { eyebrow?: string; headline?: string; headline_dim?: string; subheadline?: string; cta_primary?: string; cta_secondary?: string };
export type Stats = { projects?: string; timeline?: string };
export type Service = { title: string; slug?: string; summary?: string };
export type Client = { name: string; logo_key?: string; website_url?: string };
export type Project = { title: string; slug?: string; summary?: string; category?: string; technologies?: string[]; cover_key?: string; demo_url?: string; gallery?: { object_key: string; alt_text?: string }[] };
export type Testimonial = { client_name: string; organization?: string; quote: string };
export type Article = { title: string; slug?: string; excerpt?: string; cover_key?: string; created_at?: string; href?: string; cover_src?: string };
export type Content = {
  services: Service[]; projects: Project[]; testimonials: Testimonial[]; articles?: Article[]; clients?: Client[];
  settings: { hero?: Hero; contact?: { whatsapp?: string; email?: string }; stats?: Stats };
};
declare global {
  interface Window {
    turnstile?: { render(el: HTMLElement, o: object): string; reset(id?: string): void; getResponse(id?: string): string | undefined };
  }
}
