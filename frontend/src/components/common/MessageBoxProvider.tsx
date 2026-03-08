import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react";

type MessageTone = "success" | "info" | "warning" | "error";

type AlertInput = {
  title?: string;
  message: string;
  tone?: MessageTone;
  confirmText?: string;
};

type ConfirmInput = {
  title?: string;
  message: string;
  tone?: MessageTone;
  confirmText?: string;
  cancelText?: string;
};

type ToastInput = {
  title?: string;
  message: string;
  tone?: MessageTone;
  durationMs?: number;
};

type ModalState =
  | {
      type: "alert";
      title: string;
      message: string;
      tone: MessageTone;
      confirmText: string;
      resolver: () => void;
    }
  | {
      type: "confirm";
      title: string;
      message: string;
      tone: MessageTone;
      confirmText: string;
      cancelText: string;
      resolver: (confirmed: boolean) => void;
    };

interface ToastState {
  id: number;
  title: string;
  message: string;
  tone: MessageTone;
}

interface MessageBoxContextValue {
  alert: (input: AlertInput | string) => Promise<void>;
  confirm: (input: ConfirmInput | string) => Promise<boolean>;
  toast: (input: ToastInput | string) => void;
}

const MessageBoxContext = createContext<MessageBoxContextValue | null>(null);

const toneStyles: Record<MessageTone, { badge: string; icon: string; title: string; body: string; button: string }> = {
  success: {
    badge: "bg-emerald-50",
    icon: "text-emerald-600",
    title: "text-emerald-900",
    body: "text-emerald-800",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
  info: {
    badge: "bg-sky-50",
    icon: "text-sky-600",
    title: "text-sky-900",
    body: "text-sky-800",
    button: "bg-[#2C3E5C] hover:bg-[#1B2744]",
  },
  warning: {
    badge: "bg-amber-50",
    icon: "text-amber-600",
    title: "text-amber-900",
    body: "text-amber-800",
    button: "bg-amber-600 hover:bg-amber-700",
  },
  error: {
    badge: "bg-rose-50",
    icon: "text-rose-600",
    title: "text-rose-900",
    body: "text-rose-800",
    button: "bg-rose-600 hover:bg-rose-700",
  },
};

function ToneIcon({ tone, className }: { tone: MessageTone; className?: string }) {
  if (tone === "success") return <CheckCircle2 className={className} />;
  if (tone === "warning") return <AlertTriangle className={className} />;
  if (tone === "error") return <OctagonAlert className={className} />;
  return <Info className={className} />;
}

export function MessageBoxProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);

  const toast = useCallback((input: ToastInput | string) => {
    const payload = typeof input === "string" ? { message: input } : input;
    const nextId = ++toastIdRef.current;

    setToasts((prev) => [
      ...prev,
      {
        id: nextId,
        title: payload.title || "Notice",
        message: payload.message,
        tone: payload.tone || "info",
      },
    ]);

    const duration = payload.durationMs ?? 3200;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== nextId));
    }, duration);
  }, []);

  const alert = useCallback((input: AlertInput | string) => {
    const payload = typeof input === "string" ? { message: input } : input;

    return new Promise<void>((resolve) => {
      setModalState({
        type: "alert",
        title: payload.title || "Notice",
        message: payload.message,
        tone: payload.tone || "info",
        confirmText: payload.confirmText || "OK",
        resolver: resolve,
      });
    });
  }, []);

  const confirm = useCallback((input: ConfirmInput | string) => {
    const payload = typeof input === "string" ? { message: input } : input;

    return new Promise<boolean>((resolve) => {
      setModalState({
        type: "confirm",
        title: payload.title || "Please Confirm",
        message: payload.message,
        tone: payload.tone || "warning",
        confirmText: payload.confirmText || "Confirm",
        cancelText: payload.cancelText || "Cancel",
        resolver: resolve,
      });
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      alert,
      confirm,
      toast,
    }),
    [alert, confirm, toast]
  );

  const closeAlertModal = () => {
    if (!modalState || modalState.type !== "alert") return;
    const resolver = modalState.resolver;
    setModalState(null);
    resolver();
  };

  const resolveConfirmModal = (confirmed: boolean) => {
    if (!modalState || modalState.type !== "confirm") return;
    const resolver = modalState.resolver;
    setModalState(null);
    resolver(confirmed);
  };

  const activeStyles = modalState ? toneStyles[modalState.tone] : null;

  return (
    <MessageBoxContext.Provider value={contextValue}>
      {children}

      {modalState && activeStyles && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f1f3b]/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/70 bg-white p-6 shadow-[0_20px_60px_rgba(11,31,63,0.28)]">
            <div className={`mb-4 inline-flex rounded-xl p-2 ${activeStyles.badge}`}>
              <ToneIcon tone={modalState.tone} className={`h-6 w-6 ${activeStyles.icon}`} />
            </div>

            <h2 className={`text-2xl font-bold ${activeStyles.title}`}>{modalState.title}</h2>
            <p className={`mt-2 text-sm ${activeStyles.body}`}>{modalState.message}</p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {modalState.type === "confirm" && (
                <button
                  onClick={() => resolveConfirmModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                onClick={() => {
                  if (modalState.type === "confirm") {
                    resolveConfirmModal(true);
                    return;
                  }
                  closeAlertModal();
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${activeStyles.button}`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-4 z-[95] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toastItem) => {
          const styles = toneStyles[toastItem.tone];
          return (
            <div
              key={toastItem.id}
              className={`pointer-events-auto rounded-xl border border-white/60 ${styles.badge} p-3 shadow-[0_10px_28px_rgba(15,35,64,0.2)]`}
            >
              <div className="flex items-start gap-2">
                <ToneIcon tone={toastItem.tone} className={`mt-0.5 h-5 w-5 ${styles.icon}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${styles.title}`}>{toastItem.title}</p>
                  <p className={`text-xs ${styles.body}`}>{toastItem.message}</p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((entry) => entry.id !== toastItem.id))}
                  className="rounded-md p-1 text-gray-600 hover:bg-white/60"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </MessageBoxContext.Provider>
  );
}

export function useMessageBox() {
  const context = useContext(MessageBoxContext);
  if (!context) {
    throw new Error("useMessageBox must be used within MessageBoxProvider");
  }
  return context;
}
