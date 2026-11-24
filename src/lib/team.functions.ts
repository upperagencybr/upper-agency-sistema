import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends an invite e-mail to a company member who has no account yet. Caller must be owner/admin of that company. */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: number; origin: string }) => {
    const memberId = Number(d?.memberId);
    if (!Number.isInteger(memberId)) throw new Error("Membro inválido");
    const origin = String(d?.origin ?? "");
    if (!/^https?:\/\/[^/]+$/.test(origin)) throw new Error("Origem inválida");
    return { memberId, origin };
  })
  .handler(async ({ data, context }) => {
    const { data: m, error } = await context.supabase.from("company_members").select("id,company_id,email,user_id").eq("id", data.memberId).maybeSingle();
    if (error || !m) throw new Error("Membro não encontrado");
    const { data: role } = await context.supabase.rpc("company_role", { _company_id: m.company_id });
    if (role !== "owner" && role !== "admin") throw new Error("Só admins podem convidar");
    if (m.user_id) return { status: "linked" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: e } = await supabaseAdmin.auth.admin.inviteUserByEmail(m.email, { redirectTo: `${data.origin}/reset-password` });
    if (e) {
      console.error("invite failed", e);
      throw new Error(`Não foi possível enviar o convite: ${e.message}`);
    }
    return { status: "invited" as const };
  });
