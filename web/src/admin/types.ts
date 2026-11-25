export type Row = Record<string, any>;
export type Can = (group: string, level: string) => boolean;
export type Me = {
  id: string; email: string; name: string; role: string; perm: Record<string, string>; last_sign_in_at: string | null;
  session?: { issued_at: string | null; expires_at: string | null; ip: string; user_agent: string };
  recent_logins?: { created_at: string; ip?: string; user_agent?: string }[];
  mfa?: { enabled: boolean; required: boolean; aal: string };
};
