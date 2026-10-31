import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Images, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/settings";
import { useI18n } from "@/lib/i18n";
import { ALLOWED_TYPES, MAX_PHOTO_BYTES } from "@/lib/photo-rules";
import { startGuestSession, requestUpload, confirmUpload } from "@/lib/photos.functions";
import { LanguageSwitcher } from "@/components/wedding/LanguageSwitcher";
import { FloralSprig } from "@/components/wedding/Floral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Share your wedding photos" },
      { name: "description", content: "Upload the photos you took at our wedding — straight from your phone." },
      { property: "og:title", content: "Share your wedding photos" },
      { property: "og:description", content: "Upload the photos you took at our wedding — straight from your phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharePage,
});

const KEY = "wedding-guest-token";
type Status = { used: number; limit: number; enabled: boolean; photos: { id: string; url: string }[] };

function SharePage() {
  const { t, lang, dir } = useI18n();
  const { data: s } = useQuery(settingsQuery);
  const start = useServerFn(startGuestSession);
  const reserve = useServerFn(requestUpload);
  const confirm = useServerFn(confirmUpload);
  const [token, setToken] = useState<string | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    setName(localStorage.getItem(KEY + "-name") ?? "");
    start({ data: { token: saved } }).then((r) => {
      localStorage.setItem(KEY, r.token);
      setToken(r.token);
      setSt(r);
    });
  }, [start]);

  const upload = async (files: File[]) => {
    if (!token || !st) return;
    setMsg(null);
    if (name.trim()) {
      localStorage.setItem(KEY + "-name", name.trim());
      await start({ data: { token, name } });
    }
    const room = st.limit - st.used;
    if (room <= 0) return setMsg({ kind: "err", text: t("limitReached") });
    const list = files.slice(0, room);
    let ok = 0;
    let last: Status | null = null;
    let err: string | null = files.length > room ? t("limitReached") : null;
    setBusy({ done: 0, total: list.length });
    for (const f of list) {
      const type = f.type || (/\.hei[cf]$/i.test(f.name) ? "image/heic" : "");
      if (!ALLOWED_TYPES.includes(type)) { err = t("badType"); continue; }
      if (f.size > MAX_PHOTO_BYTES) { err = t("tooBig"); continue; }
      try {
        const r = await reserve({ data: { token, name: f.name, type, size: f.size } });
        if ("error" in r) {
          err = r.error === "limit" ? t("limitReached") : r.error === "disabled" ? t("uploadsClosed") : t("error");
          if (r.error === "limit" || r.error === "disabled") break;
          continue;
        }
        const { error } = await supabase.storage.from("wedding-photos").uploadToSignedUrl(r.path, r.uploadToken, f, { contentType: type });
        if (error) { err = t("error"); continue; }
        last = { ...(await confirm({ data: { token, photoId: r.photoId } })), enabled: st.enabled };
        ok++;
      } catch {
        err = t("error");
      }
      setBusy((b) => b && { ...b, done: b.done + 1 });
    }
    if (last) setSt(last);
    setBusy(null);
    setMsg(ok > 0 ? { kind: "ok", text: t("shareSuccess") + (err ? ` ${err}` : "") } : { kind: "err", text: err ?? t("error") });
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) upload(files);
  };

  const left = st ? Math.max(0, st.limit - st.used) : 0;
  const closed = st && !st.enabled;

  return (
    <main dir={dir} className="min-h-screen bg-background px-4 pb-16 pt-20">
      <div className="fixed inset-x-0 top-4 z-30 px-4">
        <div className="mx-auto flex max-w-xl justify-end"><LanguageSwitcher /></div>
      </div>
      <section className="mx-auto max-w-xl rounded-3xl border border-gold-soft bg-card p-6 text-center shadow-soft sm:p-10">
        <p className="eyebrow">{t("shareEyebrow")}</p>
        {s && <p className="mt-3 font-script text-4xl text-cocoa">{s.bride} {t("and")} {s.groom}</p>}
        <h1 className="mt-2 font-serif text-3xl text-cocoa sm:text-4xl">{s?.shareTitle[lang]}</h1>
        <FloralSprig className="mx-auto mt-3 h-6 w-32 text-gold" />
        <p className="mt-4 font-serif text-lg italic text-muted-foreground">{s?.shareWelcome[lang]}</p>

        {!st ? (
          <p className="mt-8 text-sm text-muted-foreground">…</p>
        ) : closed ? (
          <p className="mt-8 font-serif text-xl text-cocoa">{t("uploadsClosed")}</p>
        ) : (
          <div className="mt-8 space-y-4">
            {s?.askGuestName && (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourName")} maxLength={80} className="text-center" />
            )}
            <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
            <input ref={gal} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="luxe" size="lg" disabled={!!busy || left === 0} onClick={() => cam.current?.click()}>
                <Camera /> {t("takePhoto")}
              </Button>
              <Button variant="luxeOutline" size="lg" disabled={!!busy || left === 0} onClick={() => gal.current?.click()}>
                <Images /> {t("choosePhotos")}
              </Button>
            </div>
            {busy ? (
              <div>
                <p className="text-sm text-cocoa">{t("uploading")} {busy.done} / {busy.total}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gold transition-all" style={{ width: `${(busy.done / busy.total) * 100}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{left} {t("of")} {st.limit} {t("photosLeft")}</p>
            )}
          </div>
        )}

        {msg && (
          <div className={`mt-6 rounded-2xl border p-5 ${msg.kind === "ok" ? "border-gold bg-secondary/60" : "border-destructive/40"}`}>
            {msg.kind === "ok" && <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-gold" />}
            <p className={`font-serif text-lg ${msg.kind === "ok" ? "text-cocoa" : "text-destructive"}`}>{msg.text}</p>
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">{t("privateNote")}</p>
      </section>

      {st && st.photos.length > 0 && (
        <section className="mx-auto mt-8 max-w-xl">
          <p className="eyebrow text-center">{t("yourUploads")}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {st.photos.map((p) => (
              <img key={p.id} src={p.url} alt="" className="aspect-square w-full rounded-lg border border-gold-soft object-cover" />
            ))}
          </div>
        </section>
      )}
      <p className="mt-10 text-center"><Link to="/" className="text-sm text-gold underline-offset-4 hover:underline">{t("backToInvite")}</Link></p>
    </main>
  );
}
