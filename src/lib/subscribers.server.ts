import { SYSTEM_ORIGIN } from "@/lib/site";

const SITE_URL = SYSTEM_ORIGIN; // subscriber logins and password e-mails point at the system address
const SUB_COMPANY = "Nexo Assinatura";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Find or create the subscriber's login. New accounts get an e-mail to set their password. */
export async function ensureUser(email: string): Promise<string | null> {
  const db = await admin();
  const { data: p } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (p) return p.id;
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/reset-password` });
  if (!error && data.user) return data.user.id;
  console.error("invite failed, creating account without e-mail", error);
  // Fallback: create the login anyway; the owner can send the password link from Assinantes.
  const pwd = crypto.randomUUID() + "Aa1!";
  const { data: c, error: e2 } = await db.auth.admin.createUser({ email, password: pwd, email_confirm: true });
  if (e2) { console.error("create user failed", e2); return null; }
  return c.user?.id ?? null;
}

/** Register the subscriber as a client of the owner under the "Nexo Assinatura" company. */
export async function registerClient(email: string, name: string | null, country: string | null) {
  const db = await admin();
  const { data: role } = await db.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
  if (!role) return;
  const owner = role.user_id;
  const { data: comp } = await db.from("companies").select("id").eq("user_id", owner).eq("name", SUB_COMPANY).maybeSingle();
  if (!comp) await db.from("companies").insert({ user_id: owner, name: SUB_COMPANY });
  const { data: c } = await db.from("clients").select("id").eq("user_id", owner).eq("email", email).maybeSingle();
  if (!c) await db.from("clients").insert({ user_id: owner, name: name || email, email, country, company: SUB_COMPANY, status: "ativo" });
}

