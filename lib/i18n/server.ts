import { cookies } from "next/headers";
import { LOCALE_COOKIE, makeT, normalizeLocale, type Locale } from "./shared";

export async function getLocale(): Promise<Locale> {
  return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** Translator for server components, based on the visitor's `lang` cookie. */
export async function getT() {
  return makeT(await getLocale());
}
