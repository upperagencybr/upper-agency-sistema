import { isPlanLimitError } from "@/lib/billing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useServerFn } from "@tanstack/react-start";
import { createFeedback, replyFeedback, readFeedback } from "@/lib/feedback.functions";
import type { feedbackSchema, feedbackReplySchema } from "@/lib/feedback";
import type { z } from "zod";

type T = Database["public"]["Tables"];
export type TableName =
  | "companies" | "clients" | "transactions" | "crm_leads" | "projects"
  | "mentoring_sessions" | "accounting_tasks" | "client_attachments" | "inbox_reads"
  | "monthly_goals" | "nexo_contents" | "tags" | "company_members";
export type Row<N extends TableName> = T[N]["Row"];
export type Insert<N extends TableName> = T[N]["Insert"];
export type Profile = T["profiles"]["Row"];
export type FeedbackThread = T["feedback_threads"]["Row"];
export function useFeedbackThreads() {
  return useQuery({ queryKey: ["feedback-threads"], refetchInterval: 15000, queryFn: async () => {
    const { data, error } = await supabase.from("feedback_threads").select("*").order("updated_at", { ascending: false }).range(0, 9999);
    if (error) throw error;
    return data ?? [];
  } });
}
export function useFeedbackMessages(threadId: string | null) {
  return useQuery({ queryKey: ["feedback-messages", threadId], enabled: !!threadId, refetchInterval: 15000, queryFn: async () => {
    if (!threadId) return [];
    const { data, error } = await supabase.from("feedback_messages").select("*").eq("thread_id", threadId).order("created_at").order("id").range(0, 9999);
    if (error) throw error;
    return data ?? [];
  } });
}
export function useFeedbackActions() {
  const qc = useQueryClient();
  const create = useServerFn(createFeedback), reply = useServerFn(replyFeedback), read = useServerFn(readFeedback);
  const done = () => { void qc.invalidateQueries({ queryKey: ["feedback-threads"] }); void qc.invalidateQueries({ queryKey: ["feedback-messages"] }); };
  const onError = (e: Error) => toast.error(e.message);
  return {
    create: useMutation({ mutationFn: (data: z.infer<typeof feedbackSchema>) => create({ data }), onSuccess: done, onError }),
    reply: useMutation({ mutationFn: (data: z.infer<typeof feedbackReplySchema>) => reply({ data }), onSuccess: done, onError }),
    read: useMutation({ mutationFn: (threadId: string) => read({ data: { threadId } }), onSuccess: done, onError }),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (n: string) => supabase.from(n as any) as any;

export function planToast(e: Error) {
  if (isPlanLimitError(e.message)) {
    toast.error(e.message, { duration: 10000, action: { label: "Ver planos", onClick: () => window.location.assign("/planos") } });
  } else toast.error(e.message);
}

export function useRows<N extends TableName>(name: N) {
  return useQuery({
    queryKey: [name],
    queryFn: async () => {
      const { data, error } = await db(name).select("*").order("id", { ascending: false }).range(0, 9999);
      if (error) throw error;
      return (data ?? []) as Row<N>[];
    },
  });
}

export function useTableMutations<N extends TableName>(name: N) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: [name] });
  const fail = planToast;
  const insert = useMutation({
    mutationFn: async (rows: Insert<N> | Insert<N>[]) => {
      const { error } = await db(name).insert(rows);
      if (error) throw error;
    },
    onSuccess: done,
    onError: fail,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Row<N>> & { id: number }) => {
      const { error } = await db(name).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await db(name).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
    onError: fail,
  });
  return { insert, update, remove };
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: Omit<Insert<"clients">, "id" | "user_id" | "status">) => {
      const { data, error } = await supabase.from("clients").insert({ ...client, status: "ativo" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (client) => {
      qc.setQueryData<Row<"clients">[]>(["clients"], (old = []) => [client, ...old.filter((c) => c.id !== client.id)]);
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("profiles").update(patch).eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function signedUrl(path: string) {
  const { data } = await supabase.storage.from("files").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: () => signedUrl(path!),
  });
}

export async function uploadFile(file: File, folder: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${u.user.id}/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("files").upload(path, file);
  if (error) throw error;
  return path;
}
