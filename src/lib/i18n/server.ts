import "server-only";

import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";
import { dictionaries } from "./messages";
import { translate } from "./shared";
import type { Dictionary, TranslationValues } from "./types";

function resolvePreferredLocale(headerValue: string | null): Locale {
  if (!headerValue) {
    return defaultLocale;
  }

  const languages = headerValue
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase())
    .filter((value): value is string => Boolean(value));

  for (const language of languages) {
    if (isLocale(language)) {
      return language;
    }

    const baseLanguage = language.split("-")[0];
    if (baseLanguage && isLocale(baseLanguage)) {
      return baseLanguage;
    }
  }

  return defaultLocale;
}

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return resolvePreferredLocale(headerStore.get("accept-language"));
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const resolvedLocale = locale ?? (await getRequestLocale());
  return dictionaries[resolvedLocale];
}

export async function getTranslator(locale?: Locale) {
  const resolvedLocale = locale ?? (await getRequestLocale());
  const dictionary = await getDictionary(resolvedLocale);

  return {
    locale: resolvedLocale,
    dictionary,
    t: (key: string, values?: TranslationValues) =>
      translate(dictionary, key, values),
  };
}
