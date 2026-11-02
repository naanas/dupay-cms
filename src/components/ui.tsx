"use client";

// Komponen kecil yang dipakai bareng halaman-halaman dashboard.

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

export const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount || 0);

export const formatDateTime = (value: string) =>
    value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

const STATUS_STYLE: Record<string, string> = {
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-100",
    FAILED: "bg-red-50 text-red-700 border-red-100",
    REFUNDED: "bg-amber-50 text-amber-700 border-amber-100",
    PENDING: "bg-blue-50 text-blue-700 border-blue-100",
};

export const STATUS_LABEL: Record<string, string> = {
    PENDING: "Menunggu bayar",
    SUCCESS: "Berhasil",
    FAILED: "Gagal",
    REFUNDED: "Refund",
};

export function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex text-[11px] font-bold px-2 py-1 rounded-md border ${STATUS_STYLE[status] || STATUS_STYLE.PENDING}`}>
            {STATUS_LABEL[status] || status}
        </span>
    );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function Panel({ title, subtitle, children, className = "" }: { title?: string; subtitle?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 ${className}`}>
            {title && <h2 className="text-base font-black text-slate-900">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            <div className={title || subtitle ? "mt-4" : ""}>{children}</div>
        </div>
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
            <div className="text-xs font-bold text-slate-500 mb-1.5">{label}</div>
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl bg-slate-50 pl-3 pr-1 py-1">
                <code className="flex-1 min-w-0 text-xs font-mono text-slate-800 truncate">
                    {shown ? value || "-" : "•".repeat(Math.min(value.length, 32))}
                </code>
                {secret && (
                    <button type="button" onClick={() => setShown(!shown)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg" title={shown ? "Sembunyikan" : "Tampilkan"}>
                        {shown ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
                <button type="button" onClick={copy} disabled={!value} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg disabled:opacity-40" title="Salin">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
            </div>
            {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}

export const inputClass = "w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-blue-400";

// ---- Skeleton (placeholder abu-abu berkilau selama data dimuat) ----

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`skeleton ${className}`} aria-hidden />;
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-28" />
                </div>
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm" aria-busy>
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex gap-6">
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
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4 ${className}`}>
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
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            {stats ? <StatsSkeleton count={stats} /> : null}
            {Array.from({ length: panels || 0 }, (_, i) => <PanelSkeleton key={i} />)}
            {table && <TableSkeleton cols={tableCols} />}
        </div>
    );
}

// Modal dengan animasi masuk. Klik di luar panel = tutup.
export function Modal({ onClose, children, className = "max-w-lg" }: { onClose: () => void; children: React.ReactNode; className?: string }) {
    return (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className={`modal-panel bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl max-h-[90vh] overflow-y-auto ${className}`} onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}
