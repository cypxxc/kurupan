"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import { apiClient } from "@/lib/api-client";
import type { NotificationItem, NotificationSSEPayload } from "@/types/notifications";

const DEFAULT_LIMIT = 30;

export function useNotifications(limit = DEFAULT_LIMIT) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    setLoadingCount(true);

    try {
      const data = await apiClient.get<{ count: number }>("/api/notifications/unread-count", {
        cache: "no-store",
      });
      setUnreadCount(data.count);
      return true;
    } catch {
      return false;
    } finally {
      setLoadingCount(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);

    try {
      const data = await apiClient.get<NotificationItem[]>("/api/notifications", {
        query: { limit },
        cache: "no-store",
      });

      startTransition(() => {
        setNotifications(data);
        setHasLoadedNotifications(true);
      });

      return true;
    } catch {
      return false;
    } finally {
      setLoadingNotifications(false);
    }
  }, [limit]);

  const handleStreamMessage = useEffectEvent((event: MessageEvent<string>) => {
    let payload: NotificationSSEPayload;

    try {
      payload = JSON.parse(event.data) as NotificationSSEPayload;
    } catch {
      return;
    }

    if (payload.type === "new_notification") {
      if (hasLoadedNotifications) {
        void loadNotifications();
      }

      return;
    }

    if (payload.type === "unread_count") {
      setUnreadCount(payload.count);
    }
  });

  const handleStreamError = useEffectEvent(() => {
    void loadUnreadCount();

    if (hasLoadedNotifications) {
      void loadNotifications();
    }
  });

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onmessage = handleStreamMessage;
    eventSource.onerror = () => {
      handleStreamError();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const markRead = useCallback(
    async (id: number) => {
      const target = notifications.find((notification) => notification.id === id);

      if (!target) {
        return false;
      }

      if (target.isRead) {
        return true;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      try {
        await apiClient.patch<NotificationItem>(`/api/notifications/${id}/read`);
        return true;
      } catch {
        void loadNotifications();
        void loadUnreadCount();
        return false;
      }
    },
    [loadNotifications, loadUnreadCount, notifications],
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) {
      return true;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);

    try {
      await apiClient.patch<{ markedCount: number }>("/api/notifications/read-all");
      return true;
    } catch {
      void loadNotifications();
      void loadUnreadCount();
      return false;
    }
  }, [loadNotifications, loadUnreadCount, unreadCount]);

  return {
    notifications,
    unreadCount,
    loadingCount,
    loadingNotifications,
    loadNotifications,
    loadUnreadCount,
    markRead,
    markAllRead,
  };
}
