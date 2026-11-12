"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useSessionUser } from "../../../lib/session";
import {
    EmptyState, formatDateTime, formatRupiah, Notice, PageHeader, Panel, PanelSkeleton, Skeleton, StatCard, StatsSkeleton,
    StatusBadge, STATUS_LABEL,
} from "../../../components/ui";
import { Activity, ArrowRight, CalendarDays, CheckCircle2, Circle, Receipt, TrendingUp, Wallet } from "lucide-react";

type Summary = {
    total_transactions: number;
    today_transactions: number;
    success_amount: number;
    by_status: Record<string, number>;
};

type Profile = { name: string; webhook_url: string; whitelisted_ips: string; api_key: string };

type Trx = { id: string; order_id: string; amount: number; payment_method: string; status: string; created_at: string };

const BAR_COLOR: Record<string, string> = {
    SUCCESS: "bg-emerald-500",
    PENDING: "bg-sky-500",
    FAILED: "bg-red-500",
    REFUNDED: "bg-amber-500",
};

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

    if (error) return <Notice tone="error">{error}</Notice>;
    if (!summary || !profile) {
        return (
            <div className="space-y-6" aria-busy>
                <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80 max-w-full" /></div>
                <StatsSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <PanelSkeleton lines={5} className="lg:col-span-2" />
                    <PanelSkeleton lines={3} />
                </div>
            </div>
        );
    }

    const total = summary.total_transactions;
    const successCount = summary.by_status.SUCCESS || 0;
    const successRate = total ? Math.round((successCount / total) * 100) : 0;

    const checklist = [
        { done: !!profile.api_key, label: "API Key & Secret Key siap", href: "/dashboard/integration" },
        { done: !!profile.webhook_url, label: "Webhook URL diisi (biar dapat kabar pembayaran)", href: "/dashboard/integration" },
        { done: total > 0, label: "Transaksi pertama dibuat", href: "/dashboard/docs" },
    ];
    const doneCount = checklist.filter(c => c.done).length;

    return (
        <div className="space-y-6 animate-in">
            <PageHeader
                eyebrow={new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                title={`Halo, ${user?.merchant_name || profile.name}`}
                subtitle="Ringkasan transaksi & status integrasi toko lu di Dupay."
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger">
                <StatCard label="Total dibayar" value={formatRupiah(summary.success_amount)} icon={Wallet} highlight hint="Dari transaksi berhasil" />
                <StatCard label="Total transaksi" value={total.toLocaleString("id-ID")} icon={Receipt} />
                <StatCard label="Hari ini" value={summary.today_transactions.toLocaleString("id-ID")} icon={CalendarDays} tone="brand" />
                <StatCard label="Tingkat berhasil" value={`${successRate}%`} icon={TrendingUp} tone="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Panel
                    title="Transaksi terbaru"
                    className="lg:col-span-2"
                    action={<Link href="/dashboard/my-transactions" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">Lihat semua <ArrowRight size={13} /></Link>}
                >
                    {recent.length === 0 ? (
                        <EmptyState
                            icon={Activity}
                            title="Belum ada transaksi"
                            description={<>Ikuti <Link href="/dashboard/docs" className="text-brand-600 font-medium hover:underline">Dokumentasi</Link> buat bikin transaksi pertama.</>}
                            className="py-8"
                        />
                    ) : (
                        <ul className="-mx-2 divide-y divide-slate-100 stagger">
                            {recent.map(t => (
                                <li key={t.id} className="flex items-center gap-3 px-2 py-3 rounded-xl">
                                    <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-semibold uppercase shrink-0">
                                        {t.payment_method.slice(0, 4)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs font-medium text-slate-800 truncate">{t.order_id}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(t.created_at)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="tabular text-sm font-semibold text-slate-900">{formatRupiah(t.amount)}</p>
                                        <div className="mt-1"><StatusBadge status={t.status} /></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <div className="space-y-6">
                    <Panel title="Status transaksi" subtitle={`${total.toLocaleString("id-ID")} transaksi`}>
                        <div className="flex h-2 rounded-full overflow-hidden bg-slate-100" aria-hidden>
                            {Object.keys(STATUS_LABEL).map(st => {
                                const n = summary.by_status[st] || 0;
                                return n ? <div key={st} className={BAR_COLOR[st]} style={{ width: `${(n / Math.max(total, 1)) * 100}%` }} /> : null;
                            })}
                        </div>
                        <ul className="mt-4 space-y-2.5">
                            {Object.keys(STATUS_LABEL).map(st => {
                                const n = summary.by_status[st] || 0;
                                return (
                                    <li key={st} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-slate-600">
                                            <span className={`w-2 h-2 rounded-full ${BAR_COLOR[st]}`} /> {STATUS_LABEL[st]}
                                        </span>
                                        <span className="tabular font-medium text-slate-900">
                                            {n.toLocaleString("id-ID")}
                                            <span className="text-slate-400 font-normal ml-1.5 text-xs">{total ? Math.round((n / total) * 100) : 0}%</span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </Panel>

                    <Panel title={doneCount === checklist.length ? "Integrasi lengkap" : "Langkah integrasi"} subtitle={`${doneCount} dari ${checklist.length} selesai`}>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                        </div>
                        <ul className="space-y-1">
                            {checklist.map(c => (
                                <li key={c.label}>
                                    <Link href={c.href} className="flex items-start gap-2.5 text-sm group -mx-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                        {c.done
                                            ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                            : <Circle size={18} className="text-slate-300 shrink-0" />}
                                        <span className={c.done ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800 font-medium group-hover:text-brand-600"}>{c.label}</span>
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
