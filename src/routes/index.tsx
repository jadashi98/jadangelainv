import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, settingsQuery, type LoadedSettings } from "@/lib/settings";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/wedding/LanguageSwitcher";
import { FloralCorner, FloralSprig } from "@/components/wedding/Floral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "You're Invited — Our Wedding" },
      { name: "description", content: "Join us to celebrate our wedding: date, venue, countdown and RSVP." },
      { property: "og:title", content: "You're Invited — Our Wedding" },
      { property: "og:description", content: "Join us to celebrate our wedding: date, venue, countdown and RSVP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery(settingsQuery);
  const s: LoadedSettings = data ?? { ...DEFAULT_SETTINGS, heroMode: "none", heroPath: null, heroUrl: null };
  const ready = !!data;
  if (!ready) return <main className="min-h-screen bg-background" />;
  return (
    <main className="min-h-screen bg-background">
      <div className="fixed top-4 z-30 w-full px-4">
        <div className="mx-auto flex max-w-6xl justify-end">
          <LanguageSwitcher />
        </div>
      </div>
      <Hero s={s} ready={ready} />
      <Countdown date={s.date} />
      <Details s={s} />
      <Rsvp />
      <footer className="py-12 text-center">
        <FloralSprig className="mx-auto h-8 w-40 text-gold" />
        <p className="mt-4 font-script text-3xl text-cocoa">
          {s.bride} &amp; {s.groom}
        </p>
      </footer>
    </main>
  );
}

function formatDate(iso: string, lang: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const locale = lang === "ar" ? "ar" : lang === "es" ? "es-ES" : "en-GB";
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function Hero({ s, ready }: { s: LoadedSettings; ready: boolean }) {
  const { t, lang } = useI18n();
  const hasPhoto = !!s.heroUrl;
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      {hasPhoto && (
        <>
          <img src={s.heroUrl!} alt="" className="absolute inset-0 h-full w-full object-cover fade-up" />
          <div className="absolute inset-0 bg-veil" />
        </>
      )}
      {!hasPhoto && (
        <>
          <FloralCorner className="absolute left-4 top-4 h-40 w-40 text-gold-soft" />
          <FloralCorner className="absolute bottom-4 right-4 h-40 w-40 rotate-180 text-gold-soft" />
        </>
      )}
      <div
        className={`relative z-10 mx-4 max-w-2xl px-8 py-14 text-center transition-opacity duration-700 sm:px-14 ${
          ready ? "opacity-100" : "opacity-0"
        } ${hasPhoto ? "text-primary-foreground" : "gold-frame bg-card/60 text-cocoa"}`}
      >
        <p className={`eyebrow fade-up ${hasPhoto ? "text-primary-foreground/90" : ""}`}>{t("weddingOf")}</p>
        <h1 className="mt-6 font-serif text-5xl font-light leading-tight fade-up sm:text-7xl">
          {s.bride}
          <span className="mx-3 block font-script text-4xl sm:inline sm:text-6xl">{t("and")}</span>
          {s.groom}
        </h1>
        <FloralSprig className={`mx-auto mt-6 h-8 w-44 ${hasPhoto ? "text-primary-foreground/80" : "text-gold"}`} />
        <p className="mx-auto mt-6 max-w-md font-serif text-xl italic fade-up">{s.invitation[lang]}</p>
        <p className="mt-6 text-sm uppercase tracking-[0.3em]">{formatDate(s.date, lang)}</p>
        <a href="#details" className="mt-10 inline-block">
          <Button variant={hasPhoto ? "luxeOutline" : "luxe"} size="lg" className={hasPhoto ? "border-primary-foreground text-primary-foreground" : ""}>
            {t("scroll")}
          </Button>
        </a>
      </div>
    </section>
  );
}

function Countdown({ date }: { date: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(date).getTime();
  const diff = now === null ? 0 : Math.max(0, target - now);
  const parts = [
    { k: "days" as const, v: Math.floor(diff / 86400000) },
    { k: "hours" as const, v: Math.floor(diff / 3600000) % 24 },
    { k: "minutes" as const, v: Math.floor(diff / 60000) % 60 },
    { k: "seconds" as const, v: Math.floor(diff / 1000) % 60 },
  ];
  return (
    <section className="bg-secondary/50 px-4 py-20 text-center">
      <p className="font-script text-4xl text-gold">{t("countdown")}</p>
      {now !== null && diff === 0 ? (
        <p className="mt-8 font-serif text-4xl text-cocoa">{t("married")}</p>
      ) : (
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-4 gap-3 sm:gap-6">
          {parts.map((p) => (
            <div key={p.k} className="rounded-xl border border-gold-soft bg-card px-2 py-5 shadow-soft">
              <div className="font-serif text-3xl text-cocoa tabular-nums sm:text-5xl">{now === null ? "–" : p.v}</div>
              <div className="mt-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{t(p.k)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Details({ s }: { s: LoadedSettings }) {
  const { t, lang } = useI18n();
  const rows = [
    { label: t("date"), value: formatDate(s.date, lang) },
    { label: t("ceremony"), value: s.ceremonyTime },
    { label: t("reception"), value: s.receptionTime },
    { label: t("venue"), value: `${s.venue}\n${s.address}` },
    { label: t("dressCode"), value: s.dressCode[lang] },
    { label: t("info"), value: s.info[lang] },
  ].filter((r) => r.value.trim());
  return (
    <section id="details" className="px-4 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{t("details")}</p>
        <FloralSprig className="mx-auto mt-4 h-8 w-40 text-gold" />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-gold-soft bg-gold-soft/60 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="bg-card p-8">
              <p className="eyebrow">{r.label}</p>
              <p className="mt-3 whitespace-pre-line font-serif text-xl text-cocoa">{r.value}</p>
            </div>
          ))}
        </div>
        {s.mapsUrl && (
          <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-10 inline-block">
            <Button variant="luxe" size="lg">
              <MapPin /> {t("viewLocation")}
            </Button>
          </a>
        )}
      </div>
    </section>
  );
}

function Rsvp() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [attending, setAttending] = useState(true);
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error(t("nameRequired")); return; }
    setBusy(true);
    const { error } = await supabase.from("rsvps").insert({
      name: name.trim().slice(0, 120),
      attending,
      guests: attending ? Math.min(20, Math.max(1, guests)) : 0,
      message: message.trim().slice(0, 1000) || null,
    });
    setBusy(false);
    if (error) { toast.error(t("error")); return; }
    setDone(true);
  };

  return (
    <section id="rsvp" className="bg-secondary/50 px-4 py-24">
      <div className="mx-auto max-w-xl rounded-2xl border border-gold-soft bg-card p-8 text-center shadow-soft sm:p-12">
        <p className="font-script text-5xl text-gold">{t("rsvp")}</p>
        <p className="mt-3 font-serif text-lg italic text-muted-foreground">{t("rsvpIntro")}</p>
        {done ? (
          <p className="mt-10 font-serif text-2xl text-cocoa">{t("thanks")}</p>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-5 text-start">
            <label className="block">
              <span className="eyebrow">{t("name")}</span>
              <Input className="mt-2 h-11 bg-background" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <div>
              <span className="eyebrow">{t("attending")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <button
                    type="button"
                    key={String(v)}
                    onClick={() => setAttending(v)}
                    className={`rounded-full border px-3 py-3 text-sm transition-colors ${
                      attending === v ? "border-gold bg-gold text-primary-foreground" : "border-border text-cocoa"
                    }`}
                  >
                    {v ? t("accept") : t("decline")}
                  </button>
                ))}
              </div>
            </div>
            {attending && (
              <label className="block">
                <span className="eyebrow">{t("guests")}</span>
                <Input type="number" min={1} max={20} className="mt-2 h-11 bg-background" value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </label>
            )}
            <label className="block">
              <span className="eyebrow">{t("message")}</span>
              <Textarea className="mt-2 bg-background" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
            </label>
            <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={busy}>
              {busy ? t("sending") : t("send")}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
