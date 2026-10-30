import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloralSprig } from "@/components/wedding/Floral";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Administrator Sign In — Wedding" },
      { name: "description", content: "Private sign in for the wedding organizers." },
      { property: "og:title", content: "Administrator Sign In — Wedding" },
      { property: "og:description", content: "Private sign in for the wedding organizers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { data: adminExists, isLoading } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_exists");
      return !!data;
    },
  });
  const setup = adminExists === false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (setup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/admin" });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="gold-frame w-full max-w-md bg-card p-10 text-center shadow-soft">
        <p className="eyebrow">Private</p>
        <h1 className="mt-3 font-serif text-4xl text-cocoa">
          {setup ? "Create administrator" : "Administrator"}
        </h1>
        <FloralSprig className="mx-auto mt-4 h-8 w-40 text-gold" />
        {isLoading ? null : sent ? (
          <p className="mt-8 font-serif text-lg text-cocoa">
            Check your inbox and click the confirmation link, then sign in here.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 text-start">
            {setup && (
              <p className="text-sm text-muted-foreground">
                No administrator exists yet. The first account created becomes the only administrator.
              </p>
            )}
            <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            <Input type="password" required minLength={8} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={busy}>
              {setup ? "Create account" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
