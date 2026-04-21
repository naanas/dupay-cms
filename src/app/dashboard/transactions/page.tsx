"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { Eye, RefreshCw } from "lucide-react";

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

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<TransactionItem | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [merchantFilter, setMerchantFilter] = useState("ALL");
    const [gatewayFilter, setGatewayFilter] = useState("ALL");

    const loadTransactions = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const data = await api.fetchCMS("/transactions");
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal mengambil transaksi:", err);
        } finally {
            setLoading(false);
            if (isRefresh) setRefreshing(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    const stats = useMemo(() => {
        const total = transactions.length;
        const success = transactions.filter((trx) => trx.status === "SUCCESS").length;
        const pending = transactions.filter((trx) => trx.status === "PENDING").length;
        const failed = transactions.filter((trx) => trx.status === "FAILED").length;
        return { total, success, pending, failed };
    }, [transactions]);

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

    const formatAmount = (amount: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount || 0);

    const statusClass = (status: string) => {
        if (status === "SUCCESS") return "bg-emerald-50 text-emerald-700 border-emerald-100";
        if (status === "FAILED") return "bg-red-50 text-red-700 border-red-100";
        if (status === "REFUNDED") return "bg-amber-50 text-amber-700 border-amber-100";
        return "bg-blue-50 text-blue-700 border-blue-100";
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-400 font-medium">Memuat data transaksi...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transaction Monitor</h1>
                    <p className="text-sm text-slate-500 mt-1">Pantau request client dan response payment gateway secara realtime.</p>
                </div>
                <button
                    onClick={() => loadTransactions(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-70"
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? "Memperbarui..." : "Refresh Data"}
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-black">{stats.total}</p></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs text-slate-500">SUCCESS</p><p className="text-2xl font-black text-emerald-600">{stats.success}</p></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs text-slate-500">PENDING</p><p className="text-2xl font-black text-blue-600">{stats.pending}</p></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs text-slate-500">FAILED</p><p className="text-2xl font-black text-red-600">{stats.failed}</p></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari order, merchant, gateway, status..."
                        className="md:col-span-2 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="FAILED">FAILED</option>
                        <option value="REFUNDED">REFUNDED</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearch("");
                            setStatusFilter("ALL");
                            setMerchantFilter("ALL");
                            setGatewayFilter("ALL");
                        }}
                        className="w-full rounded-xl px-3 py-2.5 text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        Reset Filter
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <select
                        value={merchantFilter}
                        onChange={(e) => setMerchantFilter(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Semua Merchant</option>
                        {merchantOptions.map((merchant) => (
                            <option key={merchant} value={merchant}>{merchant}</option>
                        ))}
                    </select>
                    <select
                        value={gatewayFilter}
                        onChange={(e) => setGatewayFilter(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Semua Gateway</option>
                        {gatewayOptions.map((gateway) => (
                            <option key={gateway} value={gateway}>{gateway}</option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                    Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Waktu</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Order</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Merchant</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Gateway</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Amount</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">PG HTTP</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((trx) => (
                                <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 text-xs text-slate-600">{new Date(trx.created_at).toLocaleString("id-ID")}</td>
                                    <td className="px-5 py-3">
                                        <p className="text-sm font-bold text-slate-800">{trx.order_id}</p>
                                        <p className="text-[11px] text-slate-500">{trx.payment_method}</p>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-slate-700">{trx.merchant_name || trx.merchant_id}</td>
                                    <td className="px-5 py-3 text-sm text-slate-700">{trx.gateway_name || trx.gateway_id}</td>
                                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{formatAmount(trx.amount)}</td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex px-2.5 py-1 rounded-md border text-[11px] font-bold ${statusClass(trx.status)}`}>
                                            {trx.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs font-mono px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                                            {trx.pg_status_code || "-"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => setSelected(trx)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                            title="Lihat Detail"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-500">
                                        Tidak ada data yang cocok dengan filter pencarian.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Detail Transaksi</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {selected.order_id} - {selected.merchant_name || selected.merchant_id}
                                </p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-800 font-bold text-sm">
                                Tutup
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold">Gateway Response</p>
                                <pre className="mt-2 text-xs text-slate-700 overflow-x-auto max-h-56 whitespace-pre-wrap break-all">{selected.pg_response || "-"}</pre>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold">Client Request Payload</p>
                                <pre className="mt-2 text-xs text-slate-700 overflow-x-auto max-h-56 whitespace-pre-wrap break-all">{selected.client_payload || "-"}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
