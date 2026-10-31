import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, Copy, Printer, QrCode } from "lucide-react";
import QRCode from "qrcode";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { settingsQuery, type WeddingSettings, type LoadedSettings } from "@/lib/settings";
import { MAX_PHOTOS_PER_GUEST } from "@/lib/photo-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FloralSprig } from "@/components/wedding/Floral";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-gold-soft bg-card p-6 shadow-soft sm:p-8">
      <h2 className="font-serif text-2xl text-cocoa">{title}</h2>
      <FloralSprig className="mt-2 h-6 w-32 text-gold" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function strip(s: LoadedSettings): WeddingSettings {
  const { heroPath: _p, heroUrl: _u, ...rest } = s;
  return rest;
}

export function UploadSettings() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const [f, setF] = useState<WeddingSettings | null>(null);
  useEffect(() => { if (s && !f) setF(strip(s)); }, [s, f]);
  if (!f) return null;
  const save = async () => {
    const latest = qc.getQueryData<LoadedSettings>(settingsQuery.queryKey);
    const merged = latest ? { ...strip(latest), shareTitle: f.shareTitle, shareWelcome: f.shareWelcome, askGuestName: f.askGuestName, uploadLimit: f.uploadLimit, uploadsEnabled: f.uploadsEnabled } : f;
    const { error } = await supabase.from("site_settings").update({ data: merged as unknown as Json, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
    toast.success("Photo sharing settings saved.");
  };
  const loc = (k: "shareTitle" | "shareWelcome", label: string, rows: number) => (
    <div className="space-y-2">
      <span className="eyebrow">{label}</span>
      {(["en", "es", "ar"] as const).map((l) => (
        <div key={l} className="flex items-start gap-2">
          <span className="mt-2 w-8 text-xs uppercase text-muted-foreground">{l}</span>
          <Textarea rows={rows} dir={l === "ar" ? "rtl" : "ltr"} value={f[k][l]} onChange={(e) => setF({ ...f, [k]: { ...f[k], [l]: e.target.value } })} />
        </div>
      ))}
    </div>
  );
  return (
    <Panel title="Photo sharing settings">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-gold-soft p-4">
          <span className="text-sm text-cocoa">Guests can upload</span>
          <Switch checked={f.uploadsEnabled} onCheckedChange={(v) => setF({ ...f, uploadsEnabled: v })} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-gold-soft p-4">
          <span className="text-sm text-cocoa">Ask for guest's name</span>
          <Switch checked={f.askGuestName} onCheckedChange={(v) => setF({ ...f, askGuestName: v })} />
        </label>
        <label className="rounded-xl border border-gold-soft p-4">
          <span className="text-sm text-cocoa">Photos per guest (max {MAX_PHOTOS_PER_GUEST})</span>
          <Input type="number" min={1} max={MAX_PHOTOS_PER_GUEST} className="mt-2" value={f.uploadLimit}
            onChange={(e) => setF({ ...f, uploadLimit: Math.max(1, Math.min(MAX_PHOTOS_PER_GUEST, Number(e.target.value) || 1)) })} />
        </label>
      </div>
      <div className="mt-6 space-y-6">
        {loc("shareTitle", "Page title", 1)}
        {loc("shareWelcome", "Welcome message", 2)}
      </div>
      <Button variant="luxe" size="lg" className="mt-8" onClick={save}>Save & publish</Button>
    </Panel>
  );
}

type Row = { id: string; path: string; original_name: string | null; created_at: string; session_id: string; url?: string; guest?: string | null };

export function PhotoGallery() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["guest-photos"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("photos").select("id, path, original_name, created_at, session_id").eq("status", "done").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data.length) return [];
      const [{ data: signed }, { data: sessions }] = await Promise.all([
        supabase.storage.from("wedding-photos").createSignedUrls(data.map((r) => r.path), 3600),
        supabase.from("guest_sessions").select("id, guest_name").in("id", [...new Set(data.map((r) => r.session_id))]),
      ]);
      const names = new Map(sessions?.map((x) => [x.id, x.guest_name]));
      return data.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? undefined, guest: names.get(r.session_id) }));
    },
  });
  const guests = new Set(data.map((r) => r.session_id)).size;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const zip = async (rows: Row[]) => {
    if (!rows.length) return;
    setZipping(true);
    try {
      const z = new JSZip();
      for (const [i, r] of rows.entries()) {
        const { data: blob, error } = await supabase.storage.from("wedding-photos").download(r.path);
        if (error || !blob) continue;
        const who = (r.guest || "guest").replace(/[^\p{L}\p{N}]+/gu, "-");
        z.file(`${String(i + 1).padStart(3, "0")}-${who}.${r.path.split(".").pop()}`, blob);
      }
      const out = await z.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = "wedding-photos.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setZipping(false);
    }
  };

  const remove = async () => {
    const rows = data.filter((r) => sel.has(r.id));
    if (!rows.length || !confirm(`Delete ${rows.length} photo(s) permanently?`)) return;
    await supabase.storage.from("wedding-photos").remove(rows.map((r) => r.path));
    const { error } = await supabase.from("photos").delete().in("id", rows.map((r) => r.id));
    if (error) return toast.error(error.message);
    setSel(new Set());
    qc.invalidateQueries({ queryKey: ["guest-photos"] });
    toast.success("Photos deleted.");
  };

  return (
    <Panel title="Guest photo gallery">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{data.length} photos from {guests} guests</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="luxe" size="sm" disabled={zipping || !data.length} onClick={() => zip(data)}><Download /> {zipping ? "Preparing…" : "Download all (ZIP)"}</Button>
          <Button variant="luxeOutline" size="sm" disabled={zipping || !sel.size} onClick={() => zip(data.filter((r) => sel.has(r.id)))}>Download selected</Button>
          <Button variant="ghost" size="sm" className="text-destructive" disabled={!sel.size} onClick={remove}><Trash2 /> Delete selected</Button>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-8 font-serif italic text-muted-foreground">No guest photos yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.map((r) => (
            <button key={r.id} onClick={() => toggle(r.id)} className={`overflow-hidden rounded-xl border text-start transition ${sel.has(r.id) ? "border-gold ring-2 ring-gold" : "border-gold-soft"}`}>
              {r.url && <img src={r.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />}
              <div className="p-2 text-xs">
                <p className="truncate text-cocoa">{r.guest || "Anonymous guest"}</p>
                <p className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function QrPanel() {
  const { data: s } = useQuery(settingsQuery);
  const [url, setUrl] = useState("");
  const [png, setPng] = useState("");
  useEffect(() => {
    const u = `${window.location.origin}/share`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 1200, margin: 2, color: { dark: "#55463a", light: "#faf6ee" } }).then(setPng);
  }, []);
  const print = () => {
    const w = window.open("", "_blank");
    if (!w || !s) return;
    w.document.write(`<html><head><title>Table sign</title><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital@0;1&family=Great+Vibes&display=swap" rel="stylesheet"><style>
      body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#faf6ee;font-family:'Cormorant Garamond',serif;color:#55463a}
      .c{width:5in;padding:.5in;border:1px solid #b8955a;outline:1px solid #b8955a;outline-offset:-10px;text-align:center}
      .n{font-family:'Great Vibes',cursive;font-size:42px}.t{font-size:28px;letter-spacing:.15em;text-transform:uppercase}
      img{width:3in;height:3in;margin:18px 0}p{font-style:italic;font-size:18px;margin:4px 0}</style></head><body><div class="c">
      <div class="n">${s.bride} &amp; ${s.groom}</div><div class="t">${s.shareTitle.en}</div><img src="${png}"/>
      <p>${s.shareTitle.es} · ${s.shareTitle.ar}</p><p>Scan with your phone camera</p></div>
      <script>setTimeout(()=>print(),600)</script></body></html>`);
    w.document.close();
  };
  return (
    <Panel title="QR code for guests">
      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        {png ? <img src={png} alt="QR code to the guest photo page" className="mx-auto h-56 w-56 rounded-xl border border-gold-soft" /> : <QrCode className="h-56 w-56 text-muted" />}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Guests scan this to open the photo-sharing page directly.</p>
          <p className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs text-cocoa">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="luxe" size="sm" onClick={() => { const a = document.createElement("a"); a.href = png; a.download = "wedding-qr.png"; a.click(); }}><Download /> Download PNG</Button>
            <Button variant="luxeOutline" size="sm" onClick={print}><Printer /> Print table sign</Button>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied."); }}><Copy /> Copy link</Button>
          </div>
          <p className="text-xs text-muted-foreground">Tip: print after publishing so the code points to your live website address.</p>
        </div>
      </div>
    </Panel>
  );
}
