import { useI18n } from "@/lib/i18n-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadCount } from "@/lib/useNotices";
import { fmtDate } from "@/lib/format";
import { whenLabel } from "@/lib/notices";
import { Empty, PageHeader } from "@/components/app/ui";
import { FeedbackInbox } from "@/components/app/FeedbackInbox";
import { useFeedbackThreads } from "@/lib/data";
import { useIsAdmin } from "@/lib/subscription";
import { feedbackUnread } from "@/lib/feedback";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({
    meta: [
      { title: "Caixa de Entrada | NEXO HUB" },
      { name: "description", content: "Avisos de vencimentos, prazos e retornos." },
      { property: "og:title", content: "Caixa de Entrada | NEXO HUB" },
      { property: "og:description", content: "Avisos de vencimentos e prazos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { tr, lang } = useI18n();
  const qc = useQueryClient();
  const { notices, readSet, unread } = useUnreadCount();
  const { data: feedbacks = [] } = useFeedbackThreads();
  const { data: admin = false } = useIsAdmin();
  const feedbackCount = feedbacks.filter(t => feedbackUnread(t, admin)).length;
  const [f, setF] = useState<"nao" | "lidas">("nao");
  const list = notices.filter((n) => (f === "nao" ? !readSet.has(n.key) : readSet.has(n.key)));

  const check = async (key: string) => {
    await supabase.from("inbox_reads").insert({ notice_key: key });
    qc.invalidateQueries({ queryKey: ["inbox_reads"] });
  };

  return (
    <div>
      <PageHeader title={tr("Caixa de Entrada")} sub={tr("{0} não lida{1}", [unread + feedbackCount, unread + feedbackCount === 1 ? "" : "s"])} />
      <div className="mb-4 flex gap-2">
        <button className="chip" data-on={f === "nao"} onClick={() => setF("nao")}>{tr("Não lidas")}</button>
        <button className="chip" data-on={f === "lidas"} onClick={() => setF("lidas")}>{tr("Lidas")}</button>
      </div>
      <FeedbackInbox read={f === "lidas"} />
      {list.length === 0 ? (feedbacks.filter(t => feedbackUnread(t, admin) !== (f === "lidas")).length === 0 && <Empty>{f === "nao" ? tr("Tudo em dia.") : tr("Nenhum aviso marcado ainda.")}</Empty>) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.key} className="panel flex items-center gap-3 p-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${n.days < 0 ? "bg-destructive" : n.days === 0 ? "bg-warning" : "bg-primary"}`} />
              <Link to={n.to} className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{n.title}</div>
                <div className="truncate text-xs text-muted-foreground">{fmtDate(n.date)} · {whenLabel(n.days, lang)}{n.detail ? ` · ${n.detail}` : ""}</div>
              </Link>
              {f === "nao" && (
                <button aria-label={tr("Marcar como lida")} onClick={() => check(n.key)} className="rounded border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary"><Check className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
