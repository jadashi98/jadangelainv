import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es" | "ar";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
];

const dict = {
  en: {
    weddingOf: "The wedding of",
    and: "&",
    scroll: "Discover",
    countdown: "Counting down to forever",
    days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds",
    married: "We are married!",
    details: "Wedding Details",
    date: "Date", ceremony: "Ceremony", reception: "Reception", venue: "Venue",
    dressCode: "Dress code", info: "Good to know",
    viewLocation: "View location",
    rsvp: "RSVP", rsvpIntro: "Kindly let us know if you can join us.",
    name: "Full name", attending: "Will you attend?",
    accept: "Joyfully accepts", decline: "Regretfully declines",
    guests: "Number of guests", message: "A message for the couple (optional)",
    send: "Send response", sending: "Sending…",
    thanks: "Thank you — your response has been received.",
    error: "Something went wrong. Please try again.",
    nameRequired: "Please enter your name.",
  },
  es: {
    weddingOf: "La boda de",
    and: "&",
    scroll: "Descubrir",
    countdown: "La cuenta atrás hacia siempre",
    days: "Días", hours: "Horas", minutes: "Minutos", seconds: "Segundos",
    married: "¡Nos hemos casado!",
    details: "Detalles de la boda",
    date: "Fecha", ceremony: "Ceremonia", reception: "Recepción", venue: "Lugar",
    dressCode: "Código de vestimenta", info: "Información adicional",
    viewLocation: "Ver ubicación",
    rsvp: "Confirmación", rsvpIntro: "Por favor, confírmanos si podrás acompañarnos.",
    name: "Nombre completo", attending: "¿Asistirás?",
    accept: "Acepto con alegría", decline: "Lamentablemente no podré",
    guests: "Número de asistentes", message: "Un mensaje para los novios (opcional)",
    send: "Enviar respuesta", sending: "Enviando…",
    thanks: "Gracias — hemos recibido tu respuesta.",
    error: "Algo salió mal. Inténtalo de nuevo.",
    nameRequired: "Por favor, escribe tu nombre.",
  },
  ar: {
    weddingOf: "حفل زفاف",
    and: "و",
    scroll: "اكتشف",
    countdown: "العدّ التنازلي نحو الأبد",
    days: "أيام", hours: "ساعات", minutes: "دقائق", seconds: "ثوانٍ",
    married: "لقد تزوّجنا!",
    details: "تفاصيل الزفاف",
    date: "التاريخ", ceremony: "المراسم", reception: "الاستقبال", venue: "المكان",
    dressCode: "قواعد اللباس", info: "معلومات إضافية",
    viewLocation: "عرض الموقع",
    rsvp: "تأكيد الحضور", rsvpIntro: "يسعدنا أن تخبرنا إن كنت ستشاركنا فرحتنا.",
    name: "الاسم الكامل", attending: "هل ستحضر؟",
    accept: "أقبل الدعوة بكل سرور", decline: "أعتذر عن الحضور",
    guests: "عدد الحضور", message: "رسالة للعروسين (اختياري)",
    send: "إرسال الرد", sending: "جارٍ الإرسال…",
    thanks: "شكرًا لك — لقد استلمنا ردّك.",
    error: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    nameRequired: "يرجى كتابة اسمك.",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; dir: "ltr" | "rtl" };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("wedding-lang") as Lang | null;
    if (saved && saved in dict) setLangState(saved);
  }, []);
  const dir = lang === "ar" ? "rtl" : "ltr";
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("wedding-lang", l);
  };
  return (
    <I18nContext.Provider value={{ lang, setLang, dir, t: (k) => dict[lang][k] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
