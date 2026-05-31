import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackEvent } from "./analytics.functions";
import { useAuth } from "./auth-context";

const SESSION_KEY = "sae_session_id";

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

type EventName =
  | "page_view" | "search" | "chat_message" | "link_click" | "solution_opened"
  | "sector_opened" | "ticket_created" | "protocol_created" | "document_upload"
  | "document_reviewed" | "ocr_completed" | "document_approved" | "document_rejected"
  | "resolved" | "abandoned" | "signup" | "login"
  | "solution_helpful_yes" | "solution_helpful_no" | "solution_filter";

/**
 * Hook para rastrear eventos de analytics. Falhas nunca quebram a UI.
 */
export function useAnalytics() {
  const send = useServerFn(trackEvent);
  const { user } = useAuth();

  const track = useCallback(
    (event_name: EventName, metadata?: Record<string, unknown>) => {
      const payload = {
        event_name,
        session_id: getOrCreateSession(),
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        user_id: user?.id,
        metadata: metadata as Record<string, unknown> | undefined,
      };
      // fire-and-forget
      send({ data: payload as never }).catch(() => undefined);
    },
    [send, user?.id]
  );

  return { track };
}

/**
 * Dispara um page_view automaticamente quando o componente monta.
 */
export function usePageView(extra?: Record<string, unknown>) {
  const { track } = useAnalytics();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("page_view", extra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
