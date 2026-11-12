"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { EmptyState, formatRupiah, Notice, PageHeader, Panel, SearchInput, Skeleton } from "../../../components/ui";
import { toast } from "../../../components/overlays";
import { Check, Copy, Wallet } from "lucide-react";

type Channel = {
    code: string; label?: string; group?: string; logo?: string;
    min_amount?: number; max_amount?: number; fee_flat?: number; fee_percent?: number;
};

const feeText = (ch: Channel) =>
    [ch.fee_flat ? formatRupiah(ch.fee_flat) : "", ch.fee_percent ? `${ch.fee_percent}%` : ""].filter(Boolean).join(" + ") || "Gratis";

export default function PaymentMethodsPage() {
    const [channels, setChannels] = useState<Channel[] | null>(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState("");

    const copy = (code: string) => {
        navigator.clipboard?.writeText(code).then(() => {
            setCopied(code);
            toast.success(`Kode ${code} disalin`);
            setTimeout(() => setCopied(""), 1500);
        });
    };

    useEffect(() => {
        api.fetchPublic("/channels")
            .then(res => setChannels(Array.isArray(res?.data) ? res.data : []))
            .catch(err => setError(err.message));
    }, []);

    const groups = new Map<string, Channel[]>();
    const q = search.trim().toLowerCase();
    for (const ch of (channels || []).filter(c => !q || `${c.code} ${c.label || ""} ${c.group || ""}`.toLowerCase().includes(q))) {
        const g = ch.group || "Lainnya";
        groups.set(g, [...(groups.get(g) || []), ch]);
    }

    return (
        <div className="space-y-6 animate-in">
            <PageHeader
                title="Metode Bayar"
                subtitle={<>Metode bayar yang bisa dipakai customer lu. Kirim <strong className="text-slate-700">kode</strong>-nya sebagai <code className="font-mono text-xs bg-slate-100 px-1 rounded">payment_method</code> waktu bikin transaksi. Daftar ini diatur oleh Dupay & bisa berubah, jadi ambil dari <code className="font-mono text-xs bg-slate-100 px-1 rounded">GET /v1/channels</code>, jangan di-hardcode.</>}
            />

            {channels && channels.length > 0 && (
                <SearchInput value={search} onChange={setSearch} placeholder="Cari kode atau nama metode…" className="max-w-sm" />
            )}

            {error && <Notice tone="error">{error}</Notice>}
            {!channels && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy>
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10" />
                                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-12" /></div>
                            </div>
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ))}
                </div>
            )}
            {channels && channels.length === 0 && (
                <Panel><EmptyState icon={Wallet} title="Belum ada metode bayar aktif" description="Hubungi admin Dupay." /></Panel>
            )}

            {channels && channels.length > 0 && groups.size === 0 && (
                <Panel><EmptyState icon={Wallet} title={`Nggak ada metode yang cocok sama “${search}”`} /></Panel>
            )}

            {[...groups.entries()].map(([group, list]) => (
                <section key={group} className="space-y-3">
                    <h2 className="text-xs font-medium text-slate-500">{group} <span className="text-slate-400">· {list.length}</span></h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                        {list.map(ch => (
                            <div key={ch.code} className="group bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float">
                                <div className="flex items-center gap-3">
                                    {ch.logo
                                        ? <img src={ch.logo} alt="" className="w-10 h-10 object-contain rounded-lg border border-slate-100 bg-white p-1" />
                                        : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">{ch.code.slice(0, 3).toUpperCase()}</div>}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-slate-900 truncate">{ch.label || ch.code}</div>
                                        <code className="text-xs font-mono text-brand-600 select-all">{ch.code}</code>
                                    </div>
                                    <button onClick={() => copy(ch.code)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label={`Salin kode ${ch.code}`} title="Salin kode">
                                        {copied === ch.code ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                                    </button>
                                </div>
                                <dl className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs tabular">
                                    <div><dt className="text-slate-400">Min</dt><dd className="font-semibold text-slate-700">{ch.min_amount ? formatRupiah(ch.min_amount) : "-"}</dd></div>
                                    <div><dt className="text-slate-400">Maks</dt><dd className="font-semibold text-slate-700">{ch.max_amount ? formatRupiah(ch.max_amount) : "-"}</dd></div>
                                    <div><dt className="text-slate-400">Biaya</dt><dd className="font-semibold text-slate-700">{feeText(ch)}</dd></div>
                                </dl>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
