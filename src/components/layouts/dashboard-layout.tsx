"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Users,
  type LucideIcon,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useI18n } from "@/components/providers/i18n-provider";

type NavItem = {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { labelKey: "shell.nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "shell.nav.assets", href: "/assets", icon: Package },
  { labelKey: "shell.nav.borrowRequests", href: "/borrow-requests", icon: ClipboardList },
  { labelKey: "shell.nav.returns", href: "/returns", icon: RotateCcw },
  { labelKey: "shell.nav.history", href: "/history", icon: History },
  { labelKey: "shell.nav.users", href: "/users", icon: Users, roles: ["admin"] },
];

function getVisibleNav(role: UserRole) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

function NavLinks({
  items,
  pathname,
  t,
  onClick,
}: {
  items: NavItem[];
  pathname: string;
  t: (key: string) => string;
  onClick?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/72 hover:bg-white/4 hover:text-sidebar-foreground"
            }`}
          >
            <span
              className={`flex size-8 items-center justify-center rounded-sm ${
                active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-white/5"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) {
    return null;
  }

  const navItems = getVisibleNav(user.role);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const sidebarContent = (
    <div className="surface-panel flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-none">
      <div className="space-y-4 p-4">
        <div className="rounded-sm border border-white/10 bg-white/4 p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-sidebar-primary">
            {t("shell.brand")}
          </p>
          <div className="mt-4 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("shell.workspaceTitle")}
            </h1>
            <p className="text-sm leading-6 text-sidebar-foreground/70">
              {t("shell.workspaceDescription")}
            </p>
          </div>
        </div>

        <div className="rounded-sm border border-white/8 bg-black/8 p-3">
          <p className="px-3 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/40">
            {t("shell.navigation")}
          </p>
          <NavLinks
            items={navItems}
            pathname={pathname}
            t={t}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      </div>

      <div className="mt-auto p-4 pt-0">
        <div className="space-y-3 rounded-sm border border-white/10 bg-white/4 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                {(user.fullName ?? user.externalUserId).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-none">
                  {user.fullName ?? user.externalUserId}
                </p>
                <Badge
                  variant="outline"
                  className="mt-2 border-white/10 bg-white/6 px-2 py-0.5 text-[10px] text-sidebar-foreground"
                >
                  {t(`common.statuses.roles.${user.role}`)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher className="shrink-0 border-white/10 bg-white/6 text-sidebar-foreground hover:bg-white/10" />
              <ThemeToggle className="shrink-0 border-white/10 bg-white/6 text-sidebar-foreground hover:bg-white/10" />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start border-white/10 bg-white/6 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            {t("common.actions.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-shell">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[60] rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-md focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {t("shell.skipToContent")}
      </a>
      <aside className="dashboard-sidebar-rail">
        <div className="dashboard-sidebar-inner">{sidebarContent}</div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          closeLabel={t("common.actions.close")}
          className="w-[18rem] border-0 bg-transparent p-3 shadow-none sm:w-[19rem] sm:p-4"
        >
          <SheetTitle className="sr-only">{t("shell.mobileMenu")}</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      <div className="dashboard-main">
        <Button
          variant="outline"
          size="icon-sm"
          className="fixed left-3 top-3 z-30 lg:hidden"
          aria-label={t("shell.mobileMenu")}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>

        <main id="main-content" tabIndex={-1} className="dashboard-main-inner">
          <header className="mb-5 flex items-center justify-end gap-3 pl-12 lg:mb-6 lg:pl-0">
            <NotificationBell />
          </header>
          <div className="app-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
