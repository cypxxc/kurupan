"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types/notifications";

function formatNotificationDate(value: string, locale: string) {
  const intlLocale = locale === "en" ? "en-US" : "th-TH";

  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resolveNotificationHref(notification: NotificationItem) {
  if (!notification.entityType || !notification.entityId) {
    return null;
  }

  if (notification.entityType === "borrow_request") {
    return `/borrow-requests/${notification.entityId}`;
  }

  if (notification.entityType === "return_transaction") {
    return `/returns/${notification.entityId}`;
  }

  return null;
}

export function NotificationBell() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const {
    notifications,
    unreadCount,
    loadingNotifications,
    loadNotifications,
    markRead,
    markAllRead,
  } = useNotifications({ realtimeEnabled });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      if (!realtimeEnabled) {
        setRealtimeEnabled(true);
      }

      void loadNotifications();
    }
  };

  const markNotificationAsRead = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markRead(notification.id);
    }
  };
  const accessibleTriggerLabel =
    unreadCount > 0
      ? t("notifications.triggerLabelWithUnread", { count: unreadCount })
      : t("notifications.triggerLabelAllCaughtUp");

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        nativeButton
        aria-label={accessibleTriggerLabel}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "relative border-border/80 bg-background/85 shadow-sm backdrop-blur-sm",
        )}
      >
        <Bell aria-hidden="true" className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-5 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <p aria-live="polite" className="sr-only" role="status">
        {accessibleTriggerLabel}
      </p>

      <PopoverContent align="end" sideOffset={10} className="w-[22rem] p-0 sm:w-[24rem]">
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{t("notifications.title")}</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0
                ? t("notifications.allCaughtUp")
                : t("notifications.unreadCount", { count: unreadCount })}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={unreadCount === 0}
            onClick={() => {
              void markAllRead();
            }}
          >
            {t("common.actions.markAllRead")}
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto scrollbar-hidden">
          {loadingNotifications && notifications.length === 0 ? (
            <div className="space-y-3 px-4 py-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-sm border border-border/70 px-3 py-3"
                >
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted/80" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/80" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium">{t("notifications.emptyTitle")}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("notifications.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  locale={locale}
                  href={resolveNotificationHref(notification)}
                  onActivate={() => {
                    void markNotificationAsRead(notification);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification,
  locale,
  href,
  onActivate,
}: {
  notification: NotificationItem;
  locale: string;
  href: string | null;
  onActivate: () => void;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 size-2.5 shrink-0 rounded-full bg-transparent",
          !notification.isRead && "bg-primary",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="line-clamp-1 text-sm font-medium">{notification.title}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatNotificationDate(notification.createdAt, locale)}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {notification.body}
        </span>
      </span>
    </>
  );
  const className = cn(
    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/55",
    !notification.isRead && "bg-primary/4",
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        className={className}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }

          onActivate();
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onActivate}>
      {content}
    </button>
  );
}
