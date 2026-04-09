import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { I18nProvider } from "@/components/providers/i18n-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getDictionary, getRequestLocale } from "@/lib/i18n/server";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const themeInitScript = `
(() => {
  const storageKey = "theme";
  const mediaQuery = "(prefers-color-scheme: dark)";
  const root = document.documentElement;

  const storedTheme = window.localStorage.getItem(storageKey);
  const preferredTheme =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system";
  const resolvedTheme =
    preferredTheme === "system"
      ? (window.matchMedia(mediaQuery).matches ? "dark" : "light")
      : preferredTheme;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
})();
`;

export const metadata: Metadata = {
  title: "Kurupan Asset Borrowing and Return System",
  description: "Asset borrowing and return management system",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative min-h-screen min-h-dvh bg-transparent text-foreground">
        <ThemeProvider>
          <I18nProvider locale={locale} dictionary={dictionary}>
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(243,244,246,1))] dark:bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(15,23,42,1))]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
            </div>
            <AuthProvider initialUser={null} initialResolved>
              {children}
              <Toaster position="top-right" />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
