import { useI18n } from "@/lib/i18n-context";
import { useMySubscription } from "@/lib/subscription";
import { useAccess } from "@/lib/team";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { uploadFile, useProfile, useRows, useTableMutations, useUpdateProfile, useSignedUrl } from "@/lib/data";
import { Avatar, ColorPicker, tagClass, tagStyle } from "@/components/app/team";
import { OptionsEditor } from "@/components/app/OptionsEditor";
import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MySubscription } from "@/components/app/MySubscription";
import { ExportSection } from "@/components/app/ExportSection";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/app/ui";
import { ReminderSettings } from "@/components/app/ReminderSettings";
import { StatusSettings } from "@/components/app/StatusSettings";
import { StatusOptionsEditor } from "@/components/app/StatusOptionsEditor";
import { PersonalizationSettings } from "@/components/app/PersonalizationSettings";
import { ProfilePhotoEditor } from "@/components/app/ProfilePhotoEditor";
import { ImportSection } from "@/components/app/ImportSection";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | NEXO HUB" },
      { name: "description", content: "Personalize temas, paletas, fontes e lembretes no NEXO HUB." },
      { property: "og:title", content: "Configurações | NEXO HUB" },
      { property: "og:description", content: "Personalize temas, paletas, fontes e lembretes no NEXO HUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Config,
});

function Config() {
  const { tr } = useI18n();
  const { canExport } = useAccess();
  const { data: p } = useProfile();
  const { data: mySub } = useMySubscription();
  const up = useUpdateProfile();
  const [photoSource, setPhotoSource] = useState<File | string | null>(null);
  const { data: photoUrl } = useSignedUrl(p?.avatar_url);
  const { data: clients = [] } = useRows("clients");
  const { data: txs = [] } = useRows("transactions");
  const { data: companies = [] } = useRows("companies");
  const [tab, setTab] = useState<"geral" | "personalizacao" | "opcoes" | "lembretes" | "indicadores" | "importar" | "exportar">("geral");
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t === "personalizacao" || t === "opcoes" || t === "lembretes" || t === "indicadores" || t === "importar" || t === "exportar") setTab(t); }, []);
  const { data: tags = [] } = useRows("tags");
  const tm = useTableMutations("tags");
  const qc = useQueryClient();
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#facc15");
  const setPhoto = async (f: File) => {
    try { const path = await uploadFile(f, "avatars"); await up.mutateAsync({ avatar_url: path }); void qc.invalidateQueries({ queryKey: ["team"] }); }
    catch (e) { toast.error((e as Error).message); throw e; }
  };

  const opt = (cur: string | undefined, v: string, label: string, key: "lang" | "theme" | "font") => (
    <Button key={v} size="sm" variant={cur === v ? "default" : "outline"} onClick={() => up.mutate({ [key]: v })}>{label}</Button>
  );

  return (
    <div>
      <PageHeader title={tr("Configurações")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === "geral" ? "default" : "outline"} size="sm" onClick={() => setTab("geral")}>{tr("Geral")}</Button>
        <Button variant={tab === "personalizacao" ? "default" : "outline"} size="sm" onClick={() => setTab("personalizacao")}>{tr("Personalização")}</Button>
        <Button variant={tab === "opcoes" ? "default" : "outline"} size="sm" onClick={() => setTab("opcoes")}>{tr("Opções")}</Button>
        <Button variant={tab === "lembretes" ? "default" : "outline"} size="sm" onClick={() => setTab("lembretes")}>{tr("Lembretes")}</Button>
        <Button variant={tab === "indicadores" ? "default" : "outline"} size="sm" onClick={() => setTab("indicadores")}>{tr("Indicadores")}</Button>
        <Button variant={tab === "importar" ? "default" : "outline"} size="sm" onClick={() => setTab("importar")}>{tr("Importar")}</Button>
        {canExport && <Button variant={tab === "exportar" ? "default" : "outline"} size="sm" onClick={() => setTab("exportar")}>{tr("Exportar")}</Button>}
      </div>
      {tab === "geral" ? (
        <div className="grid max-w-2xl gap-4">
          <Panel title={tr("Meu perfil")}>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar person={p ? { id: p.id, email: p.email, full_name: p.full_name, avatar_url: p.avatar_url } : null} size="h-14 w-14" />
              <input className="field flex-1" placeholder={tr("Seu nome")} defaultValue={p?.full_name ?? ""} key={p?.full_name ?? "n"}
                onBlur={(e) => e.target.value !== (p?.full_name ?? "") && up.mutate({ full_name: e.target.value || null }, { onSuccess: () => void qc.invalidateQueries({ queryKey: ["team"] }) })} />
              <Button asChild variant="outline" size="sm"><label className="cursor-pointer">{tr("Trocar foto")}<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoSource(f); e.target.value = ""; }} /></label></Button>
              {photoUrl && <Button variant="outline" size="sm" onClick={() => setPhotoSource(photoUrl)}>{tr("Ajustar foto")}</Button>}
            </div>
          </Panel>
          <Panel title={tr("Etiquetas")}>
            <div className="mb-3 flex flex-wrap gap-2">
              {tags.length === 0 && <span className="text-xs text-muted-foreground">{tr("Nenhuma etiqueta ainda.")}</span>}
              {tags.map((t) => (
                <span key={t.id} style={tagStyle(t.color)} className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${tagClass(t.color)}`}>
                  {t.name}
                  <button aria-label={`Excluir etiqueta ${t.name}`} onClick={() => { if (confirm(tr("Excluir esta etiqueta?"))) tm.remove.mutate(t.id); }}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input className="field flex-1" placeholder={tr("Nova etiqueta")} value={tagName} onChange={(e) => setTagName(e.target.value)} />
              <ColorPicker value={tagColor} onChange={setTagColor} />
              <Button onClick={() => { if (tagName.trim()) tm.insert.mutate({ name: tagName.trim(), color: tagColor }, { onSuccess: () => setTagName("") }); }}>{tr("Criar")}</Button>
            </div>
          </Panel>
          <Panel title={tr("Idioma")}><div className="flex gap-2">{opt(p?.lang, "pt", "PT", "lang")}{opt(p?.lang, "en", "EN", "lang")}{opt(p?.lang, "es", "ES", "lang")}</div></Panel>
          <Panel title={tr("Assinatura")}>
            {!mySub && <p className="text-sm">{tr("Situação:")} <span className={p?.subscription_status === "ativo" ? "text-success" : "text-destructive"}>{p?.subscription_status}</span></p>}
            <MySubscription />
          </Panel>
        </div>
      ) : tab === "personalizacao" ? (
        <PersonalizationSettings />
      ) : tab === "indicadores" ? (
        <StatusSettings />
      ) : tab === "lembretes" ? (
        <ReminderSettings />
      ) : tab === "opcoes" ? (
        <div className="grid max-w-2xl gap-4">
          <OptionsEditor title={tr("Origem do lead (CRM)")} list="lead_origins" />
          <StatusOptionsEditor title={tr("Status do CRM")} area="crm" />
          <StatusOptionsEditor title={tr("Situações dos clientes")} area="clients" />
          <OptionsEditor title={tr("Categorias (Financeiro)")} list="tx_categories" />
          <p className="text-xs text-muted-foreground">{tr("Etiquetas ficam na aba Geral. Empresas podem ser cadastradas direto nos formulários ou na aba Empresas.")}</p>
        </div>
      ) : tab === "importar" ? <ImportSection /> : !canExport ? null : (
        <div className="max-w-2xl">
          <ExportSection kind="clientes" clients={clients} transactions={txs} companies={companies} systemName="NEXO HUB" />
          <ExportSection kind="despesas" clients={clients} transactions={txs} companies={companies} systemName="NEXO HUB" />
        </div>
      )}
      <ProfilePhotoEditor source={photoSource} onClose={() => setPhotoSource(null)} onSave={setPhoto} />
    </div>
  );
}
