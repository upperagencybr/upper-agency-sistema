import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useRows, useTableMutations } from "@/lib/data";
import { ROLES, TABS, personName, useTeam } from "@/lib/team";
import { inviteMember } from "@/lib/team.functions";
import { Avatar } from "@/components/app/team";
import { Button } from "@/components/ui/button";

export function CompanyTeam({ companyId, canManage }: { companyId: number; canManage: boolean }) {
  const { tr } = useI18n();
  const { data: all = [] } = useRows("company_members");
  const { data: team = [] } = useTeam();
  const m = useTableMutations("company_members");
  const invite = useServerFn(inviteMember);
  const members = all.filter((x) => x.company_id === companyId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("funcionario");
  const [role, setRole] = useState("viewer");

  const sendInvite = async (memberId: number) => {
    try {
      const r = await invite({ data: { memberId, origin: window.location.origin } });
      toast.success(r.status === "linked" ? tr("Pessoa já tem conta, acesso liberado") : tr("Convite enviado por e-mail"));
    } catch (e) { toast.error((e as Error).message); }
  };

  const add = async () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n) { toast.error(tr("Informe o nome da pessoa")); return; }
    if (!/^\S+@\S+\.\S+$/.test(e)) { toast.error(tr("Informe um e-mail válido")); return; }
    try {
      await m.insert.mutateAsync({ company_id: companyId, name: n, email: e, kind, role: kind === "socio" ? role : role, tabs: kind === "socio" ? [] : ["crm", "clientes", "projetos"] });
      setName("");
      setEmail("");
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("company_members").select("id").eq("company_id", companyId).eq("email", e).maybeSingle();
      if (data) await sendInvite(data.id);
    } catch { /* toast já exibido */ }
  };

  return (
    <div className="col-span-2 space-y-3 border-t border-border pt-4">
      <div className="kpi-label">{tr("Equipe")}</div>
      {members.length === 0 && <p className="text-xs text-muted-foreground">{tr("Ninguém cadastrado ainda.")}</p>}
      {members.map((x) => {
        const p = team.find((t) => t.id === x.user_id);
        return (
          <div key={x.id} className="space-y-2 rounded-md border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Avatar person={p ?? { id: "", email: x.email, full_name: x.name, avatar_url: null }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p ? personName(p) : x.email}</div>
                <div className="truncate text-xs text-muted-foreground">{x.email}{!x.user_id && tr(" · convite pendente")}</div>
              </div>
              <select aria-label={tr("Tipo")} disabled={!canManage} className="field h-8 w-auto text-xs" value={x.kind} onChange={(e) => m.update.mutate({ id: x.id, kind: e.target.value })}>
                <option value="socio">{tr("Sócio")}</option><option value="funcionario">{tr("Funcionário")}</option>
              </select>
              <select aria-label={tr("Nível")} disabled={!canManage} className="field h-8 w-auto text-xs" value={x.role} onChange={(e) => m.update.mutate({ id: x.id, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{tr(r.label)}</option>)}
              </select>
              {canManage && !x.user_id && <button aria-label={tr("Reenviar convite")} title={tr("Reenviar convite")} onClick={() => sendInvite(x.id)} className="p-1 text-muted-foreground hover:text-primary"><Mail className="h-4 w-4" /></button>}
              {canManage && <button aria-label={tr("Remover da equipe")} onClick={() => { if (confirm(tr("Remover esta pessoa da empresa?"))) m.remove.mutate(x.id); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
            </div>
            {x.kind === "funcionario" ? (
              <div className="flex flex-wrap gap-1.5">
                {TABS.map((t) => (
                  <button key={t.id} type="button" disabled={!canManage} className="chip text-xs" data-on={x.tabs.includes(t.id)}
                    onClick={() => m.update.mutate({ id: x.id, tabs: x.tabs.includes(t.id) ? x.tabs.filter((y) => y !== t.id) : [...x.tabs, t.id] })}>{tr(t.label)}</button>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">{tr("Sócio vê todas as abas desta empresa.")}</p>}
          </div>
        );
      })}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <input className="field min-w-48 flex-1" placeholder={tr("Nome da pessoa")} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="field min-w-48 flex-1" placeholder={tr("E-mail da pessoa")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <select aria-label={tr("Tipo")} className="field w-auto" value={kind} onChange={(e) => setKind(e.target.value)}><option value="funcionario">{tr("Funcionário")}</option><option value="socio">{tr("Sócio")}</option></select>
          <select aria-label={tr("Nível")} className="field w-auto" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r.id} value={r.id}>{tr(r.label)}</option>)}</select>
          <Button type="button" onClick={add}><UserPlus className="h-4 w-4" />{tr("Adicionar")}</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{tr("Visualizar só vê. Editor vê e edita. Admin faz tudo, inclusive excluir e gerenciar a equipe.")}</p>
    </div>
  );
}
