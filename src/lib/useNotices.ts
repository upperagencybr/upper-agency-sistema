import { useProfile, useRows } from "./data";
import { useIsAdmin } from "./subscription";
import { buildNotices } from "./notices";

export function useUnreadCount() {
  const tx = useRows("transactions");
  const acc = useRows("accounting_tasks");
  const pr = useRows("projects");
  const me = useRows("mentoring_sessions");
  const le = useRows("crm_leads");
  const reads = useRows("inbox_reads");
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const notices = buildNotices({ transactions: tx.data, accounting: acc.data, projects: pr.data, mentoring: me.data, leads: le.data, prefs: profile?.notice_prefs, hide: isAdmin ? [] : ["cont"], lang: profile?.lang ?? "pt" });
  const readSet = new Set((reads.data ?? []).map((r) => r.notice_key));
  return { notices, readSet, unread: notices.filter((n) => !readSet.has(n.key)).length };
}

