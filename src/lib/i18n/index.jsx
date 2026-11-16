import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.js";
import ru from "./ru.js";
import hy from "./hy.js";
import de from "./de.js";
import fr from "./fr.js";
import extras from "./security.js";
import orderUI from "./order-ui.js";
import workspaceUI from "./workspace-ui.js";

export const dictionaries = { en, ru, hy, de, fr };
for (const [language, words] of Object.entries(extras)) Object.assign(dictionaries[language], words, orderUI[language], workspaceUI[language]);
export const languageNames = { en: "English", ru: "Русский", hy: "Հայերեն", de: "Deutsch", fr: "Français" };
export const localeCodes = { en: "en-US", ru: "ru-RU", hy: "hy-AM", de: "de-DE", fr: "fr-FR" };

const STORAGE_KEY = "madetrace_lang";
const I18nContext = createContext(null);

// DE/FR are selectable (see languageNames/the dropdown in App.jsx) but were added
// as a draft machine translation, not part of the product's actual target
// languages (ru/hy/en). Auto-detecting into one of them off a device's bare
// navigator.language — which on a phone can easily differ from whatever the
// person's desktop browser reports — silently lands a first-time visitor in a
// language they never chose and that reads as nonsense. Keep auto-detect
// scoped to the three intended languages; DE/FR stay one click away in the
// picker for anyone who actually wants them.
const AUTO_DETECT_LANGUAGES = ["ru", "hy", "en"];

function detectDefault() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && Object.hasOwn(dictionaries, stored)) return stored;
  } catch { /* Use the device locale if browser storage is unavailable. */ }
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return AUTO_DETECT_LANGUAGES.includes(nav) ? nav : "en";
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(detectDefault);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((value) => {
    const next = Object.hasOwn(dictionaries, value) ? value : "en";
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Language still changes in this tab. */ }
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
