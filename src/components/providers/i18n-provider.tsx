"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { localeCookieName, locales, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/shared";
import type { Dictionary, TranslationValues } from "@/lib/i18n/types";

type I18nContextValue = {
  locale: Locale;
  locales: readonly Locale[];
  t: (key: string, values?: TranslationValues) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  dictionary,
}: {
  children: ReactNode;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const router = useRouter();

  const setLocale = useCallback((nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }

    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
    startTransition(() => {
      router.refresh();
    });
  }, [locale, router]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      locales,
      t: (key: string, values?: TranslationValues) =>
        translate(dictionary, key, values),
      setLocale,
    }),
    [dictionary, locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
