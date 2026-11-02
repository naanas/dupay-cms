"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useSessionUser } from "../../../lib/session";
import { formatDateTime, formatRupiah, PageHeader, Panel, PanelSkeleton, Skeleton, StatsSkeleton, StatusBadge, STATUS_LABEL } from "../../../components/ui";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

type Summary = {
    total_transactions: number;
    today_transactions: number;
    success_amount: number;
    by_status: Record<string, number>;
};

type Profile = { name: string; webhook_url: string; whitelisted_ips: string; api_key: string };

type Trx = { id: string; order_id: string; amount: number; payment_method: string; status: string; created_at: string };

export default function OverviewPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [recent, setRecent] = useState<Trx[]>([]);
    const [error, setError] = useState("");
    const user = useSessionUser();

    useEffect(() => {
        Promise.all([
            api.fetchMerchant("/summary"),
            api.fetchMerchant("/me"),
            api.fetchMerchant("/transactions?limit=5"),
        ])
            .then(([s, p, t]) => {
                setSummary(s);
                setProfile(p);
                setRecent(Array.isArray(t) ? t : []);
            })
            .catch(err => setError(err.message));
    }, []);

    if (error) return <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">{error}</div>;
    if (!summary || !profile) {
        return (
            <div className="space-y-6" aria-busy>
                <div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-80 max-w-full" /></div>
                <StatsSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <PanelSkeleton lines={5} className="lg:col-span-2" />
                    <PanelSkeleton lines={3} />
                </div>
            </div>
        );
    }

    const successCount = summary.by_status.SUCCESS || 0;
    const successRate = summary.total_transactions ? Math.round((successCount / summary.total_transactions) * 100) : 0;

    const checklist = [
        { done: !!profile.api_key, label: "API Key & Secret Key siap", href: "/dashboard/integration" },
        { done: !!profile.webhook_url, label: "Webhook URL diisi (biar dapat kabar pembayaran)", href: "/dashboard/integration" },
        { done: summary.total_transactions > 0, label: "Transaksi pertama dibuat", href: "/dashboard/docs" },
    ];
    const allDone = checklist.every(c => c.done);

    return (
        <div className="space-y-6 animate-in pb-20">
            <PageHeader
                title={`Halo, ${user?.merchant_name || profile.name}`}
                subtitle="Ringkasan transaksi & status integrasi toko lu di Dupay."
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
                <Stat label="Total dibayar" value={formatRupiah(summary.success_amount)} accent />
                <Stat label="Total transaksi" value={summary.total_transactions.toLocaleString("id-ID")} />
                <Stat label="Transaksi hari ini" value={summary.today_transactions.toLocaleString("id-ID")} />
                <Stat label="Tingkat berhasil" value={`${successRate}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Panel title="Transaksi terbaru" className="lg:col-span-2">
                    {recent.length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada transaksi. Lihat <Link href="/dashboard/docs" className="text-blue-600 font-bold hover:underline">Dokumentasi</Link> buat mulai integrasi.</p>
                    ) : (
                        <div className="table-wrap">
                            <table className="data-table text-sm text-left">
                                <tbody className="divide-y divide-slate-100 stagger">
                                    {recent.map(t => (
                                        <tr key={t.id}>
                                            <td className="py-2.5 px-1">
                                                <div>
                                                    <div className="font-mono text-xs font-bold text-slate-800 break-all">{t.order_id}</div>
                                                    <div className="text-[11px] text-slate-400">{formatDateTime(t.created_at)}</div>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-1 font-mono text-xs text-slate-500" data-label="Metode">{t.payment_method}</td>
                                            <td className="py-2.5 px-1 font-bold text-slate-800" data-label="Nominal">{formatRupiah(t.amount)}</td>
                                            <td className="py-2.5 px-1 text-right" data-label="Status"><StatusBadge status={t.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Link href="/dashboard/my-transactions" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline">
                        Lihat semua transaksi <ArrowRight size={14} />
                    </Link>
                </Panel>

                <div className="space-y-6">
                    <Panel title="Status transaksi">
                        <div className="space-y-2">
                            {Object.keys(STATUS_LABEL).map(st => (
                                <div key={st} className="flex items-center justify-between text-sm">
                                    <StatusBadge status={st} />
                                    <span className="font-bold text-slate-800">{(summary.by_status[st] || 0).toLocaleString("id-ID")}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title={allDone ? "Integrasi lengkap" : "Langkah integrasi"}>
                        <ul className="space-y-2.5">
                            {checklist.map(c => (
                                <li key={c.label}>
                                    <Link href={c.href} className="flex items-start gap-2 text-sm group">
                                        {c.done
                                            ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                                            : <Circle size={18} className="text-slate-300 flex-shrink-0" />}
                                        <span className={c.done ? "text-slate-500" : "text-slate-800 font-semibold group-hover:text-blue-600"}>{c.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className={`rounded-3xl border p-5 shadow-sm ${accent ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200"}`}>
            <div className={`text-xs font-bold uppercase tracking-wider ${accent ? "text-slate-400" : "text-slate-400"}`}>{label}</div>
            <div className={`text-xl md:text-2xl font-black mt-1 ${accent ? "text-white" : "text-slate-900"}`}>{value}</div>
        </div>
    );
}
