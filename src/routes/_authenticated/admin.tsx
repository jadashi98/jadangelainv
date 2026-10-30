import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUp, LogOut, RotateCcw, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { settingsQuery, type WeddingSettings, type HeroMode, type LoadedSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FloralSprig } from "@/components/wedding/Floral";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard — Wedding Admin" },
      { name: "description", content: "Private wedding administration dashboard." },
      { property: "og:title", content: "Dashboard — Wedding Admin" },
      { property: "og:description", content: "Private wedding administration dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function stripLoaded(s: LoadedSettings): WeddingSettings {
  const { heroPath: _p, heroUrl: _u, ...rest } = s;
  return rest;
}

async function saveSettings(data: WeddingSettings, heroPath?: string | null) {
  const patch: { data: Json; updated_at: string; hero_image_url?: string | null } = {
    data: data as unknown as Json,
    updated_at: new Date().toISOString(),
  };
  if (heroPath !== undefined) patch.hero_image_url = heroPath;
  const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
  if (error) throw error;
}

function AdminPage() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (isLoading) return null;
  if (!isAdmin)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-serif text-2xl text-cocoa">This account does not have administrator access.</p>
        <Button variant="luxeOutline" onClick={signOut}>Sign out</Button>
      </main>
    );

  return (
    <main className="min-h-screen bg-secondary/30">
      <header className="border-b border-gold-soft bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="eyebrow">Private dashboard</p>
            <h1 className="font-serif text-2xl text-cocoa">Wedding Administration</h1>
          </div>
          <div className="flex gap-2">
            <a href="/" target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm"><ExternalLink /> View site</Button>
            </a>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Sign out</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Tabs defaultValue="photo">
          <TabsList className="bg-card">
            <TabsTrigger value="photo">Main photo</TabsTrigger>
            <TabsTrigger value="details">Wedding details</TabsTrigger>
            <TabsTrigger value="rsvp">RSVPs</TabsTrigger>
          </TabsList>
          <TabsContent value="photo"><PhotoManager /></TabsContent>
          <TabsContent value="details"><DetailsEditor /></TabsContent>
          <TabsContent value="rsvp"><RsvpList /></TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-gold-soft bg-card p-6 shadow-soft sm:p-8">
      <h2 className="font-serif text-2xl text-cocoa">{title}</h2>
      <FloralSprig className="mt-2 h-6 w-32 text-gold" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PhotoManager() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!s) return null;

  const refresh = () => qc.invalidateQueries({ queryKey: settingsQuery.queryKey });

  const setMode = async (mode: HeroMode, heroPath?: string | null) => {
    setBusy(true);
    try {
      await saveSettings({ ...stripLoaded(s), heroMode: mode }, heroPath);
      await refresh();
      toast.success("Main photo updated — live on your website now.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Please choose a JPG, PNG or WebP photo."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Photo is larger than 15 MB."); return; }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `hero/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-media").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    const old = s.heroPath;
    await setMode("custom", path);
    if (old && old !== path) await supabase.storage.from("site-media").remove([old]);
  };

  const removeCustom = async () => {
    const old = s.heroPath;
    await setMode("none", null);
    if (old) await supabase.storage.from("site-media").remove([old]);
  };

  const label = s.heroMode === "custom" ? "Your own photograph" : s.heroMode === "default" ? "Temporary placeholder photograph" : "No photo — floral design only";

  return (
    <Panel title="Main invitation photo">
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-gold-soft bg-muted">
          {s.heroUrl ? (
            <img src={s.heroUrl} alt="Current main photo" className="aspect-[3/2] w-full object-cover" />
          ) : (
            <div className="flex aspect-[3/2] items-center justify-center font-serif text-lg italic text-muted-foreground">
              Floral design (no photo)
            </div>
          )}
        </div>
        <div className="space-y-3">
          <p className="eyebrow">Currently showing</p>
          <p className="font-serif text-xl text-cocoa">{label}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button variant="luxe" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            <ImageUp /> {s.heroMode === "custom" ? "Replace photo" : "Upload my photo"}
          </Button>
          {s.heroMode !== "default" && (
            <Button variant="luxeOutline" className="w-full" disabled={busy} onClick={() => setMode("default", s.heroMode === "custom" ? undefined : null)}>
              <RotateCcw /> Use placeholder photo
            </Button>
          )}
          {s.heroMode !== "none" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full text-destructive" disabled={busy}>
                  <Trash2 /> Remove photo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove the main photo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your invitation will show the elegant floral design instead.
                    {s.heroMode === "custom" && " Your uploaded photo will be deleted."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={removeCustom}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Tip: a landscape photo of at least 1920px wide looks best. JPG, PNG or WebP, up to 15 MB.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function DetailsEditor() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const [form, setForm] = useState<WeddingSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (s && !form) setForm(stripLoaded(s));
  }, [s, form]);
  if (!form) return null;

  const set = <K extends keyof WeddingSettings>(k: K, v: WeddingSettings[K]) => setForm({ ...form, [k]: v });
  const field = (k: "bride" | "groom" | "ceremonyTime" | "receptionTime" | "venue" | "address" | "mapsUrl", label: string) => (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <Input className="mt-2" value={form[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const localized = (k: "invitation" | "dressCode" | "info", label: string) => (
    <div className="space-y-2">
      <span className="eyebrow">{label}</span>
      {(["en", "es", "ar"] as const).map((l) => (
        <div key={l} className="flex items-start gap-2">
          <span className="mt-2 w-8 text-xs uppercase text-muted-foreground">{l}</span>
          <Textarea dir={l === "ar" ? "rtl" : "ltr"} rows={2} value={form[k][l]} onChange={(e) => set(k, { ...form[k], [l]: e.target.value })} />
        </div>
      ))}
    </div>
  );

  const save = async () => {
    setBusy(true);
    try {
      // keep the latest photo mode chosen in the photo tab
      const latest = qc.getQueryData<LoadedSettings>(settingsQuery.queryKey);
      await saveSettings({ ...form, heroMode: latest?.heroMode ?? form.heroMode });
      await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      toast.success("Changes saved and published.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Wedding details">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("bride", "Bride's name")}
        {field("groom", "Groom's name")}
        <label className="block">
          <span className="eyebrow">Wedding date & time (countdown)</span>
          <Input type="datetime-local" className="mt-2" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        {field("ceremonyTime", "Ceremony time")}
        {field("receptionTime", "Reception time")}
        {field("venue", "Venue name")}
        {field("address", "Venue address")}
        {field("mapsUrl", "Google Maps link")}
      </div>
      <div className="mt-6 space-y-6">
        {localized("invitation", "Invitation message")}
        {localized("dressCode", "Dress code")}
        {localized("info", "Additional information")}
      </div>
      <Button variant="luxe" size="lg" className="mt-8" onClick={save} disabled={busy}>
        Save & publish
      </Button>
    </Panel>
  );
}

function RsvpList() {
  const { data = [] } = useQuery({
    queryKey: ["rsvps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rsvps").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const yes = data.filter((r) => r.attending);
  const total = yes.reduce((a, r) => a + r.guests, 0);
  return (
    <Panel title="RSVP responses">
      <p className="text-sm text-muted-foreground">
        {data.length} responses · {yes.length} attending · {total} guests in total
      </p>
      <div className="mt-4 divide-y divide-border">
        {data.length === 0 && <p className="py-6 font-serif italic text-muted-foreground">No responses yet.</p>}
        {data.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-4">
            <div>
              <p className="font-serif text-lg text-cocoa">{r.name}</p>
              {r.message && <p className="mt-1 text-sm italic text-muted-foreground">“{r.message}”</p>}
            </div>
            <div className="text-end text-sm">
              <p className={r.attending ? "text-gold" : "text-muted-foreground"}>
                {r.attending ? `Attending · ${r.guests}` : "Declined"}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
