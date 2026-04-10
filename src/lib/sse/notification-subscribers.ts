import type { NotificationRecord } from "@/modules/notifications/repositories/NotificationRepository";

export type NotificationSSEPayload =
  | { type: "new_notification"; notification: NotificationRecord }
  | { type: "unread_count"; count: number }
  | { type: "ping" };

type SendFn = (data: string) => void;

const subscribers = new Map<string, Set<SendFn>>();

function toSseMessage(payload: NotificationSSEPayload) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function subscribe(userId: string, send: SendFn): () => void {
  const listeners = subscribers.get(userId) ?? new Set<SendFn>();
  listeners.add(send);
  subscribers.set(userId, listeners);

  return () => {
    const currentListeners = subscribers.get(userId);

    if (!currentListeners) {
      return;
    }

    currentListeners.delete(send);

    if (currentListeners.size === 0) {
      subscribers.delete(userId);
    }
  };
}

export function countSubscribers(userId: string) {
  return subscribers.get(userId)?.size ?? 0;
}

export function broadcast(userId: string, event: NotificationSSEPayload) {
  const listeners = subscribers.get(userId);

  if (!listeners || listeners.size === 0) {
    return;
  }

  const payload = toSseMessage(event);

  for (const send of Array.from(listeners)) {
    try {
      send(payload);
    } catch {
      listeners.delete(send);
    }
  }

  if (listeners.size === 0) {
    subscribers.delete(userId);
  }
}

export function broadcastToMany(userIds: string[], event: NotificationSSEPayload) {
  for (const userId of new Set(userIds.filter(Boolean))) {
    broadcast(userId, event);
  }
}
