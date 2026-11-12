"use client";

import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { consumeIntentFromURL, onIntent } from '../../../lib/nav';
import GatewayEditor from './GatewayEditor';
import { authConfig, autoEndpointName, endpointsFromGateway, GatewayRecord } from './gatewayTypes';
import { CreditCard, Globe, Pencil, Plus, Route, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton, PageHeader, PageSkeleton, Panel, Switch, Tag, TableCard, tdClass, thClass } from '../../../components/ui';
import { confirmDialog, toast } from '../../../components/overlays';

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
    const loadGateways = async () => {
        try {
            const data = await api.fetchCMS('/gateways');
            setGateways(Array.isArray(data) ? data : []);
            // Terpisah biar daftar gateway tetap tampil walau endpoint ini gagal (mis. backend versi lama).
            api.fetchCMS('/payment-methods/disabled')
                .then(disabled => setDisabledMethods(Array.isArray(disabled) ? disabled : []))
                .catch(err => console.warn('Gagal ambil metode bayar yang dimatiin:', err));
        } catch (err) {
            toast.error('Gagal memuat gateway', errorMessage(err));
        } finally { setLoading(false); }
    };

    useEffect(() => { loadGateways(); }, []);

    // "Tambah gateway" dari command palette.
    useEffect(() => {
        const openNew = () => setEditing(null);
        if (consumeIntentFromURL('new-gateway')) queueMicrotask(openNew);
        return onIntent('new-gateway', openNew);
    }, []);

    // Pindah daftar <-> editor: mulai dari atas halaman.
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [editing]);

    const handleDelete = async (gw: GatewayRecord) => {
        const ok = await confirmDialog({
            title: `Hapus gateway ${gw.name}?`,
            description: 'Endpoint & channel-nya ikut terhapus. Transaksi lama tetap tersimpan.',
            confirmLabel: 'Hapus gateway',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            await api.fetchCMS(`/gateways/${gw.id}`, 'DELETE');
            toast.success(`${gw.name} dihapus`);
            loadGateways();
        } catch (err) {
            toast.error('Gagal hapus gateway', errorMessage(err));
        }
    };

    const toggleMethod = async (code: string, active: boolean) => {
        const prev = disabledMethods;
        setDisabledMethods(active ? prev.filter(c => c !== code) : [...prev, code]);
        try {
            await api.fetchCMS(`/payment-methods/${encodeURIComponent(code)}`, 'PUT', { is_active: active });
            toast.success(active ? `${code} ditampilkan ke merchant` : `${code} disembunyikan dari merchant`);
        } catch (err) {
            setDisabledMethods(prev);
            toast.error('Gagal mengubah metode bayar', errorMessage(err));
        }
    };

    if (loading) return <PageSkeleton table tableCols={4} />;

    if (editing !== undefined) {
        return (
            <GatewayEditor
                key={editing?.id || 'new'}
                gateway={editing}
                onBack={() => { setEditing(undefined); loadGateways(); }}
                onSaved={loadGateways}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in">
            <PageHeader
                title="Payment Gateways"
                subtitle="Koneksi ke penyedia layanan pembayaran (PG). Klik gateway buat ngubah konfigurasinya."
                action={<Button icon={Plus} onClick={() => setEditing(null)}>Tambah gateway</Button>}
            />

            {gateways.length === 0 ? (
                <Panel>
                    <EmptyState
                        icon={CreditCard}
                        title="Belum ada payment gateway"
                        description="Hubungkan PG pertama (mis. Tripay atau iPaymu) biar merchant bisa mulai transaksi."
                        action={<Button icon={Plus} onClick={() => setEditing(null)}>Tambah gateway</Button>}
                    />
                </Panel>
            ) : (
                <TableCard>
                    <table className="data-table text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className={`${thClass} pl-5 w-24`}>Prioritas</th>
                                <th className={thClass}>Gateway</th>
                                <th className={thClass}>Endpoint</th>
                                <th className={thClass}>Autentikasi</th>
                                <th className={`${thClass} pr-5 text-right`}><span className="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 stagger">
                            {gateways.map(gw => {
                                const endpoints = endpointsFromGateway(gw);
                                return (
                                    <tr key={gw.id} onClick={() => setEditing(gw)} className="hover:bg-slate-50/80 cursor-pointer">
                                        <td className={`${tdClass} pl-5`} data-label="Prioritas">
                                            <span className="tabular inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-lg bg-slate-100 font-mono text-xs font-semibold text-slate-700">{gw.priority ?? 0}</span>
                                        </td>
                                        <td className={tdClass}>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900">{gw.name}</span>
                                                    {gw.is_active === false ? <Tag>Nonaktif</Tag> : <Tag tone="green">Aktif</Tag>}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                    <Globe size={12} className="text-slate-400 shrink-0" />
                                                    <span className="break-all font-mono">{gw.base_url}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={tdClass} data-label="Endpoint">
                                            <div className="flex flex-wrap gap-1">
                                                {endpoints.map(ep => (
                                                    <Tag key={ep.uid} className={ep.is_active ? '' : 'line-through opacity-50'}>{autoEndpointName(ep) || ep.name}</Tag>
                                                ))}
                                                {endpoints.length === 0 && <Tag tone="amber">Belum ada endpoint</Tag>}
                                            </div>
                                        </td>
                                        <td className={tdClass} data-label="Auth">
                                            <Tag tone="brand">{authConfig(gw.auth_type).label}</Tag>
                                        </td>
                                        <td className={`${tdClass} pr-5 text-right`} data-label="Aksi">
                                            <div className="flex justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                                                <IconButton icon={Pencil} label="Edit" tone="brand" onClick={() => setEditing(gw)} />
                                                <IconButton icon={Trash2} label="Hapus" tone="red" onClick={() => handleDelete(gw)} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableCard>
            )}

            {gateways.length > 0 && <RoutingOverview gateways={gateways} disabled={disabledMethods} onToggle={toggleMethod} />}
        </div>
    );
}

function RoutingOverview({ gateways, disabled, onToggle }: { gateways: GatewayRecord[]; disabled: string[]; onToggle: (code: string, active: boolean) => void }) {
    const routing = buildRouting(gateways);
    return (
        <Panel
            title={<span className="flex items-center gap-2"><Route size={16} className="text-slate-400" /> Routing metode bayar</span>}
            subtitle={<>
                Merchant cuma kirim kode metode bayar (mis. <code className="font-mono">bri</code>). Dupay pakai gateway pertama yang aktif, punya channel itu, & nominalnya masuk batas min/max channel.
                Gateway berikutnya cuma dipakai kalau yang sebelumnya nggak memenuhi syarat itu, bukan kalau PG-nya error.
                Matiin toggle buat nyembunyiin metode bayar dari merchant di semua gateway.
            </>}
        >
            {routing.length === 0 ? (
                <EmptyState icon={Route} title="Belum ada channel aktif" description="Isi Daftar Channel di salah satu gateway dulu." className="py-8" />
            ) : (
                <div className="table-wrap -mx-1">
                    <table className="data-table text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className={`${thClass} w-16 pl-1`}>Aktif</th>
                                <th className={thClass}>Kode</th>
                                <th className={thClass}>Metode bayar</th>
                                <th className={thClass}>Dipakai</th>
                                <th className={thClass}>Cadangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {routing.map(([code, row]) => {
                                const active = !disabled.includes(code);
                                return (
                                    <tr key={code} className={`transition-opacity duration-200 ${active ? '' : 'opacity-50'}`}>
                                        <td className="py-2.5 px-4 pl-1" data-label="Aktif">
                                            <Switch checked={active} onChange={v => onToggle(code, v)} label={active ? 'Sembunyikan metode bayar ini' : 'Tampilkan metode bayar ini'} />
                                        </td>
                                        <td className="py-2.5 px-4 font-mono text-xs" data-label="Kode">{code}</td>
                                        <td className="py-2.5 px-4 text-slate-700" data-label="Metode">{row.label}</td>
                                        <td className="py-2.5 px-4 font-medium text-slate-900" data-label="Dipakai">{row.gateways[0]}</td>
                                        <td className="py-2.5 px-4 text-slate-500" data-label="Cadangan">{row.gateways.slice(1).join(', ') || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}
