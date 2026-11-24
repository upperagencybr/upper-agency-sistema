import { useI18n } from "@/lib/i18n-context";
import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeedbackThreads } from "@/lib/data";
import { feedbackUnread } from "@/lib/feedback";
import { useIsAdmin } from "@/lib/subscription";

export function FeedbackInbox({ read }: { read: boolean }) {
  const { tr } = useI18n();
  const { data: threads = [] } = useFeedbackThreads();
  const { data: admin = false } = useIsAdmin();
  const list = threads.filter(t => feedbackUnread(t, admin) !== read);
  if (!list.length) return null;
  return <section className="mb-6"><h2 className="mb-3 text-sm font-semibold">{tr("Feedbacks e atendimento")}</h2><ul className="space-y-2">{list.map(t => <li key={t.id} className="flex items-center gap-3 border border-border p-3"><MessageSquare className="h-4 w-4 shrink-0 text-primary" /><Button asChild variant="link" className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left"><Link to="/feedbacks" search={{ conversa: t.id }}><span className="min-w-0"><span className="block text-sm">{admin ? `${tr(t.category)}, ${t.author_email}` : tr("Upper Agency BR respondeu: {0}", [tr(t.category)])}</span><span className="line-clamp-2 block text-xs text-muted-foreground">{t.preview}</span></span></Link></Button></li>)}</ul></section>;
}