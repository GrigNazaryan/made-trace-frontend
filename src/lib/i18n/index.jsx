import { createContext, useCallback, useContext, useMemo, useState } from "react";
import en from "./en.js";
import ru from "./ru.js";
import hy from "./hy.js";
import de from "./de.js";
import fr from "./fr.js";
import extras from "./security.js";

export const dictionaries = { en, ru, hy, de, fr };
for (const [language, words] of Object.entries(extras)) Object.assign(dictionaries[language], words);
export const languageNames = { en: "English", ru: "Русский", hy: "Հայերեն", de: "Deutsch", fr: "Français" };
export const localeCodes = { en: "en-US", ru: "ru-RU", hy: "hy-AM", de: "de-DE", fr: "fr-FR" };

const STORAGE_KEY = "madetrace_lang";
const I18nContext = createContext(null);

function detectDefault() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && dictionaries[stored]) return stored;
  const nav = (navigator.language || "en").slice(0, 2);
  return dictionaries[nav] ? nav : "en";
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(detectDefault);

  const setLanguage = useCallback((value) => {
    const next = dictionaries[value] ? value : "en";
    localStorage.setItem(STORAGE_KEY, next);
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key, values = {}) => {
      let value = dictionaries[language]?.[key] ?? en[key] ?? key;
      if (typeof value === "object") {
        const category = new Intl.PluralRules(localeCodes[language]).select(values.count ?? 0);
        value = value[category] ?? value.other ?? key;
      }
      return String(value).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
    },
    [language]
  );

  const formatDate = useCallback(
    (iso, options = { year: "numeric", month: "short", day: "numeric" }) => {
      if (!iso) return "";
      try {
        return new Intl.DateTimeFormat(localeCodes[language], options).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [language]
  );

  const formatMoney = useCallback(
    (amount, currency = "USD") => {
      if (amount === null || amount === undefined) return "";
      try {
        return new Intl.NumberFormat(localeCodes[language], { style: "currency", currency }).format(amount);
      } catch {
        return `${amount} ${currency}`;
      }
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, formatDate, formatMoney }),
    [language, setLanguage, t, formatDate, formatMoney]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Turns a backend error code (ApiError#code, e.g. "invalid_credentials") into UI text. */
export function errorText(t, code) {
  if (!code) return t("common_error_generic");
  const key = `err_${code}`;
  const dict = dictionaries.en;
  return dict[key] ? t(key) : code;
}
