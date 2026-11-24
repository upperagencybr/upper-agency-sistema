import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase.from("subscriptions").select("*")
        .eq("user_id", u.user.id).eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllSubscriptions(enabled: boolean) {
  return useQuery({
    queryKey: ["all-subscriptions"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("*")
        .eq("environment", getStripeEnvironment()).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
