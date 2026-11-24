import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRows } from "@/lib/data";

export type Person = { id: string; email: string | null; full_name: string | null; avatar_url: string | null };
export type Tab = "crm" | "clientes" | "projetos" | "mentorados" | "financeiro" | "contabilidade" | "conteudo";
export const TABS: { id: Tab; label: string }[] = [
  { id: "crm", label: "CRM" }, { id: "clientes", label: "Clientes" }, { id: "projetos", label: "Projetos" },
  { id: "mentorados", label: "Mentorados" }, { id: "financeiro", label: "Financeiro" },
  { id: "contabilidade", label: "Contabilidade" }, { id: "conteudo", label: "NEXIA" },
];
export const ROLES = [
  { id: "viewer", label: "Visualizar" }, { id: "editor", label: "Editor" }, { id: "admin", label: "Admin" },
] as const;

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,email,full_name,avatar_url");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });
}

export const personName = (p?: Person | null) => p?.full_name || p?.email?.split("@")[0] || "Sem nome";

type Member = { kind: string; role: string; tabs: string[]; user_id: string | null };

/** Pure rule: which tabs a user sees. Owners (or users with no memberships) see everything. */
export function canSeeTab(tab: string, ownsCompany: boolean, memberships: Member[]) {
  if (ownsCompany || memberships.length === 0) return true;
  return memberships.some((m) => m.kind === "socio" || m.tabs.includes(tab));
}
export function bestRole(memberships: Member[]) {
  const rank = { viewer: 1, editor: 2, admin: 3 } as Record<string, number>;
  return memberships.reduce((b, m) => ((rank[m.role] ?? 0) > (rank[b] ?? 0) ? m.role : b), "viewer");
}

export function useAccess() {
  const { data: me } = useProfile();
  const { data: companies = [] } = useRows("companies");
  const { data: members = [] } = useRows("company_members");
  const mine = members.filter((m) => m.user_id === me?.id);
  const owns = companies.some((c) => c.user_id === me?.id);
  const canExport = owns || mine.some((m) => m.kind === "socio" && m.role === "admin");
  return { meId: me?.id, owns, canExport, canTab: (tab: string) => canSeeTab(tab, owns, mine) };
}
