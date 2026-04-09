import { logger } from "@/lib/logger";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { subscribe, type NotificationSSEPayload } from "@/lib/sse/notification-subscribers";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const { notificationService } = createNotificationStack();
  const encoder = new TextEncoder();

  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const sendPayload = (payload: NotificationSSEPayload) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const onAbort = () => cleanup();
      const unsubscribe = subscribe(actor.externalUserId, (chunk) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      });
      const timer = setInterval(() => sendPayload({ type: "ping" }), 25_000);

      cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (timer) {
          clearInterval(timer);
        }

        unsubscribe?.();
        request.signal.removeEventListener("abort", onAbort);

        try {
          controller.close();
        } catch {
          // Ignore stream closure races on disconnect.
        }
      };

      request.signal.addEventListener("abort", onAbort);
      sendPayload({ type: "ping" });

      void notificationService
        .getUnreadCount(actor)
        .then((count) => {
          sendPayload({ type: "unread_count", count });
        })
        .catch((error) => {
          logger.error("Failed to load initial notification count", {
            error,
            externalUserId: actor.externalUserId,
          });
        });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
