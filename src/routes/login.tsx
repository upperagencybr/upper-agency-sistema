import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { SALES_ORIGIN } from "@/lib/site";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | NEXO HUB" },
      { name: "description", content: "Acesse o NEXO HUB com seu e-mail e senha." },
      { property: "og:title", content: "Entrar | NEXO HUB" },
      { property: "og:description", content: "Acesse o NEXO HUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

type Mode = "entrar" | "esqueci";

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/sistema" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) nav({ to: "/sistema" });
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Se o e-mail existir, você vai receber o link para criar uma nova senha.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function social() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-sm p-7">
        <div className="mb-6">
          <img src="/ultrax-attached-b6d76d11-e9f3-4cbb-9c6f-6bfde7abb0ed.svg" alt="Símbolo NEXO HUB" className="mb-3 h-auto w-20 max-w-full object-contain" />
          <h1 className="text-2xl font-bold tracking-wide">NEXO HUB</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "entrar" ? "Entre na sua conta" : "Recuperar senha"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="field" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "esqueci" && (
            <input className="field" type="password" required minLength={6} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "entrar" ? "Entrar" : "Enviar link"}
          </Button>
        </form>
        {mode !== "esqueci" && (
          <button type="button" onClick={social}
            className="mt-4 flex h-10 w-full items-center justify-center gap-[10px] rounded-md border border-[#8E918F] bg-[#131314] px-3 text-sm font-medium text-[#E3E3E3]">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continuar com Google
          </button>
        )}
        <div className="mt-5 flex justify-between text-xs text-muted-foreground">
          {mode === "entrar" ? (
            <>
              <a href={`${SALES_ORIGIN}/#planos`} className="hover:text-foreground">Obter assinatura</a>
              <button onClick={() => setMode("esqueci")} className="hover:text-foreground">Esqueci a senha</button>
            </>
          ) : (
            <button onClick={() => setMode("entrar")} className="hover:text-foreground">Voltar para entrar</button>
          )}
        </div>
      </div>
    </div>
  );
}
