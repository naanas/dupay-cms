"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatRupiah, PageHeader, Skeleton } from "../../../components/ui";

type Channel = {
    code: string; label?: string; group?: string; logo?: string;
    min_amount?: number; max_amount?: number; fee_flat?: number; fee_percent?: number;
};

const feeText = (ch: Channel) =>
    [ch.fee_flat ? formatRupiah(ch.fee_flat) : "", ch.fee_percent ? `${ch.fee_percent}%` : ""].filter(Boolean).join(" + ") || "Gratis";

export default function PaymentMethodsPage() {
    const [channels, setChannels] = useState<Channel[] | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.fetchPublic("/channels")
            .then(res => setChannels(Array.isArray(res?.data) ? res.data : []))
            .catch(err => setError(err.message));
    }, []);

    const groups = new Map<string, Channel[]>();
    for (const ch of channels || []) {
        const g = ch.group || "Lainnya";
        groups.set(g, [...(groups.get(g) || []), ch]);
    }

    return (
        <div className="space-y-6 animate-in pb-20">
            <PageHeader
                title="Metode Bayar"
                subtitle={<>Metode bayar yang bisa dipakai customer lu. Kirim <strong>kode</strong>-nya sebagai <code className="text-xs bg-slate-100 px-1 rounded">payment_method</code> waktu bikin transaksi. Daftar ini diatur oleh Dupay & bisa berubah, jadi ambil dari <code className="text-xs bg-slate-100 px-1 rounded">GET /v1/channels</code>, jangan di-hardcode.</>}
            />

            {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">{error}</div>}
            {!channels && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy>
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
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
                <div className="p-10 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-sm text-slate-500">Belum ada metode bayar yang aktif. Hubungi admin Dupay.</div>
            )}

            {[...groups.entries()].map(([group, list]) => (
                <section key={group} className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{group}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                        {list.map(ch => (
                            <div key={ch.code} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    {ch.logo
                                        ? <img src={ch.logo} alt="" className="w-10 h-10 object-contain rounded-lg border border-slate-100 bg-white p-1" />
                                        : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">{ch.code.slice(0, 3).toUpperCase()}</div>}
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate">{ch.label || ch.code}</div>
                                        <code className="text-xs font-mono text-blue-600 select-all">{ch.code}</code>
                                    </div>
                                </div>
                                <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
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
