"use client";

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import GatewayEditor from './GatewayEditor';
import { authConfig, autoEndpointName, endpointsFromGateway, GatewayRecord } from './gatewayTypes';
import { Plus, Globe, Trash2, Pencil } from 'lucide-react';
import { PageSkeleton } from '../../../components/ui';

type ChannelRow = { code?: string; label?: string; active?: boolean; min_amount?: number; max_amount?: number };

// Metode bayar -> gateway yang punya channel itu, urut sesuai prioritas (sama kayak pemilihan di backend).
const buildRouting = (gateways: GatewayRecord[]) => {
    const rows = new Map<string, { label: string; gateways: string[] }>();
    const sorted = gateways
        .filter(gw => gw.is_active !== false)
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.name.localeCompare(b.name));
    for (const gw of sorted) {
        let channels: ChannelRow[] = [];
        try { const v = JSON.parse(gw.channel_mapping || '[]'); channels = Array.isArray(v) ? v : []; } catch { /* format lama / rusak */ }
        for (const ch of channels) {
            const code = (ch.code || '').trim().toLowerCase();
            if (!code || ch.active === false) continue;
            const row = rows.get(code) || { label: ch.label || code, gateways: [] };
            if (!row.gateways.includes(gw.name)) row.gateways.push(gw.name);
            rows.set(code, row);
        }
    }
    return [...rows.entries()].sort(([a], [b]) => a.localeCompare(b));
};

export default function GatewaysPage() {
    const [gateways, setGateways] = useState<GatewayRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [disabledMethods, setDisabledMethods] = useState<string[]>([]);
    // undefined = lagi lihat daftar, null = tambah gateway baru, object = edit gateway itu
    const [editing, setEditing] = useState<GatewayRecord | null | undefined>(undefined);
    const topRef = useRef<HTMLDivElement>(null);

    const loadGateways = async () => {
        try {
            const data = await api.fetchCMS('/gateways');
            setGateways(Array.isArray(data) ? data : []);
            // Terpisah biar daftar gateway tetap tampil walau endpoint ini gagal (mis. backend versi lama).
            api.fetchCMS('/payment-methods/disabled')
                .then(disabled => setDisabledMethods(Array.isArray(disabled) ? disabled : []))
                .catch(err => console.warn('Gagal ambil metode bayar yang dimatiin:', err));
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { loadGateways(); }, []);

    // Konten dashboard di-scroll di container sendiri (bukan window), jadi scroll pakai elemen.
    useEffect(() => {
        topRef.current?.scrollIntoView({ block: 'start' });
    }, [editing]);

    const handleDelete = async (gw: GatewayRecord) => {
        if (!confirm(`Hapus gateway ${gw.name}? Endpoint & channel-nya ikut terhapus.`)) return;
        try {
            await api.fetchCMS(`/gateways/${gw.id}`, 'DELETE');
            loadGateways();
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const toggleMethod = async (code: string, active: boolean) => {
        const prev = disabledMethods;
        setDisabledMethods(active ? prev.filter(c => c !== code) : [...prev, code]);
        try {
            await api.fetchCMS(`/payment-methods/${encodeURIComponent(code)}`, 'PUT', { is_active: active });
        } catch (err) {
            setDisabledMethods(prev);
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    if (loading) return <PageSkeleton table tableCols={4} />;

    if (editing !== undefined) {
        return (
            <div ref={topRef}>
                <GatewayEditor
                    key={editing?.id || 'new'}
                    gateway={editing}
                    onBack={() => { setEditing(undefined); loadGateways(); }}
                    onSaved={loadGateways}
                />
            </div>
        );
    }

    return (
        <div ref={topRef} className="space-y-6 animate-in pb-20">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Gateways</h1>
                    <p className="text-sm text-slate-500 mt-1">Koneksi ke penyedia layanan pembayaran (PG). Klik gateway buat ngubah konfigurasinya.</p>
                </div>
                <button onClick={() => setEditing(null)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
                    <Plus size={16} /> Tambah Gateway
                </button>
            </div>

            {gateways.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <p className="text-sm text-slate-500 mb-4">Belum ada payment gateway.</p>
                    <button onClick={() => setEditing(null)} className="text-sm font-bold text-blue-600 hover:underline">+ Tambah gateway pertama</button>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="table-wrap">
                        <table className="data-table text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest w-24">Prioritas</th>
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Gateway</th>
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Endpoint</th>
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Autentikasi</th>
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 stagger">
                                {gateways.map(gw => (
                                    <tr key={gw.id} onClick={() => setEditing(gw)} className="hover:bg-slate-50 cursor-pointer">
                                        <td className="p-5 font-mono text-sm font-bold text-slate-700" data-label="Prioritas">{gw.priority ?? 0}</td>
                                        <td className="p-5">
                                            <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{gw.name}</span>
                                                {gw.is_active === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">NONAKTIF</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                <Globe size={12} className="text-blue-500" />
                                                <span className="break-all">{gw.base_url}</span>
                                            </div>
                                            </div>
                                        </td>
                                        <td className="p-5" data-label="Endpoint">
                                            <div className="flex flex-wrap gap-1">
                                                {endpointsFromGateway(gw).map(ep => (
                                                    <span key={ep.uid} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ep.is_active ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-white text-slate-300 border-slate-100 line-through'}`}>
                                                        {autoEndpointName(ep) || ep.name}
                                                    </span>
                                                ))}
                                                {endpointsFromGateway(gw).length === 0 && <span className="text-xs text-amber-600">Belum ada endpoint</span>}
                                            </div>
                                        </td>
                                        <td className="p-5" data-label="Auth">
                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200">
                                                {authConfig(gw.auth_type).label}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right" data-label="Aksi">
                                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setEditing(gw)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg" title="Edit"><Pencil size={18} /></button>
                                                <button onClick={() => handleDelete(gw)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {gateways.length > 0 && <RoutingOverview gateways={gateways} disabled={disabledMethods} onToggle={toggleMethod} />}
        </div>
    );
}

function RoutingOverview({ gateways, disabled, onToggle }: { gateways: GatewayRecord[]; disabled: string[]; onToggle: (code: string, active: boolean) => void }) {
    const routing = buildRouting(gateways);
    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
            <h2 className="text-base font-black text-slate-900">Metode bayar yang bisa dipakai merchant</h2>
            <p className="text-xs text-slate-500 mt-0.5">
                Merchant cuma kirim kode metode bayar (mis. <code>bri</code>). Dupay pakai gateway pertama yang aktif, punya channel itu, & nominalnya masuk batas min/max channel.
                Gateway berikutnya cuma dipakai kalau yang sebelumnya nggak memenuhi syarat itu, bukan kalau PG-nya error.
                Matiin toggle buat nyembunyiin metode bayar dari merchant di semua gateway (setting channel di gateway nggak berubah).
            </p>
            {routing.length === 0 ? (
                <p className="text-sm text-amber-600 mt-4">Belum ada channel aktif di gateway mana pun. Isi Daftar Channel di gateway dulu.</p>
            ) : (
                <div className="table-wrap mt-4">
                    <table className="data-table text-left text-sm">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="py-2 pr-4 w-16">Aktif</th>
                                <th className="py-2 pr-4">Kode</th>
                                <th className="py-2 pr-4">Metode bayar</th>
                                <th className="py-2 pr-4">Dipakai</th>
                                <th className="py-2">Gateway lain</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {routing.map(([code, row]) => {
                                const active = !disabled.includes(code);
                                return (
                                <tr key={code} className={`transition-opacity duration-200 ${active ? '' : 'opacity-50'}`}>
                                    <td className="py-2 pr-4" data-label="Aktif">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={active}
                                            title={active ? 'Matiin metode bayar ini' : 'Nyalain metode bayar ini'}
                                            onClick={() => onToggle(code, !active)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                        </button>
                                    </td>
                                    <td className="py-2 pr-4 font-mono text-xs" data-label="Kode">{code}</td>
                                    <td className="py-2 pr-4" data-label="Metode">{row.label}</td>
                                    <td className="py-2 pr-4 font-bold text-slate-800" data-label="Dipakai">{row.gateways[0]}</td>
                                    <td className="py-2 text-slate-500" data-label="Gateway lain">{row.gateways.slice(1).join(', ') || '-'}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
