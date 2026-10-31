import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es" | "ar";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
];

const dict = {
  en: {
    shareEyebrow: "Our wedding album", yourName: "Your name (optional)",
    takePhoto: "Take a photo", choosePhotos: "Choose from gallery",
    uploading: "Uploading…", photosLeft: "photos remaining", of: "of",
    shareSuccess: "Thank you! Your photos have been shared with the couple.",
    limitReached: "You have reached your limit of photos. Thank you for sharing!",
    uploadsClosed: "Photo sharing is currently closed.",
    badType: "Only photos (JPG, PNG, WebP, HEIC) can be shared.", tooBig: "This photo is larger than 25 MB.",
    yourUploads: "Your shared photos", privateNote: "Only you and the couple can see the photos you share.",
    backToInvite: "Back to the invitation",
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
    shareEyebrow: "Nuestro álbum de boda", yourName: "Tu nombre (opcional)",
    takePhoto: "Hacer una foto", choosePhotos: "Elegir de la galería",
    uploading: "Subiendo…", photosLeft: "fotos restantes", of: "de",
    shareSuccess: "¡Gracias! Tus fotos se han compartido con los novios.",
    limitReached: "Has alcanzado tu límite de fotos. ¡Gracias por compartir!",
    uploadsClosed: "El envío de fotos está cerrado por ahora.",
    badType: "Solo se pueden compartir fotos (JPG, PNG, WebP, HEIC).", tooBig: "Esta foto supera los 25 MB.",
    yourUploads: "Tus fotos compartidas", privateNote: "Solo tú y los novios podéis ver las fotos que compartes.",
    backToInvite: "Volver a la invitación",
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
    shareEyebrow: "ألبوم زفافنا", yourName: "اسمك (اختياري)",
    takePhoto: "التقط صورة", choosePhotos: "اختر من المعرض",
    uploading: "جارٍ الرفع…", photosLeft: "صور متبقية", of: "من",
    shareSuccess: "شكرًا لك! تمت مشاركة صورك مع العروسين.",
    limitReached: "لقد وصلت إلى الحد الأقصى للصور. شكرًا لمشاركتك!",
    uploadsClosed: "مشاركة الصور مغلقة حاليًا.",
    badType: "يمكن مشاركة الصور فقط (JPG، PNG، WebP، HEIC).", tooBig: "حجم هذه الصورة أكبر من 25 ميغابايت.",
    yourUploads: "صورك المشاركة", privateNote: "لا يرى صورك إلا أنت والعروسان.",
    backToInvite: "العودة إلى الدعوة",
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
