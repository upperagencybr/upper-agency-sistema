import { useI18n } from "@/lib/i18n-context";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CompanyLogo } from "@/components/app/CompanyLogo";
import { uploadFile, useRows, useTableMutations, type Row } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Field, Modal, PageHeader } from "@/components/app/ui";
import { CompanyTeam } from "@/components/app/CompanyTeam";
import { useProfile } from "@/lib/data";

export const Route = createFileRoute("/_app/empresas")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Empresas | NEXO HUB" },
      { name: "description", content: "Cadastro das empresas do grupo com CNPJ e logo." },
      { property: "og:title", content: "Empresas | NEXO HUB" },
      { property: "og:description", content: "Cadastro das empresas do grupo." },
    ],
  }),
  component: Empresas,
});

type C = Row<"companies">;

function Empresas() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const { data: companies = [] } = useRows("companies");
  const m = useTableMutations("companies");
  const [edit, setEdit] = useState<Partial<C> | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const { data: me } = useProfile();
  const { data: members = [] } = useRows("company_members");
  const canManage = (c: Partial<C>) => c.user_id === me?.id || members.some((x) => x.company_id === c.id && x.user_id === me?.id && x.role === "admin");

  const save = async () => {
    if (!edit?.name) { toast.error(tr("Informe o nome")); return; }
    const { id, user_id: _u, created_at: _c, ...rest } = edit as C;
    if (logo) rest.logo_url = await uploadFile(logo, "logos");
    if (id) {
      const old = companies.find((c) => c.id === id)?.name;
      await m.update.mutateAsync({ id, ...rest });
      if (old && old !== rest.name) {
        await Promise.all(["clients", "crm_leads", "transactions", "projects"].map((t) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.from(t as any).update({ company: rest.name } as any).eq("company", old)));
        ["clients", "crm_leads", "transactions", "projects"].forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
      }
    } else await m.insert.mutateAsync(rest);
    setEdit(null);
    setLogo(null);
  };

  return (
    <div>
      <PageHeader title={tr("Empresas")} sub={tr("{0} empresas", [companies.length])} actions={<Button onClick={() => setEdit({ country: "Brasil" })}><Plus className="h-4 w-4" />{tr("Nova empresa")}</Button>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {companies.map((c) => (
          <button key={c.id} onClick={() => setEdit(c)} className="panel flex gap-3 p-4 text-left hover:border-primary/60">
            <CompanyLogo path={c.logo_url} />
            <div className="min-w-0">
              <div className="font-semibold">{c.name}</div>
              <div className="truncate text-xs text-muted-foreground">{c.legal_name}</div>
              <div className="mt-2 text-xs text-muted-foreground">{c.segment}{c.tax_id ? ` · ${c.tax_id}` : ""}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{c.email}</div>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => { setEdit(null); setLogo(null); }} title={edit?.id ? tr("Editar empresa") : tr("Nova empresa")}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Nome")}><input className="field" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label={tr("Razão social")}><input className="field" value={edit.legal_name ?? ""} onChange={(e) => setEdit({ ...edit, legal_name: e.target.value })} /></Field>
            <Field label="CNPJ / Tax ID"><input className="field" value={edit.tax_id ?? ""} onChange={(e) => setEdit({ ...edit, tax_id: e.target.value })} /></Field>
            <Field label={tr("Segmento")}><input className="field" value={edit.segment ?? ""} onChange={(e) => setEdit({ ...edit, segment: e.target.value })} /></Field>
            <Field label={tr("E-mail")}><input className="field" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label={tr("Telefone")}><input className="field" value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label={tr("País")}><input className="field" value={edit.country ?? ""} onChange={(e) => setEdit({ ...edit, country: e.target.value })} /></Field>
            <Field label={tr("Endereço")}><input className="field" value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
            <Field label={tr("Logo (imagem)")} className="col-span-2">
              <div className="flex items-center gap-3">
                <CompanyLogo path={edit.logo_url ?? null} />
                <input type="file" accept="image/*" className="text-xs" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
              </div>
            </Field>
            <Field label={tr("Notas")} className="col-span-2"><textarea rows={2} className="field" value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            {edit.id && edit.name !== companies.find((c) => c.id === edit.id)?.name && (
              <p className="col-span-2 text-xs text-warning">{tr("O novo nome também será aplicado em clientes, leads, projetos e lançamentos.")}</p>
            )}
            {edit.id ? <CompanyTeam companyId={edit.id} canManage={canManage(edit)} /> : <p className="col-span-2 text-xs text-muted-foreground">{tr("Salve a empresa para cadastrar sócios e funcionários.")}</p>}
            <div className="col-span-2 flex justify-between pt-2">
              {edit.id ? <Button variant="ghost" onClick={() => { if (confirm(tr("Excluir empresa?"))) { m.remove.mutate(edit.id!); setEdit(null); } }}><Trash2 className="h-4 w-4" />{tr("Excluir")}</Button> : <span />}
              <Button onClick={save}>{tr("Salvar")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
