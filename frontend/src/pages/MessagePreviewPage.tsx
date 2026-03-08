import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MessageSquare,
  OctagonAlert,
  ShieldAlert,
  X,
} from "lucide-react";

type MessageTone = "success" | "info" | "warning" | "error";

interface PreviewModalState {
  open: boolean;
  tone: MessageTone;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requireConfirm?: boolean;
}

interface ToastItem {
  id: number;
  tone: MessageTone;
  title: string;
  message: string;
}

const toneClasses: Record<MessageTone, { ring: string; bg: string; text: string; icon: string }> = {
  success: {
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    icon: "text-emerald-600",
  },
  info: {
    ring: "ring-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-800",
    icon: "text-sky-600",
  },
  warning: {
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    icon: "text-amber-600",
  },
  error: {
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    text: "text-rose-800",
    icon: "text-rose-600",
  },
};

function ToneIcon({ tone, className }: { tone: MessageTone; className?: string }) {
  if (tone === "success") return <CheckCircle2 className={className} />;
  if (tone === "warning") return <AlertTriangle className={className} />;
  if (tone === "error") return <OctagonAlert className={className} />;
  return <Info className={className} />;
}

export default function MessagePreviewPage() {
  const [modal, setModal] = useState<PreviewModalState>({
    open: false,
    tone: "info",
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    requireConfirm: false,
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const openModal = (state: Omit<PreviewModalState, "open">) => {
    setModal({ ...state, open: true });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  const pushToast = (tone: MessageTone, title: string, message: string) => {
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        tone,
        title,
        message,
      },
    ]);
  };

  const clearToasts = () => setToasts([]);

  useEffect(() => {
    if (!toasts.length) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 3600)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const modalStyle = useMemo(() => toneClasses[modal.tone], [modal.tone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f7fb] via-[#f8fbff] to-[#eaf3ff] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-[#d8e3f0] bg-white/90 p-6 shadow-[0_12px_40px_rgba(20,40,80,0.12)] backdrop-blur sm:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3b5c87]">Message System Preview</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#13233f] sm:text-4xl">Test Custom Alerts, Confirms, and Toasts</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#466085] sm:text-base">
                This page is a sandbox for the new message design. Trigger each button to preview how alerts and confirmations will look across the app.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d6e1ef] bg-[#f3f8ff] px-4 py-3 text-sm text-[#29456e]">
              Route: <span className="font-semibold">/test/messages</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() =>
                openModal({
                  tone: "success",
                  title: "Application Sent",
                  message: "Your application has been submitted and shared with the employer.",
                  confirmText: "Great",
                  requireConfirm: false,
                })
              }
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">Success Alert</span>
              </div>
              <p className="text-xs text-emerald-800">Preview positive message style.</p>
            </button>

            <button
              onClick={() =>
                openModal({
                  tone: "info",
                  title: "Heads Up",
                  message: "You have unsaved changes in this form. Save your progress before leaving.",
                  confirmText: "Okay",
                  requireConfirm: false,
                })
              }
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2 text-sky-700">
                <Info className="h-5 w-5" />
                <span className="text-sm font-semibold">Info Alert</span>
              </div>
              <p className="text-xs text-sky-800">Preview neutral informational message.</p>
            </button>

            <button
              onClick={() =>
                openModal({
                  tone: "warning",
                  title: "Incomplete Profile",
                  message: "Please finish your profile to improve recommendation accuracy.",
                  confirmText: "Complete Later",
                  requireConfirm: false,
                })
              }
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-semibold">Warning Alert</span>
              </div>
              <p className="text-xs text-amber-800">Preview warning message style.</p>
            </button>

            <button
              onClick={() =>
                openModal({
                  tone: "error",
                  title: "Action Failed",
                  message: "We could not process your request right now. Please try again in a few seconds.",
                  confirmText: "Retry",
                  requireConfirm: false,
                })
              }
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-sm font-semibold">Error Alert</span>
              </div>
              <p className="text-xs text-rose-800">Preview error dialog style.</p>
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              onClick={() =>
                openModal({
                  tone: "warning",
                  title: "Withdraw Application?",
                  message: "This will remove your application from the employer review queue.",
                  confirmText: "Yes, Withdraw",
                  cancelText: "Keep Application",
                  requireConfirm: true,
                })
              }
              className="rounded-2xl border border-[#ccd9ea] bg-[#f5f9ff] px-5 py-4 text-left transition hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2 text-[#1f3a63]">
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm font-semibold">Confirm Dialog</span>
              </div>
              <p className="text-xs text-[#3f5c85]">Tests two-button confirmation behavior.</p>
            </button>

            <div className="rounded-2xl border border-[#ccd9ea] bg-[#f7fbff] p-4">
              <p className="text-sm font-semibold text-[#1f3a63]">Toast Preview</p>
              <p className="mt-1 text-xs text-[#3f5c85]">These emulate non-blocking top-right notifications.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => pushToast("success", "Saved", "Your profile changes were saved successfully.")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Success Toast
                </button>
                <button
                  onClick={() => pushToast("error", "Upload Failed", "Resume upload failed. Please retry.")}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Error Toast
                </button>
                <button
                  onClick={() => pushToast("info", "Session Extended", "Your session will remain active for 30 minutes.")}
                  className="rounded-lg bg-[#2c3e5c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f2c43]"
                >
                  Info Toast
                </button>
                <button
                  onClick={clearToasts}
                  className="rounded-lg border border-[#c7d6ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f4d78] hover:bg-[#f4f8ff]"
                >
                  Clear Toasts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f3b]/40 p-4" onClick={closeModal}>
          <div
            className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(11,31,63,0.30)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`mb-4 inline-flex rounded-xl p-2 ${modalStyle.bg}`}>
              <ToneIcon tone={modal.tone} className={`h-6 w-6 ${modalStyle.icon}`} />
            </div>

            <h2 className="text-2xl font-bold text-[#152a4a]">{modal.title}</h2>
            <p className="mt-2 text-sm text-[#4b6287]">{modal.message}</p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {modal.requireConfirm && (
                <button
                  onClick={closeModal}
                  className="rounded-xl border border-[#cedaed] px-4 py-2 text-sm font-semibold text-[#2f4a74] hover:bg-[#f4f8ff]"
                >
                  {modal.cancelText || "Cancel"}
                </button>
              )}
              <button
                onClick={() => {
                  if (modal.requireConfirm) {
                    pushToast("success", "Confirmed", "Confirmation action accepted.");
                  }
                  closeModal();
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 ${
                  modal.tone === "error"
                    ? "bg-rose-600"
                    : modal.tone === "warning"
                      ? "bg-amber-600"
                      : modal.tone === "success"
                        ? "bg-emerald-600"
                        : "bg-[#2c3e5c]"
                }`}
              >
                {modal.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const styles = toneClasses[toast.tone];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border border-white/60 ${styles.bg} p-3 shadow-[0_12px_30px_rgba(15,35,64,0.18)] ring-1 ${styles.ring}`}
            >
              <div className="flex items-start gap-2">
                <ToneIcon tone={toast.tone} className={`mt-0.5 h-5 w-5 ${styles.icon}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${styles.text}`}>{toast.title}</p>
                  <p className="text-xs text-[#4f6488]">{toast.message}</p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
                  className="rounded-md p-1 text-[#5f7394] hover:bg-white/60"
                  aria-label="Dismiss toast"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
