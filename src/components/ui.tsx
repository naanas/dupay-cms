"use client";

// Komponen kecil yang dipakai bareng halaman-halaman dashboard.

import { forwardRef, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Eye, EyeOff, Loader2, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount || 0);

export const formatDateTime = (value: string) =>
    value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---- Status ----

const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
    SUCCESS: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
    FAILED: { pill: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500" },
    REFUNDED: { pill: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
    PENDING: { pill: "bg-sky-50 text-sky-700 ring-sky-600/15", dot: "bg-sky-500 animate-pulse" },
};

export const STATUS_LABEL: Record<string, string> = {
    PENDING: "Menunggu bayar",
    SUCCESS: "Berhasil",
    FAILED: "Gagal",
    REFUNDED: "Refund",
};

export function StatusBadge({ status }: { status: string }) {
    const st = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${st.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {STATUS_LABEL[status] || status}
        </span>
    );
}

// Pill kecil netral / berwarna buat label (Aktif, NONAKTIF, auth type, dll).
export function Tag({ children, tone = "slate", className = "" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "brand"; className?: string }) {
    const tones = {
        slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
        green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
        amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
        red: "bg-red-50 text-red-700 ring-red-600/15",
        brand: "bg-brand-50 text-brand-700 ring-brand-600/15",
    };
    return <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium px-2 py-0.5 rounded-md ring-1 ring-inset ${tones[tone]} ${className}`}>{children}</span>;
}

// ---- Tombol ----

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "brand";
    size?: "sm" | "md" | "lg";
    icon?: LucideIcon;
    loading?: boolean;
};

const BTN_VARIANT = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-soft",
    brand: "bg-brand-600 text-white hover:bg-brand-700 shadow-soft",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-soft",
    ghost: "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-soft",
};
const BTN_SIZE = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-xl",
    lg: "h-11 px-5 text-sm gap-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "primary", size = "md", icon: Icon, loading, className = "", children, disabled, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
            {...rest}
        >
            {loading ? <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" /> : Icon ? <Icon size={size === "sm" ? 14 : 16} /> : null}
            {children}
        </button>
    );
});

// Tombol ikon kecil (aksi di baris tabel). label wajib buat aksesibilitas & tooltip.
export function IconButton({ icon: Icon, label, tone = "slate", spinning, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; tone?: "slate" | "red" | "brand"; spinning?: boolean }) {
    const tones = {
        slate: "text-slate-500 hover:text-slate-900 hover:bg-slate-900/5",
        red: "text-slate-500 hover:text-red-600 hover:bg-red-50",
        brand: "text-slate-500 hover:text-brand-600 hover:bg-brand-50",
    };
    return (
        <button type="button" title={label} aria-label={label} className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 ${tones[tone]} ${className}`} {...rest}>
            <Icon size={16} className={spinning ? "animate-spin" : ""} />
        </button>
    );
}

// ---- Layout halaman ----

export function PageHeader({ title, subtitle, action, eyebrow }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; eyebrow?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="min-w-0 max-w-3xl">
                {eyebrow && <div className="text-xs font-medium text-brand-600 mb-1.5">{eyebrow}</div>}
                <h1 className="text-2xl md:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
            </div>
            {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </div>
    );
}

export function Panel({ title, subtitle, action, children, className = "", padded = true }: { title?: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
    const hasHead = title || subtitle || action;
    return (
        <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-soft ${padded ? "p-5 md:p-6" : "overflow-hidden"} ${className}`}>
            {hasHead && (
                <div className={`flex items-start justify-between gap-4 ${padded ? "" : "px-5 md:px-6 pt-5"}`}>
                    <div className="min-w-0">
                        {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
                        {subtitle && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div className={hasHead ? "mt-4" : ""}>{children}</div>
        </section>
    );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "slate", highlight }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon; tone?: "slate" | "green" | "sky" | "red" | "amber" | "brand"; highlight?: boolean }) {
    const tones = {
        slate: "bg-slate-100 text-slate-600",
        green: "bg-emerald-50 text-emerald-600",
        sky: "bg-sky-50 text-sky-600",
        red: "bg-red-50 text-red-600",
        amber: "bg-amber-50 text-amber-600",
        brand: "bg-brand-50 text-brand-600",
    };
    return (
        <div className={`relative overflow-hidden rounded-2xl border p-4 md:p-5 ${highlight ? "bg-slate-900 border-slate-900 text-white shadow-float" : "bg-white border-slate-200/80 shadow-soft"}`}>
            {highlight && <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-brand-500/30 blur-2xl" aria-hidden />}
            <div className="relative flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${highlight ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                {Icon && (
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${highlight ? "bg-white/10 text-white" : tones[tone]}`}>
                        <Icon size={14} />
                    </span>
                )}
            </div>
            <div className={`relative tabular text-lg sm:text-xl md:text-2xl font-semibold tracking-tight mt-2 break-words ${highlight ? "text-white" : "text-slate-900"}`}>{value}</div>
            {hint && <div className={`relative text-[11px] mt-1 ${highlight ? "text-slate-400" : "text-slate-400"}`}>{hint}</div>}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: { icon?: LucideIcon; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
    return (
        <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
            {Icon && (
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                    <Icon size={22} />
                </div>
            )}
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error" | "warning"; children: React.ReactNode }) {
    const tones = {
        info: "bg-sky-50 border-sky-200/70 text-sky-900",
        success: "bg-emerald-50 border-emerald-200/70 text-emerald-900",
        error: "bg-red-50 border-red-200/70 text-red-800",
        warning: "bg-amber-50 border-amber-200/70 text-amber-900",
    };
    return <div className={`px-4 py-3 rounded-xl border text-sm ${tones[tone]}`}>{children}</div>;
}

// ---- Form ----

// text-base di HP: input < 16px bikin Safari iOS nge-zoom halaman waktu fokus.
export const inputClass =
    "w-full h-11 sm:h-10 border border-slate-200 bg-white px-3 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({ label, hint, wide, children, className = "" }: { label: React.ReactNode; hint?: React.ReactNode; wide?: boolean; children: React.ReactNode; className?: string }) {
    return (
        <label className={`block ${wide ? "md:col-span-2" : ""} ${className}`}>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
            {children}
            {hint && <span className="block text-[11px] text-slate-400 mt-1.5 leading-relaxed">{hint}</span>}
        </label>
    );
}

export function SearchInput({ value, onChange, placeholder = "Cari…", className = "", onSubmit }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; onSubmit?: () => void }) {
    return (
        <form className={`relative ${className}`} onSubmit={e => { e.preventDefault(); onSubmit?.(); }} role="search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
                className={`${inputClass} pl-9 pr-8`}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
            {value && (
                <button type="button" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700" aria-label="Hapus pencarian">
                    <X size={14} />
                </button>
            )}
        </form>
    );
}

// Pilihan cepat berbentuk chip (mis. filter status). Bisa digeser di HP.
export function Segmented<T extends string>({ options, value, onChange, className = "" }: { options: { value: T; label: React.ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
    return (
        <div className={`flex gap-1 overflow-x-auto no-scrollbar p-1 bg-slate-100/80 rounded-xl ${className}`} role="tablist">
            {options.map(o => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(o.value)}
                        className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${active ? "bg-white text-slate-900 shadow-soft" : "text-slate-500 hover:text-slate-800"}`}
                    >
                        {o.label}
                        {o.count !== undefined && <span className={`tabular text-[10px] px-1.5 rounded-full ${active ? "bg-slate-100 text-slate-600" : "bg-slate-200/70 text-slate-500"}`}>{o.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            title={label}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
        >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
    );
}

// Field read-only buat nilai yang sering disalin (API key, URL). secret = disembunyiin dulu.
export function CopyField({ label, value, secret, hint }: { label: string; value: string; secret?: boolean; hint?: React.ReactNode }) {
    const [copied, setCopied] = useState(false);
    const [shown, setShown] = useState(!secret);
    const copy = () => {
        navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <div>
            <div className="text-xs font-medium text-slate-600 mb-1.5">{label}</div>
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl bg-slate-50/80 pl-3 pr-1 h-10">
                <code className="flex-1 min-w-0 text-xs font-mono text-slate-800 truncate">
                    {shown ? value || "-" : "•".repeat(Math.min(value.length, 32))}
                </code>
                {secret && (
                    <IconButton icon={shown ? EyeOff : Eye} label={shown ? "Sembunyikan" : "Tampilkan"} onClick={() => setShown(!shown)} />
                )}
                <button type="button" onClick={copy} disabled={!value} className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg disabled:opacity-40" title="Salin" aria-label="Salin">
                    {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
            </div>
            {hint && <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p>}
        </div>
    );
}

// Daftar label–nilai (detail transaksi / merchant).
export function DetailList({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
    return (
        <dl className="divide-y divide-slate-100 text-sm">
            {items.map(([k, v], i) => (
                <div key={i} className="grid grid-cols-3 gap-3 py-2.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="col-span-2 font-medium text-slate-800 break-all">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

// ---- Tabel ----

export const thClass = "px-4 py-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap";
export const tdClass = "px-4 py-3.5";

export function TableCard({ children, toolbar, footer, className = "" }: { children: React.ReactNode; toolbar?: React.ReactNode; footer?: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden ${className}`}>
            {toolbar && <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3">{toolbar}</div>}
            <div className="table-wrap">{children}</div>
            {footer && <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">{footer}</div>}
        </div>
    );
}

// ---- Skeleton (placeholder abu-abu berkilau selama data dimuat) ----

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`skeleton ${className}`} aria-hidden />;
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-28" />
                </div>
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-soft" aria-busy>
            <div className="border-b border-slate-100 px-5 py-4 flex gap-6">
                {Array.from({ length: cols }, (_, i) => <Skeleton key={i} className="h-3 flex-1 max-w-24" />)}
            </div>
            <div className="divide-y divide-slate-100">
                {Array.from({ length: rows }, (_, r) => (
                    <div key={r} className="px-5 py-4 flex items-center gap-6">
                        <div className="flex-[2] space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        {Array.from({ length: cols - 1 }, (_, c) => <Skeleton key={c} className="h-4 flex-1 hidden sm:block" />)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PanelSkeleton({ lines = 4, className = "" }: { lines?: number; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 md:p-6 space-y-4 ${className}`}>
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-10 ${i % 2 ? "w-full" : "w-5/6"}`} />)}
        </div>
    );
}

// Kerangka halaman: judul + (opsional) kartu statistik + tabel / panel.
export function PageSkeleton({ stats, table, panels, tableCols }: { stats?: number; table?: boolean; panels?: number; tableCols?: number }) {
    return (
        <div className="space-y-6" aria-busy aria-label="Memuat">
            <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            {stats ? <StatsSkeleton count={stats} /> : null}
            {Array.from({ length: panels || 0 }, (_, i) => <PanelSkeleton key={i} />)}
            {table && <TableSkeleton cols={tableCols} />}
        </div>
    );
}

// ---- Modal & Drawer ----

// Render ke <body>: overlay fixed nggak boleh tinggal di dalam elemen ber-transform/filter
// (mis. wrapper halaman yang lagi animasi), nanti ukurannya ngikut wrapper, bukan layar.
const noop = () => () => {};
export function Portal({ children }: { children: React.ReactNode }) {
    const mounted = useSyncExternalStore(noop, () => true, () => false);
    return mounted ? createPortal(children, document.body) : null;
}

function useEscape(onClose: () => void) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);
}

function OverlayHead({ title, subtitle, onClose }: { title?: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void }) {
    if (!title) return null;
    return (
        <div className="flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
                {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
            </div>
            <IconButton icon={X} label="Tutup" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
    );
}

// Modal: di desktop di tengah, di HP jadi bottom sheet. Esc / klik luar = tutup.
export function Modal({ onClose, children, className = "max-w-lg", title, subtitle }: { onClose: () => void; children: React.ReactNode; className?: string; title?: React.ReactNode; subtitle?: React.ReactNode }) {
    useEscape(onClose);
    return (
        <Portal>
        <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-[2px] sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className={`modal-panel bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full relative shadow-pop max-h-[92dvh] overflow-y-auto overscroll-contain ${className}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="sm:hidden mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
                <OverlayHead title={title} subtitle={subtitle} onClose={onClose} />
                {children}
            </div>
        </div>
        </Portal>
    );
}

// Drawer: panel dari kanan (desktop) / bawah (HP). Cocok buat form & detail tanpa ninggalin daftar.
export function Drawer({ onClose, children, title, subtitle, footer, width = "sm:max-w-xl" }: { onClose: () => void; children: React.ReactNode; title?: React.ReactNode; subtitle?: React.ReactNode; footer?: React.ReactNode; width?: string }) {
    useEscape(onClose);
    return (
        <Portal>
        <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className={`drawer-panel bg-white w-full ${width} max-h-[92dvh] sm:max-h-none sm:h-full rounded-t-3xl sm:rounded-none sm:rounded-l-2xl shadow-pop flex flex-col min-h-0`}
                onClick={e => e.stopPropagation()}
            >
                <div className="sm:hidden mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
                <div className="px-5 sm:px-6 pt-4 sm:pt-6 shrink-0">
                    <OverlayHead title={title} subtitle={subtitle} onClose={onClose} />
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-6">{children}</div>
                {footer && <div className="shrink-0 border-t border-slate-100 px-5 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-wrap items-center justify-end gap-2 bg-slate-50/60 [&>button]:flex-1 sm:[&>button]:flex-none">{footer}</div>}
            </div>
        </div>
        </Portal>
    );
}
