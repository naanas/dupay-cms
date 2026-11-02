"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import { CopyField, formatDateTime, formatRupiah, inputClass, Modal, PageHeader, StatusBadge, STATUS_LABEL, TableSkeleton } from "../../../components/ui";
import { Eye, RefreshCw, Search, X } from "lucide-react";

type Trx = {
    id: string;
    order_id: string;
    amount: number;
    payment_method: string;
    status: string;
    reference: string;
    payment_code: string;
    checkout_url: string;
    payment_deeplink: string;
    created_at: string;
};

export default function MyTransactionsPage() {
    const [items, setItems] = useState<Trx[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Trx | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (query) params.set("q", query);
        api.fetchMerchant(`/transactions?${params}`)
            .then(data => setItems(Array.isArray(data) ? data : []))
            .catch(err => setMessage(errorMessage(err)))
            .finally(() => setLoading(false));
    }, [status, query, reloadKey]);

    const reload = () => { setLoading(true); setReloadKey(k => k + 1); };

    // Cek status langsung ke payment gateway (kalau webhook telat).
    const sync = async (trx: Trx) => {
        setSyncingId(trx.id);
        setMessage("");
        try {
            const updated: Trx = await api.fetchMerchant(`/transactions/${trx.id}/sync`, "POST");
            setItems(prev => prev.map(t => (t.id === updated.id ? updated : t)));
            if (selected?.id === updated.id) setSelected(updated);
            setMessage(updated.status === trx.status
                ? `${trx.order_id}: status masih ${STATUS_LABEL[trx.status] || trx.status}.`
                : `${trx.order_id}: status berubah jadi ${STATUS_LABEL[updated.status] || updated.status}.`);
        } catch (err) {
            setMessage(`${trx.order_id}: ${errorMessage(err)}`);
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in pb-20">
            <PageHeader
                title="Transaksi"
                subtitle="Semua transaksi yang dibuat toko lu lewat Dupay (100 terbaru)."
                action={
                    <button onClick={reload} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Muat ulang
                    </button>
                }
            />

            <div className="flex flex-col md:flex-row gap-3">
                <form onSubmit={e => { e.preventDefault(); if (search.trim() !== query) { setLoading(true); setQuery(search.trim()); } }} className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${inputClass} pl-9 bg-white`} placeholder="Cari Order ID, lalu Enter" value={search} onChange={e => setSearch(e.target.value)} />
                </form>
                <select className={`${inputClass} md:w-56 bg-white`} value={status} onChange={e => { setLoading(true); setStatus(e.target.value); }}>
                    <option value="">Semua status</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {message && <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">{message}</div>}

            {loading && items.length === 0 ? <TableSkeleton cols={5} /> : (
            <div className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-opacity duration-300 ${loading ? "opacity-60" : ""}`}>
                <div className="table-wrap">
                    <table className="data-table text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Metode</th>
                                <th className="p-4">Nominal</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 stagger">
                            {!loading && items.length === 0 && (
                                <tr><td colSpan={5} className="p-10 text-center text-slate-400">Belum ada transaksi{status || query ? " yang cocok sama filter" : ""}.</td></tr>
                            )}
                            {items.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div>
                                            <div className="font-mono text-xs font-bold text-slate-800 break-all">{t.order_id}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(t.created_at)}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-slate-600" data-label="Metode">{t.payment_method}</td>
                                    <td className="p-4 font-bold text-slate-800" data-label="Nominal">{formatRupiah(t.amount)}</td>
                                    <td className="p-4" data-label="Status"><StatusBadge status={t.status} /></td>
                                    <td className="p-4" data-label="Aksi">
                                        <div className="flex justify-end gap-1">
                                            {t.status === "PENDING" && (
                                                <button onClick={() => sync(t)} disabled={syncingId === t.id} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-50" title="Cek status terbaru">
                                                    <RefreshCw size={16} className={syncingId === t.id ? "animate-spin" : ""} />
                                                </button>
                                            )}
                                            <button onClick={() => setSelected(t)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Detail">
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {selected && (
                <Modal onClose={() => setSelected(null)}>
                        <button onClick={() => setSelected(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800"><X size={22} /></button>
                        <h2 className="text-xl font-black text-slate-900">Detail transaksi</h2>
                        <div className="mt-1"><StatusBadge status={selected.status} /></div>
                        <dl className="mt-5 space-y-2.5 text-sm">
                            {[
                                ["Order ID", selected.order_id],
                                ["Nominal", formatRupiah(selected.amount)],
                                ["Metode bayar", selected.payment_method],
                                ["Dibuat", formatDateTime(selected.created_at)],
                            ].map(([k, v]) => (
                                <div key={k} className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                                    <dt className="text-slate-500">{k}</dt>
                                    <dd className="col-span-2 font-semibold text-slate-800 break-all">{v}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="mt-5 space-y-3">
                            <CopyField label="ID transaksi Dupay" value={selected.id} hint="Dipakai di GET /v1/charge/:id" />
                            {selected.reference && <CopyField label="Referensi pembayaran" value={selected.reference} />}
                            {selected.payment_code && <CopyField label="Kode bayar / nomor VA / QR" value={selected.payment_code} />}
                            {selected.checkout_url && <CopyField label="Link halaman bayar" value={selected.checkout_url} />}
                            {selected.payment_deeplink && <CopyField label="Deeplink" value={selected.payment_deeplink} />}
                        </div>
                        {selected.status === "PENDING" && (
                            <button onClick={() => sync(selected)} disabled={syncingId === selected.id} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
                                <RefreshCw size={16} className={syncingId === selected.id ? "animate-spin" : ""} /> Cek status terbaru
                            </button>
                        )}
                </Modal>
            )}
        </div>
    );
}
