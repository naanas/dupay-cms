"use client";

// Toast & dialog konfirmasi yang bisa dipanggil dari mana aja (pengganti alert() / confirm()):
//   toast.success("Tersimpan")            toast.error(err)
//   if (!(await confirmDialog({ title: "Hapus?", tone: "danger" }))) return;
// <OverlayHost /> wajib dipasang sekali (di layout dashboard).

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Portal } from "./ui";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; title: string; description?: string };
type ConfirmOptions = {
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "default";
};
type ConfirmItem = ConfirmOptions & { resolve: (ok: boolean) => void };

type State = { toasts: ToastItem[]; confirm: ConfirmItem | null };

let state: State = { toasts: [], confirm: null };
const listeners = new Set<() => void>();
const emit = (next: State) => {
    state = next;
    listeners.forEach(l => l());
};
const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
};

let seq = 0;
const dismiss = (id: number) => emit({ ...state, toasts: state.toasts.filter(t => t.id !== id) });

const push = (tone: ToastTone, title: unknown, description?: string) => {
    const id = ++seq;
    const text = title instanceof Error ? title.message : String(title);
    // Maks 4 toast sekaligus, yang paling lama dibuang.
    emit({ ...state, toasts: [...state.toasts.slice(-3), { id, tone, title: text, description }] });
    setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
};

export const toast = {
    success: (title: unknown, description?: string) => push("success", title, description),
    error: (title: unknown, description?: string) => push("error", title, description),
    info: (title: unknown, description?: string) => push("info", title, description),
};

export const confirmDialog = (opts: ConfirmOptions) =>
    new Promise<boolean>(resolve => {
        state.confirm?.resolve(false);
        emit({ ...state, confirm: { ...opts, resolve } });
    });

const closeConfirm = (ok: boolean) => {
    state.confirm?.resolve(ok);
    emit({ ...state, confirm: null });
};

const TOAST_ICON = {
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <XCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-brand-500" />,
};

export function OverlayHost() {
    const s = useSyncExternalStore(subscribe, () => state, () => state);
    return (
        <Portal>
            <div
                className="fixed z-[70] inset-x-3 top-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-96 flex flex-col gap-2 pointer-events-none"
                role="region"
                aria-live="polite"
                aria-label="Notifikasi"
            >
                {s.toasts.map(t => (
                    <div key={t.id} className="toast-enter pointer-events-auto glass border border-slate-200/80 shadow-float rounded-2xl p-3.5 pr-2 flex items-start gap-3">
                        <span className="mt-0.5 shrink-0">{TOAST_ICON[t.tone]}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 break-words">{t.title}</p>
                            {t.description && <p className="text-xs text-slate-500 mt-0.5 break-words whitespace-pre-line">{t.description}</p>}
                        </div>
                        <button onClick={() => dismiss(t.id)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Tutup notifikasi">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            {s.confirm && <ConfirmModal item={s.confirm} />}
        </Portal>
    );
}

function ConfirmModal({ item }: { item: ConfirmItem }) {
    const confirmRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        confirmRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeConfirm(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
    const danger = item.tone === "danger";
    return (
        <div className="modal-backdrop fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-[2px] sm:p-4" onClick={() => closeConfirm(false)}>
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="modal-panel bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-pop p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"}`}>
                        {danger ? <AlertTriangle size={18} /> : <Info size={18} />}
                    </div>
                    <div className="min-w-0">
                        <h2 id="confirm-title" className="text-base font-semibold text-slate-900">{item.title}</h2>
                        {item.description && <div className="text-sm text-slate-500 mt-1">{item.description}</div>}
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button onClick={() => closeConfirm(false)} className="h-10 px-4 rounded-xl text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                        {item.cancelLabel || "Batal"}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={() => closeConfirm(true)}
                        className={`h-10 px-4 rounded-xl text-sm font-semibold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"}`}
                    >
                        {item.confirmLabel || "Lanjutkan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
