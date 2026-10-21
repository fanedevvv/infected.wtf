import ro from "./dict-ro";
import ru from "./dict-ru";

export type Locale = "en" | "ro" | "ru";
export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "ro", label: "Română", short: "RO" },
  { id: "ru", label: "Русский", short: "RU" },
];
export const LOCALE_COOKIE = "lang";

// Dictionaries are keyed by the English source string, so untranslated text simply falls back to English.
const DICTS: Record<Exclude<Locale, "en">, Record<string, string>> = { ro, ru };

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "ro" || value === "ru" ? value : "en";
}

export type TFunction = (text: string, vars?: Record<string, string | number>) => string;

/** Returns a translator for `locale`. `{name}` placeholders are filled from `vars`. */
export function makeT(locale: Locale): TFunction {
  const dict = locale === "en" ? null : DICTS[locale];
  return (text, vars) => {
    let out = dict?.[text] ?? text;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  };
}
