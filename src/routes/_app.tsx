import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Kanban, Users, FolderKanban, GraduationCap, Wallet, Building2, Calculator, Sparkles, Rocket, Inbox, Settings, LogOut, Lock, PanelLeftClose, PanelLeftOpen, BadgeDollarSign, Pencil, MessageSquare, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useFeedbackThreads } from "@/lib/data";
import { feedbackUnread, showFeedbackBubble } from "@/lib/feedback";
import { useAccess } from "@/lib/team";
import { useIsAdmin, useMySubscription } from "@/lib/subscription";
import { accessBlocked } from "@/lib/billing";
import { useUnreadCount } from "@/lib/useNotices";
import { t, translateText, type Key } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SidebarEditor, applySidebarPrefs } from "@/components/app/SidebarEditor";
import { visibleSidebarItems } from "@/lib/sidebar";
import { foreignOriginFor, SALES_ORIGIN } from "@/lib/site";
import { canTestNexoContent } from "@/lib/content-access";
import { usePalette } from "@/lib/personalization";
import { LanguageProvider } from "@/lib/i18n-context";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    // The sales address never runs the app: send the visitor to the system address.
    const origin = foreignOriginFor(window.location.hostname, window.location.pathname);
    if (origin) throw redirect({ href: origin + window.location.pathname + window.location.search + window.location.hash });
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

const NAV: { to: string; key: Key; icon: typeof Users }[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/crm", key: "crm", icon: Kanban },
  { to: "/clientes", key: "clientes", icon: Users },
  { to: "/projetos", key: "projetos", icon: FolderKanban },
  { to: "/mentorados", key: "mentorados", icon: GraduationCap },
  { to: "/financeiro", key: "financeiro", icon: Wallet },
  { to: "/empresas", key: "empresas", icon: Building2 },
  { to: "/contabilidade", key: "contabilidade", icon: Calculator },
  { to: "/feedbacks", key: "feedbacks", icon: MessageSquare },
  { to: "/adquira", key: "personalizado", icon: Rocket },
  { to: "/conteudo", key: "conteudo", icon: Sparkles },
];

const FONTS: Record<string, string> = {
  inter: '"Inter", system-ui, sans-serif',
  plex: '"IBM Plex Sans", system-ui, sans-serif',
  manrope: '"Manrope", system-ui, sans-serif',
  grotesk: '"Space Grotesk", system-ui, sans-serif',
};

function AppLayout() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const { palette } = usePalette(profile?.id);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { unread: noticeUnread } = useUnreadCount();
  const { canTab } = useAccess();
  const { data: isAdmin } = useIsAdmin();
  const { data: feedbacks = [] } = useFeedbackThreads();
  const fbUnread = feedbacks.filter(t => feedbackUnread(t, !!isAdmin)).length;
  const unread = noticeUnread + fbUnread;
  const { data: mySub, isLoading: subLoading } = useMySubscription();
  const NAV_OK = NAV.filter((n) => (n.to !== "/contabilidade" || !!isAdmin) && (n.to === "/dashboard" || n.to === "/empresas" || n.to === "/feedbacks" || n.to === "/adquira" || canTab(n.to.slice(1))));
  const soon = (to: string) => !canTestNexoContent(isAdmin) && to === "/conteudo";
  if (isAdmin) NAV_OK.splice(NAV_OK.findIndex((n) => n.to === "/empresas") + 1, 0, { to: "/assinantes", key: "assinantes", icon: BadgeDollarSign });
  const lang = profile?.lang ?? "pt";
  const tr = (text: string) => translateText(text, lang);
  const sbLabels = ((profile as { sidebar_labels?: Record<string, string> } | null)?.sidebar_labels ?? {}) as Record<string, string>;
  const sbHidden = profile?.sidebar_hidden ?? [];
  const NAV_EDIT = applySidebarPrefs(NAV_OK, profile?.sidebar_order);
  const feedbackIndex = NAV_EDIT.findIndex(n => n.to === "/feedbacks");
  const accountingIndex = NAV_EDIT.findIndex(n => n.to === "/contabilidade");
  if (feedbackIndex >= 0 && accountingIndex >= 0 && feedbackIndex !== accountingIndex + 1) {
    const [feedback] = NAV_EDIT.splice(feedbackIndex, 1);
    if (feedback) NAV_EDIT.splice(NAV_EDIT.findIndex(n => n.to === "/contabilidade") + 1, 0, feedback);
  }
  const NAV_SHOW = visibleSidebarItems(NAV_EDIT, sbHidden);
  const label = (n: { to: string; key: Key }) => sbLabels[n.to] || t(n.key, lang);
  const [editSb, setEditSb] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") {
        qc.clear();
        nav({ to: "/login" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [nav, qc]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["palette"] = palette;
    const theme = profile?.theme ?? "dark";
    const apply = () => {
      const dark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    root.style.setProperty("--font-app", FONTS[profile?.font ?? "inter"] ?? FONTS["inter"] ?? null);
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    return undefined;
  }, [profile?.theme, profile?.font, palette]);

  useEffect(() => () => { delete document.documentElement.dataset["palette"]; }, []);

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(localStorage.getItem("sidebar-collapsed") === "1"); }, []);
  const [fbOff, setFbOff] = useState(false);
  useEffect(() => { setFbOff(localStorage.getItem("feedback-bubble-off") === "1"); }, []);
  const closeFeedbackBubble = () => { setFbOff(true); localStorage.setItem("feedback-bubble-off", "1"); };
  const toggleSidebar = () => setCollapsed((c) => { localStorage.setItem("sidebar-collapsed", c ? "0" : "1"); return !c; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); toggleSidebar(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = () => supabase.auth.signOut();

  if (!isLoading && !subLoading && (profile?.subscription_status === "vencido" || accessBlocked(mySub))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="panel max-w-md p-8 text-center">
          <Lock className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">{mySub?.status === "canceled" ? tr("Assinatura cancelada") : tr("Assinatura vencida")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{mySub?.status === "canceled" ? tr("Seu acesso terminou. Assine de novo para voltar a usar.") : tr("O pagamento não foi aprovado. Seu acesso volta assim que a cobrança for regularizada.")}</p>
          {mySub?.status === "canceled" && <a href={`${SALES_ORIGIN}/#planos`} className="mt-4 block text-sm text-primary underline">{tr("Assinar de novo")}</a>}
          <Button variant="outline" className="mt-6" onClick={signOut}>{tr("Sair")}</Button>
        </div>
      </div>
    );
  }

  const active = (to: string) => path === to || path.startsWith(to + "/");

  return (
            <LanguageProvider lang={lang}><div className="flex min-h-screen bg-background">
      <aside className={`sticky top-0 hidden h-screen ${collapsed ? "w-16" : "w-56"} shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] md:flex`}>
        <div className={`flex items-start gap-2 py-5 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          {!collapsed && (
            <div>
              <div className="mb-2 h-1 w-8 bg-primary" />
              <div className="flex items-center gap-2 text-sm font-bold leading-tight text-sidebar-foreground"><img src="/ultrax-attached-b6d76d11-e9f3-4cbb-9c6f-6bfde7abb0ed.svg" alt="" className="h-auto w-9 max-w-full object-contain" />NEXO HUB</div>
            </div>
          )}
          <button onClick={toggleSidebar} aria-label={collapsed ? tr("Expandir barra lateral") : tr("Recolher barra lateral")} title={`${tr(collapsed ? "Expandir" : "Recolher")} (⌘B)`}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_SHOW.map((n) => (
            <Link key={n.to} to={n.to} title={collapsed ? `${label(n)}${soon(n.to) ? tr(", em breve") : ""}` : undefined}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm ${collapsed ? "justify-center" : ""} ${soon(n.to) ? "opacity-45" : ""} transition-colors ${active(n.to) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}>
              <n.icon className={`h-4 w-4 ${active(n.to) ? "text-primary" : ""}`} />
              {!collapsed && <><span className={soon(n.to) ? "whitespace-nowrap text-xs" : ""}>{label(n)}</span>{soon(n.to) && <span className="ml-auto shrink-0 whitespace-nowrap text-[9px] text-muted-foreground">{tr("em breve")}</span>}{n.to === "/feedbacks" && fbUnread > 0 && <span className="ml-auto min-w-5 rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground">{fbUnread}</span>}</>}
              {collapsed && n.to === "/feedbacks" && fbUnread > 0 && <span className="absolute right-1 top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-4 text-destructive-foreground">{fbUnread}</span>}
            </Link>
          ))}
        </nav>
        <div className={`flex items-center gap-1 border-t ${collapsed ? "flex-col" : ""} border-sidebar-border p-3`}>
          <Link to="/inbox" aria-label={t("inbox", lang)} title={t("inbox", lang)}
            className={`relative rounded-md p-2 ${active("/inbox") ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Inbox className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-4 text-destructive-foreground">{unread}</span>
            )}
          </Link>
          <Link to="/configuracoes" aria-label={t("configuracoes", lang)} title={t("configuracoes", lang)}
            className={`rounded-md p-2 ${active("/configuracoes") ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Settings className="h-5 w-5" />
          </Link>
          {!collapsed && (
            <button onClick={() => setEditSb(true)} aria-label={tr("Editar barra lateral")} title={tr("Editar barra lateral")} className="rounded-md p-2 text-muted-foreground hover:text-foreground">
              <Pencil className="h-5 w-5" />
            </button>
          )}
          <button onClick={signOut} aria-label={t("sair", lang)} title={t("sair", lang)} className={`${collapsed ? "" : "ml-auto"} rounded-md p-2 text-muted-foreground hover:text-foreground`}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>
      <SidebarEditor open={editSb} onOpenChange={setEditSb} items={NAV_EDIT.map((n) => ({ to: n.to, label: t(n.key, lang) }))} labels={sbLabels} hidden={sbHidden} />
      {showFeedbackBubble(collapsed, path, fbOff) && (
        <div className="fixed bottom-5 left-20 z-40 hidden md:block">
          <Button asChild size="sm" className="h-auto max-w-72 whitespace-normal px-3 py-2 text-left shadow-lg"><Link to="/feedbacks"><MessageSquare className="h-4 w-4 shrink-0" /><span>{tr("Você tem uma sugestão de melhoria?")}<br />{tr("Nos comunique na área de feedbacks.")}</span></Link></Button>
          <button onClick={closeFeedbackBubble} aria-label={tr("Fechar aviso")} title={tr("Fechar aviso")}
            className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2 text-sm font-bold"><img src="/ultrax-attached-b6d76d11-e9f3-4cbb-9c6f-6bfde7abb0ed.svg" alt="" className="h-auto w-8 max-w-full object-contain" />NEXO HUB</div>
          <div className="flex items-center gap-1">
            <Link to="/inbox" aria-label={tr("Caixa de Entrada")} className="relative p-2 text-muted-foreground">
              <Inbox className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
            </Link>
            <Link to="/configuracoes" aria-label={tr("Configurações")} className="p-2 text-muted-foreground"><Settings className="h-5 w-5" /></Link>
            <button onClick={signOut} aria-label={tr("Sair")} className="p-2 text-muted-foreground"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <div className="grid grid-cols-4 gap-1.5 border-b border-border p-3 md:hidden">
          {NAV_SHOW.map((n) => (
            <Link key={n.to} to={n.to}
              className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[10px] ${soon(n.to) ? "opacity-45" : ""} ${active(n.to) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              <n.icon className="h-4 w-4" />
              <span className="max-w-full text-center leading-tight">{label(n)}{soon(n.to) && <span className="block text-[9px]">{tr("em breve")}</span>}</span>{n.to === "/feedbacks" && fbUnread > 0 && <span className="rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">{fbUnread}</span>}
            </Link>
          ))}
        </div>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div></LanguageProvider>
  );
}
