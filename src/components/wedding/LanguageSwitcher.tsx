import { LANGS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={cn("flex items-center gap-1 rounded-full border border-gold-soft/70 bg-card/70 p-1 backdrop-blur", className)}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={cn(
            "rounded-full px-3 py-1 text-xs tracking-wider transition-colors",
            lang === l.code ? "bg-gold text-primary-foreground" : "text-cocoa hover:text-gold",
          )}
          aria-pressed={lang === l.code}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
