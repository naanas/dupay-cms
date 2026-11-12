"use client";

import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import {
    Button, CopyField, DetailList, Drawer, EmptyState, formatDateTime, formatRupiah, IconButton, inputClass, PageHeader,
    PageSkeleton, SearchInput, Segmented, StatCard, StatusBadge, STATUS_LABEL, Tag, TableCard, tdClass, thClass,
} from "../../../components/ui";
import { toast } from "../../../components/overlays";
import { Activity, CheckCircle2, Clock, Eye, FilterX, RefreshCw, XCircle } from "lucide-react";

type TransactionItem = {
    id: string;
    order_id: string;
    merchant_id: string;
    merchant_name: string;
    gateway_id: string;
    gateway_name: string;
    amount: number;
    payment_method: string;
    status: string;
    pg_reference_id: string;
    checkout_url: string;
    client_payload: string;
    pg_response: string;
    pg_status_code: number;
    created_at: string;
};

type StatusFilter = "ALL" | "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";

const prettyJSON = (raw: string) => {
    if (!raw) return "-";
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
};

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<TransactionItem | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [merchantFilter, setMerchantFilter] = useState("ALL");
    const [gatewayFilter, setGatewayFilter] = useState("ALL");

    const loadTransactions = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const data = await api.fetchCMS("/transactions");
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error("Gagal mengambil transaksi", errorMessage(err));
        } finally {
            setLoading(false);
            if (isRefresh) setRefreshing(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    // Tanya status langsung ke PG lewat endpoint "Cek Status" gateway-nya.
    const syncStatus = async (trx: TransactionItem) => {
        setSyncingId(trx.id);
        try {
            const res = await api.fetchCMS(`/transactions/${trx.id}/sync`, "POST");
            const newStatus: string = res?.data?.status || trx.status;
            const changed = newStatus !== trx.status;
            (changed ? toast.success : toast.info)(
                changed ? `${trx.order_id}: ${STATUS_LABEL[trx.status] || trx.status} → ${STATUS_LABEL[newStatus] || newStatus}` : `${trx.order_id}: status nggak berubah`,
                `Status di ${trx.gateway_name || "PG"}: ${res?.pg_status ?? "-"}`,
            );
            if (selected?.id === trx.id) setSelected({ ...trx, status: newStatus });
            await loadTransactions(true);
        } catch (err) {
            toast.error(`Cek status ${trx.order_id} gagal`, errorMessage(err));
        } finally {
            setSyncingId(null);
        }
    };

    const counts = useMemo(() => {
        const c: Record<string, number> = { ALL: transactions.length, SUCCESS: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 };
        for (const t of transactions) c[t.status] = (c[t.status] || 0) + 1;
        return c;
    }, [transactions]);

    const successAmount = useMemo(
        () => transactions.filter(t => t.status === "SUCCESS").reduce((sum, t) => sum + (t.amount || 0), 0),
        [transactions],
    );

    const merchantOptions = useMemo(() => {
        return Array.from(new Set(transactions.map((trx) => trx.merchant_name || trx.merchant_id))).filter(Boolean);
    }, [transactions]);

    const gatewayOptions = useMemo(() => {
        return Array.from(new Set(transactions.map((trx) => trx.gateway_name || trx.gateway_id))).filter(Boolean);
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return transactions.filter((trx) => {
            const merchant = trx.merchant_name || trx.merchant_id;
            const gateway = trx.gateway_name || trx.gateway_id;
            const matchesSearch =
                keyword === "" ||
                trx.order_id?.toLowerCase().includes(keyword) ||
                trx.payment_method?.toLowerCase().includes(keyword) ||
                trx.status?.toLowerCase().includes(keyword) ||
                merchant?.toLowerCase().includes(keyword) ||
                gateway?.toLowerCase().includes(keyword) ||
                trx.pg_reference_id?.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === "ALL" || trx.status === statusFilter;
            const matchesMerchant = merchantFilter === "ALL" || merchant === merchantFilter;
            const matchesGateway = gatewayFilter === "ALL" || gateway === gatewayFilter;
            return matchesSearch && matchesStatus && matchesMerchant && matchesGateway;
        });
    }, [transactions, search, statusFilter, merchantFilter, gatewayFilter]);

    const filtered = search !== "" || statusFilter !== "ALL" || merchantFilter !== "ALL" || gatewayFilter !== "ALL";
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("ALL");
        setMerchantFilter("ALL");
        setGatewayFilter("ALL");
    };

    if (loading) {
        return <PageSkeleton stats={4} table />;
    }

    return (
        <div className="space-y-6 animate-in">
            <PageHeader
                title="Transaksi"
                subtitle="Pantau request merchant & response payment gateway. Klik baris buat lihat detail."
                action={
                    <Button variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => loadTransactions(true)}>
                        {refreshing ? "Memperbarui…" : "Muat ulang"}
                    </Button>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger">
                <StatCard label="Berhasil dibayar" value={formatRupiah(successAmount)} icon={Activity} highlight hint={`${counts.ALL} transaksi total`} />
                <StatCard label="Berhasil" value={counts.SUCCESS} icon={CheckCircle2} tone="green" />
                <StatCard label="Menunggu bayar" value={counts.PENDING} icon={Clock} tone="sky" />
                <StatCard label="Gagal" value={counts.FAILED} icon={XCircle} tone="red" />
            </div>

            <TableCard
                toolbar={
                    <>
                        <SearchInput value={search} onChange={setSearch} placeholder="Cari order, merchant, gateway, referensi…" className="flex-1 min-w-0 lg:max-w-sm" />
                        <Segmented<StatusFilter>
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "ALL", label: "Semua", count: counts.ALL },
                                { value: "SUCCESS", label: "Berhasil", count: counts.SUCCESS },
                                { value: "PENDING", label: "Menunggu", count: counts.PENDING },
                                { value: "FAILED", label: "Gagal", count: counts.FAILED },
                                { value: "REFUNDED", label: "Refund", count: counts.REFUNDED },
                            ]}
                        />
                        <div className="flex gap-2 lg:ml-auto">
                            <select value={merchantFilter} onChange={(e) => setMerchantFilter(e.target.value)} className={`${inputClass} lg:w-40`} aria-label="Filter merchant">
                                <option value="ALL">Semua merchant</option>
                                {merchantOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={gatewayFilter} onChange={(e) => setGatewayFilter(e.target.value)} className={`${inputClass} lg:w-40`} aria-label="Filter gateway">
                                <option value="ALL">Semua gateway</option>
                                {gatewayOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </>
                }
                footer={
                    <div className="flex items-center justify-between gap-3">
                        <span>Menampilkan <b className="text-slate-700">{filteredTransactions.length}</b> dari {transactions.length} transaksi</span>
                        {filtered && <button onClick={resetFilters} className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"><FilterX size={13} /> Reset filter</button>}
                    </div>
                }
            >
                <table className="data-table text-left">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                            <th className={`${thClass} pl-5`}>Order</th>
                            <th className={thClass}>Merchant / Gateway</th>
                            <th className={`${thClass} text-right`}>Nominal</th>
                            <th className={thClass}>Status</th>
                            <th className={`${thClass} pr-5 text-right w-24`}><span className="sr-only">Aksi</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 stagger">
                        {filteredTransactions.map((trx) => (
                            <tr key={trx.id} onClick={() => setSelected(trx)} className="group hover:bg-slate-50/80 cursor-pointer">
                                <td className={`${tdClass} pl-5`}>
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs font-medium text-slate-900 break-all">{trx.order_id}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            <span className="font-mono uppercase">{trx.payment_method}</span> · {formatDateTime(trx.created_at)}
                                        </p>
                                    </div>
                                </td>
                                <td className={tdClass} data-label="Merchant">
                                    <div>
                                        <p className="text-sm text-slate-700">{trx.merchant_name || trx.merchant_id}</p>
                                        <p className="text-[11px] text-slate-400">via {trx.gateway_name || trx.gateway_id || "-"}</p>
                                    </div>
                                </td>
                                <td className={`${tdClass} tabular text-sm font-semibold text-slate-900 text-right`} data-label="Nominal">{formatRupiah(trx.amount)}</td>
                                <td className={tdClass} data-label="Status">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <StatusBadge status={trx.status} />
                                        {trx.pg_status_code ? <Tag className="font-mono" >PG {trx.pg_status_code}</Tag> : null}
                                    </div>
                                </td>
                                <td className={`${tdClass} pr-5`} data-label="Aksi">
                                    <div className="flex justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                                        <IconButton icon={RefreshCw} label="Cek status ke PG" tone="brand" spinning={syncingId === trx.id} disabled={syncingId !== null} onClick={() => syncStatus(trx)} />
                                        <IconButton icon={Eye} label="Lihat detail" onClick={() => setSelected(trx)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={5}>
                                    <EmptyState
                                        icon={Activity}
                                        title={transactions.length ? "Nggak ada yang cocok" : "Belum ada transaksi"}
                                        description={transactions.length ? "Coba ubah kata kunci atau filter." : "Transaksi dari merchant bakal muncul di sini."}
                                        action={filtered ? <Button variant="secondary" size="sm" icon={FilterX} onClick={resetFilters}>Reset filter</Button> : undefined}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableCard>

            {selected && (
                <Drawer
                    onClose={() => setSelected(null)}
                    title="Detail transaksi"
                    subtitle={<span className="font-mono text-xs break-all">{selected.order_id}</span>}
                    width="sm:max-w-2xl"
                    footer={
                        <Button icon={RefreshCw} loading={syncingId === selected.id} disabled={syncingId !== null} onClick={() => syncStatus(selected)}>
                            Cek status ke PG
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-slate-500">Nominal</p>
                                <p className="tabular text-2xl font-semibold tracking-tight text-slate-900">{formatRupiah(selected.amount)}</p>
                            </div>
                            <StatusBadge status={selected.status} />
                        </div>
                        <DetailList items={[
                            ["Merchant", selected.merchant_name || selected.merchant_id],
                            ["Gateway", selected.gateway_name || selected.gateway_id || "-"],
                            ["Metode bayar", <span key="m" className="font-mono">{selected.payment_method}</span>],
                            ["HTTP dari PG", selected.pg_status_code || "-"],
                            ["Dibuat", formatDateTime(selected.created_at)],
                        ]} />
                        <div className="space-y-3">
                            <CopyField label="ID transaksi Dupay" value={selected.id} />
                            {selected.pg_reference_id && <CopyField label="Referensi PG" value={selected.pg_reference_id} />}
                            {selected.checkout_url && <CopyField label="Checkout URL" value={selected.checkout_url} />}
                        </div>
                        <JsonBlock title="Request dari merchant" value={selected.client_payload} />
                        <JsonBlock title="Response gateway" value={selected.pg_response} />
                    </div>
                </Drawer>
            )}
        </div>
    );
}

function JsonBlock({ title, value }: { title: string; value: string }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-slate-600">{title}</p>
                {value && (
                    <button onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success("Disalin"))} className="text-[11px] font-medium text-slate-500 hover:text-slate-900">
                        Salin
                    </button>
                )}
            </div>
            <pre className="text-[11px] leading-relaxed font-mono text-slate-200 bg-slate-900 rounded-xl p-4 overflow-x-auto max-h-72 whitespace-pre-wrap break-all">{prettyJSON(value)}</pre>
        </div>
    );
}
