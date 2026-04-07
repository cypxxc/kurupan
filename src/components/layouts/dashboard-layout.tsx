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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth, type UserRole } from "@/lib/auth-context";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "ครุภัณฑ์", href: "/assets", icon: Package },
  { label: "คำขอยืม", href: "/borrow-requests", icon: ClipboardList },
  { label: "การคืน", href: "/returns", icon: RotateCcw },
  { label: "ประวัติ", href: "/history", icon: History },
  { label: "จัดการผู้ใช้", href: "/users", icon: Users, roles: ["admin"] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "ผู้ดูแลระบบ",
  staff: "เจ้าหน้าที่",
  borrower: "ผู้ยืม",
};

const ROLE_VARIANTS: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  staff: "secondary",
  borrower: "outline",
};

function getVisibleNav(role: UserRole) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

function NavLinks({
  items,
  pathname,
  onClick,
}: {
  items: NavItem[];
  pathname: string;
  onClick?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-transparent"
            }`}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
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
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold">Kurupan</h1>
        <p className="text-xs text-muted-foreground">ระบบยืม-คืนครุภัณฑ์</p>
      </div>
      <Separator />
      <div className="flex-1 px-3 py-4">
        <NavLinks items={navItems} pathname={pathname} onClick={() => setMobileOpen(false)} />
      </div>
      <Separator />
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {(user.fullName ?? user.externalUserId).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium leading-none">
                {user.fullName ?? user.externalUserId}
              </p>
              <Badge variant={ROLE_VARIANTS[user.role]} className="mt-1 px-1.5 py-0 text-[10px]">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="size-4" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen">
      <aside className="hidden border-r bg-sidebar md:flex md:w-60 md:flex-col">
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SheetTitle className="sr-only">เมนู</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <h1 className="text-sm font-bold">Kurupan</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
