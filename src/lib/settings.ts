import type React from "react";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import placeholderHero from "@/assets/wedding-hero.jpg.asset.json";
import type { Lang } from "./i18n";

export type Localized = Record<Lang, string>;
export type HeroMode = "default" | "custom" | "none";

export type WeddingSettings = {
  heroMode: HeroMode;
  bride: string;
  groom: string;
  date: string;
  ceremonyTime: string;
  receptionTime: string;
  venue: string;
  address: string;
  mapsUrl: string;
  invitation: Localized;
  dressCode: Localized;
  info: Localized;
  shareWelcome: Localized;
  uploadLimit: number;
  uploadsEnabled: boolean;
  rsvpEnabled: boolean;
  theme: { accent: string; background: string; text: string; headingFont: string; animations: boolean };
};

export const DEFAULT_SETTINGS: WeddingSettings = {
  heroMode: "default",
  bride: "Angela",
  groom: "Jad",
  date: "2027-11-27T17:00",
  ceremonyTime: "",
  receptionTime: "",
  venue: "Mas dels Doblons",
  address: "Castellón, Spain",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mas+dels+Doblons+Castellon+Spain",
  invitation: {
    en: "Together with our families, we joyfully invite you to celebrate our wedding.",
    es: "Junto a nuestras familias, te invitamos con alegría a celebrar nuestra boda.",
    ar: "بمشاركة عائلتينا، يسعدنا أن ندعوكم لمشاركتنا فرحة زفافنا.",
  },
  dressCode: {
    en: "We look forward to celebrating this special day with you.",
    es: "Tenemos muchas ganas de celebrar este día tan especial contigo.",
    ar: "نتطلع للاحتفال بهذا اليوم المميز معكم.",
  },
  info: {
    en: "",
    es: "",
    ar: "",
  },
  shareWelcome: {
    en: "Capture the moments, share the memories. Share your favourite moments from our day with us.",
    es: "Captura los momentos y comparte con nosotros tus recuerdos favoritos de nuestro día.",
    ar: "التقطوا اللحظات وشاركونا أجمل ذكريات يومنا.",
  },
  uploadLimit: 25,
  uploadsEnabled: true,
  rsvpEnabled: true,
  theme: { accent: "#b8955a", background: "#faf6ee", text: "#55463a", headingFont: "Cormorant Garamond", animations: true },
};

export const HEADING_FONTS = ["Cormorant Garamond", "Playfair Display", "Bodoni Moda", "Marcellus", "Cinzel"];

export function themeStyle(t: WeddingSettings["theme"]): React.CSSProperties {
  return {
    ["--gold" as string]: t.accent,
    ["--primary" as string]: t.accent,
    ["--ring" as string]: t.accent,
    ["--background" as string]: t.background,
    ["--ivory" as string]: t.background,
    ["--foreground" as string]: t.text,
    ["--cocoa" as string]: t.text,
    ["--font-serif" as string]: `"${t.headingFont}", "Amiri", serif`,
  };
}

export const PLACEHOLDER_HERO_URL = placeholderHero.url;
export type LoadedSettings = WeddingSettings & { heroPath: string | null; heroUrl: string | null };

export async function fetchSettings(): Promise<LoadedSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("hero_image_url, data")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  const stored = (data?.data ?? {}) as Partial<WeddingSettings>;
  const merged: WeddingSettings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    invitation: { ...DEFAULT_SETTINGS.invitation, ...stored.invitation },
    dressCode: { ...DEFAULT_SETTINGS.dressCode, ...stored.dressCode },
    info: { ...DEFAULT_SETTINGS.info, ...stored.info },
    shareWelcome: { ...DEFAULT_SETTINGS.shareWelcome, ...stored.shareWelcome },
    theme: { ...DEFAULT_SETTINGS.theme, ...stored.theme },
  };
  const heroPath = data?.hero_image_url ?? null;
  let heroUrl: string | null = null;
  if (merged.heroMode === "default") heroUrl = PLACEHOLDER_HERO_URL;
  if (merged.heroMode === "custom" && heroPath) {
    const { data: signed } = await supabase.storage.from("site-media").createSignedUrl(heroPath, 60 * 60 * 24 * 7);
    heroUrl = signed?.signedUrl ?? null;
  }
  return { ...merged, heroPath, heroUrl };
}

export const settingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: fetchSettings,
  staleTime: 60_000,
});
