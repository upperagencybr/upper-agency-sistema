import { useRows, useTableMutations, useProfile } from "@/lib/data";

export type Metric = "revenue" | "sales" | "clients";
/** Goal for a month: the month's own goal, else the profile default. */
export function useGoals() {
  const { data: goals = [] } = useRows("monthly_goals");
  const { data: profile } = useProfile();
  const m = useTableMutations("monthly_goals");
  const get = (month: string, metric: Metric) => {
    const g = goals.find((x) => x.month === month);
    if (g) return Number(g[metric]);
    return metric === "revenue" ? Number(profile?.monthly_goal ?? 0) : metric === "sales" ? Number(profile?.goal_sales ?? 0) : Number(profile?.goal_clients ?? 0);
  };
  const set = async (month: string, metric: Metric, v: number) => {
    const g = goals.find((x) => x.month === month);
    if (g) await m.update.mutateAsync({ id: g.id, [metric]: v });
    else await m.insert.mutateAsync({ month, revenue: get(month, "revenue"), sales: get(month, "sales"), clients: get(month, "clients"), [metric]: v });
  };
  return { get, set };
}
