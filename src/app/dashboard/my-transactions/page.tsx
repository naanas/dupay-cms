"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import {
    Button, CopyField, DetailList, Drawer, EmptyState, formatDateTime, formatRupiah, IconButton, PageHeader, SearchInput,
    Segmented, StatusBadge, STATUS_LABEL, TableCard, TableSkeleton, tdClass, thClass,
} from "../../../components/ui";
import { toast } from "../../../components/overlays";
import { Activity, Eye, RefreshCw } from "lucide-react";

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

type StatusFilter = "" | "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";

export default function MyTransactionsPage() {
    const [items, setItems] = useState<Trx[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<StatusFilter>("");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Trx | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (query) params.set("q", query);
        api.fetchMerchant(`/transactions?${params}`)
            .then(data => setItems(Array.isArray(data) ? data : []))
            .catch(err => toast.error("Gagal memuat transaksi", errorMessage(err)))
            .finally(() => setLoading(false));
    }, [status, query, reloadKey]);

    const reload = () => { setLoading(true); setReloadKey(k => k + 1); };

    // Pencarian ke server: jalan setelah berhenti ngetik sebentar (atau langsung kalau Enter).
    useEffect(() => {
        const q = search.trim();
        if (q === query) return;
        const t = setTimeout(() => { setLoading(true); setQuery(q); }, 400);
        return () => clearTimeout(t);
    }, [search, query]);

    // Cek status langsung ke payment gateway (kalau webhook telat).
    const sync = async (trx: Trx) => {
        setSyncingId(trx.id);
        try {
            const updated: Trx = await api.fetchMerchant(`/transactions/${trx.id}/sync`, "POST");
            setItems(prev => prev.map(t => (t.id === updated.id ? updated : t)));
            if (selected?.id === updated.id) setSelected(updated);
            if (updated.status === trx.status) toast.info(`${trx.order_id}: status masih ${STATUS_LABEL[trx.status] || trx.status}`);
            else toast.success(`${trx.order_id}: status jadi ${STATUS_LABEL[updated.status] || updated.status}`);
        } catch (err) {
            toast.error(`Cek status ${trx.order_id} gagal`, errorMessage(err));
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <PageHeader
                title="Transaksi"
                subtitle="Semua transaksi yang dibuat toko lu lewat Dupay (100 terbaru)."
                action={<Button variant="secondary" icon={RefreshCw} loading={loading} onClick={reload}>Muat ulang</Button>}
            />

            {loading && items.length === 0 ? <TableSkeleton cols={5} /> : (
                <TableCard
                    className={`transition-opacity duration-300 ${loading ? "opacity-60" : ""}`}
                    toolbar={
                        <>
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                onSubmit={() => { const q = search.trim(); if (q !== query) { setLoading(true); setQuery(q); } }}
                                placeholder="Cari Order ID…"
                                className="flex-1 min-w-0 lg:max-w-sm"
                            />
                            <Segmented<StatusFilter>
                                className="lg:ml-auto"
                                value={status}
                                onChange={v => { setLoading(true); setStatus(v); }}
                                options={[
                                    { value: "", label: "Semua" },
                                    { value: "SUCCESS", label: "Berhasil" },
                                    { value: "PENDING", label: "Menunggu" },
                                    { value: "FAILED", label: "Gagal" },
                                    { value: "REFUNDED", label: "Refund" },
                                ]}
                            />
                        </>
                    }
                >
                    <table className="data-table text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className={`${thClass} pl-5`}>Order ID</th>
                                <th className={thClass}>Metode</th>
                                <th className={`${thClass} text-right`}>Nominal</th>
                                <th className={thClass}>Status</th>
                                <th className={`${thClass} pr-5 text-right w-24`}><span className="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 stagger">
                            {!loading && items.length === 0 && (
                                <tr><td colSpan={5}>
                                    <EmptyState icon={Activity} title={status || query ? "Nggak ada yang cocok" : "Belum ada transaksi"} description={status || query ? "Coba kata kunci atau status lain." : "Transaksi dari API bakal muncul di sini."} />
                                </td></tr>
                            )}
                            {items.map(t => (
                                <tr key={t.id} onClick={() => setSelected(t)} className="hover:bg-slate-50/80 cursor-pointer">
                                    <td className={`${tdClass} pl-5`}>
                                        <div>
                                            <div className="font-mono text-xs font-medium text-slate-900 break-all">{t.order_id}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(t.created_at)}</div>
                                        </div>
                                    </td>
                                    <td className={`${tdClass} font-mono text-xs uppercase text-slate-600`} data-label="Metode">{t.payment_method}</td>
                                    <td className={`${tdClass} tabular font-semibold text-slate-900 text-right`} data-label="Nominal">{formatRupiah(t.amount)}</td>
                                    <td className={tdClass} data-label="Status"><StatusBadge status={t.status} /></td>
                                    <td className={`${tdClass} pr-5`} data-label="Aksi">
                                        <div className="flex justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                                            {t.status === "PENDING" && (
                                                <IconButton icon={RefreshCw} label="Cek status terbaru" tone="brand" spinning={syncingId === t.id} disabled={syncingId === t.id} onClick={() => sync(t)} />
                                            )}
                                            <IconButton icon={Eye} label="Detail" onClick={() => setSelected(t)} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableCard>
            )}

            {selected && (
                <Drawer
                    onClose={() => setSelected(null)}
                    title="Detail transaksi"
                    subtitle={<span className="font-mono text-xs break-all">{selected.order_id}</span>}
                    footer={selected.status === "PENDING" ? (
                        <Button icon={RefreshCw} loading={syncingId === selected.id} onClick={() => sync(selected)}>Cek status terbaru</Button>
                    ) : undefined}
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
                            ["Metode bayar", <span key="m" className="font-mono">{selected.payment_method}</span>],
                            ["Dibuat", formatDateTime(selected.created_at)],
                        ]} />
                        <div className="space-y-3">
                            <CopyField label="ID transaksi Dupay" value={selected.id} hint="Dipakai di GET /v1/charge/:id" />
                            {selected.reference && <CopyField label="Referensi pembayaran" value={selected.reference} />}
                            {selected.payment_code && <CopyField label="Kode bayar / nomor VA / QR" value={selected.payment_code} />}
                            {selected.checkout_url && <CopyField label="Link halaman bayar" value={selected.checkout_url} />}
                            {selected.payment_deeplink && <CopyField label="Deeplink" value={selected.payment_deeplink} />}
                        </div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}
