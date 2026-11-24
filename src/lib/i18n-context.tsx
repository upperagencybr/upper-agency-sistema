import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { normalizeLang, translateText, type Lang } from "@/lib/i18n";

const LanguageContext = createContext<Lang>("pt");
export const languageLocale = (lang: Lang) => lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";

export function LanguageProvider({ lang, children }: { lang?: string; children: ReactNode }) {
  const language = normalizeLang(lang);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = languageLocale(language);
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const lang = useContext(LanguageContext);
  return useMemo(() => ({ lang, locale: languageLocale(lang), tr: (text: string, values: readonly unknown[] = []) => translateText(text, lang, values) }), [lang]);
}