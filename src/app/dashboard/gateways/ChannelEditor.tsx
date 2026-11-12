"use client";

import { useMemo, useState } from 'react';
import { Plus, Trash2, Code2, Table2, DownloadCloud } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from '../../../components/overlays';

export type Channel = {
    code: string;
    pg_code: string;
    label?: string;
    method?: 'va' | 'qris' | 'cstore' | 'ewallet' | '';
    group?: 'Virtual Account' | 'QRIS' | 'E-Wallet' | 'Retail' | '';
    logo?: string;
    min_amount?: number;
    max_amount?: number;
    fee_flat?: number;
    fee_percent?: number;
    active: boolean;
    sync_state?: SyncState; // cuma buat tampilan hasil "Tarik dari PG", nggak ikut disimpan
};

type SyncState = 'new' | 'updated' | 'unchanged' | 'missing';

const SYNC_BADGE: Record<SyncState, { label: string; className: string } | null> = {
    new: { label: 'BARU', className: 'bg-emerald-100 text-emerald-700' },
    updated: { label: 'BERUBAH', className: 'bg-brand-100 text-brand-700' },
    missing: { label: 'HILANG DI PG', className: 'bg-amber-100 text-amber-700' },
    unchanged: null,
};

const METHODS: Channel['method'][] = ['', 'va', 'qris', 'ewallet', 'cstore'];
const GROUPS: Channel['group'][] = ['', 'Virtual Account', 'QRIS', 'E-Wallet', 'Retail'];

const emptyChannel = (): Channel => ({
    code: '',
    pg_code: '',
    label: '',
    method: '',
    group: '',
    logo: '',
    min_amount: 0,
    max_amount: 0,
    fee_flat: 0,
    fee_percent: 0,
    active: true,
});

const parseInitial = (raw: string): { channels: Channel[]; usedLegacy: boolean } => {
    const trimmed = (raw || '').trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') {
        return { channels: [], usedLegacy: false };
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return {
                channels: parsed.map((ch: any) => ({ ...emptyChannel(), ...ch, active: ch.active !== false })),
                usedLegacy: false,
            };
        }
        if (parsed && typeof parsed === 'object') {
            // legacy key-value: {"bca": "BCAVA"}
            const channels = Object.entries(parsed).map(([code, pg_code]) => ({
                ...emptyChannel(),
                code,
                pg_code: String(pg_code),
                label: code.toUpperCase(),
                active: true,
            }));
            return { channels, usedLegacy: true };
        }
    } catch {
        // ignore
    }
    return { channels: [], usedLegacy: false };
};

const serialize = (channels: Channel[]): string => {
    // Buang field kosong biar JSON rapi
    const cleaned = channels
        .filter(ch => ch.code.trim() !== '' && ch.pg_code.trim() !== '')
        .map(ch => {
            const out: any = { code: ch.code.trim(), pg_code: ch.pg_code.trim(), active: !!ch.active };
            if (ch.label) out.label = ch.label;
            if (ch.method) out.method = ch.method;
            if (ch.group) out.group = ch.group;
            if (ch.logo) out.logo = ch.logo;
            if (ch.min_amount && ch.min_amount > 0) out.min_amount = Number(ch.min_amount);
            if (ch.max_amount && ch.max_amount > 0) out.max_amount = Number(ch.max_amount);
            if (ch.fee_flat && ch.fee_flat > 0) out.fee_flat = Number(ch.fee_flat);
            if (ch.fee_percent && ch.fee_percent > 0) out.fee_percent = Number(ch.fee_percent);
            return out;
        });
    return cleaned.length === 0 ? '[]' : JSON.stringify(cleaned, null, 2);
};

type Props = {
    value: string;                   // raw JSON string (akan jadi isi channel_mapping column)
    onChange: (next: string) => void;
    getDraft: () => object;          // isi form gateway (boleh belum disimpan), dipakai buat Tarik dari PG
    fetchDisabledReason?: string;    // diisi = tombol Tarik dari PG dimatiin dengan alasan ini
};

export default function ChannelEditor({ value, onChange, getDraft, fetchDisabledReason }: Props) {
    const initial = useMemo(() => parseInitial(value), []); // parse sekali di mount
    const [channels, setChannels] = useState<Channel[]>(initial.channels);
    const [mode, setMode] = useState<'visual' | 'raw'>('visual');
    const [rawDraft, setRawDraft] = useState(value);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const [syncSummary, setSyncSummary] = useState<string | null>(null);

    const commitChannels = (next: Channel[]) => {
        setChannels(next);
        onChange(serialize(next));
    };

    const updateRow = (idx: number, patch: Partial<Channel>) => {
        const next = channels.map((ch, i) => (i === idx ? { ...ch, ...patch } : ch));
        commitChannels(next);
    };

    const addRow = () => commitChannels([...channels, emptyChannel()]);
    const removeRow = (idx: number) => commitChannels(channels.filter((_, i) => i !== idx));

    // Tarik daftar channel dari PG (endpoint "Daftar Channel" gateway ini), digabung sama yang lagi diedit.
    // Hasilnya cuma masuk form; baru tersimpan kalau admin klik Update Configuration.
    const fetchFromPG = async () => {
        if (fetchDisabledReason) return;
        setFetching(true);
        try {
            const res = await api.fetchCMS('/gateways/fetch-channels', 'POST', {
                gateway: { ...getDraft(), channel_mapping: serialize(channels) },
            });
            const items: Channel[] = (res?.data || []).map((ch: Partial<Channel>) => ({ ...emptyChannel(), ...ch, active: ch.active !== false }));
            commitChannels(items);
            setMode('visual');
            const count = (state: SyncState) => items.filter(ch => ch.sync_state === state).length;
            setSyncSummary(`${count('new')} baru, ${count('updated')} berubah, ${count('missing')} hilang dari PG (dinonaktifkan). Cek kode & jenis channel-nya, lalu klik Simpan.`);
        } catch (err) {
            toast.error('Gagal tarik channel dari PG', err instanceof Error ? err.message : String(err));
        } finally {
            setFetching(false);
        }
    };

    const switchToRaw = () => {
        setRawDraft(serialize(channels));
        setJsonError(null);
        setMode('raw');
    };

    const switchToVisual = () => {
        try {
            const parsed = parseInitial(rawDraft);
            setChannels(parsed.channels);
            onChange(serialize(parsed.channels));
            setJsonError(null);
            setMode('visual');
        } catch (e: any) {
            setJsonError(e?.message || 'JSON tidak valid');
        }
    };

    const handleRawChange = (next: string) => {
        setRawDraft(next);
        try {
            JSON.parse(next || '[]');
            setJsonError(null);
            onChange(next);
        } catch (e: any) {
            setJsonError(e?.message || 'JSON tidak valid');
        }
    };

    return (
        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tabel Channel</label>
                    {initial.usedLegacy && mode === 'visual' && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                            Migrated from legacy format
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {mode === 'visual' && (
                        <button
                            type="button"
                            onClick={fetchFromPG}
                            disabled={!!fetchDisabledReason || fetching}
                            title={fetchDisabledReason || 'Ambil daftar channel dari endpoint Daftar Channel'}
                            className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline disabled:text-slate-300 disabled:no-underline"
                        >
                            <DownloadCloud size={12} /> {fetching ? 'Menarik...' : 'Tarik dari PG'}
                        </button>
                    )}
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={switchToVisual}
                            className={`text-[11px] font-bold px-3 py-1.5 flex items-center gap-1 transition ${mode === 'visual' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Table2 size={12} /> Visual
                        </button>
                        <button
                            type="button"
                            onClick={switchToRaw}
                            className={`text-[11px] font-bold px-3 py-1.5 flex items-center gap-1 transition ${mode === 'raw' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Code2 size={12} /> Raw JSON
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-[11px] text-slate-400 -mt-1 mb-3">
                Kode Merchant = yang dikirim merchant (mis. <code>bca</code>). Kode di PG = yang dikirim ke PG (mis. <code>BCAVA</code>). Jenis nentuin endpoint Buat Transaksi mana yang dipakai.
                {fetchDisabledReason && <span className="block text-amber-600 mt-0.5">Tarik dari PG: {fetchDisabledReason}</span>}
            </p>

            {syncSummary && mode === 'visual' && (
                <div className="flex items-start justify-between gap-3 text-[11px] font-medium text-brand-800 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-3">
                    <span>{syncSummary}</span>
                    <button type="button" onClick={() => setSyncSummary(null)} className="font-bold text-brand-600 hover:underline">Tutup</button>
                </div>
            )}

            {mode === 'raw' ? (
                <div>
                    <textarea
                        className={`w-full border p-3 rounded-xl outline-none font-mono text-xs h-56 ${jsonError ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                        value={rawDraft}
                        onChange={e => handleRawChange(e.target.value)}
                    />
                    {jsonError && <p className="text-[10px] text-red-600 mt-1 font-medium">⚠ {jsonError}</p>}
                </div>
            ) : (
                <>
                    {channels.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-xs text-slate-400 mb-3">Belum ada channel. Tambah manual, atau atur endpoint Daftar Channel lalu klik &quot;Tarik dari PG&quot;.</p>
                            <button type="button" onClick={addRow} className="text-xs font-bold text-brand-600 hover:underline">
                                + Tambah Channel Manual
                            </button>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="data-table table-fixed text-xs">
                                <thead>
                                    <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="p-1.5 text-left w-14">On</th>
                                        <th className="p-1.5 text-left" title="Kode yang dikirim merchant di payment_method">Kode Merchant</th>
                                        <th className="p-1.5 text-left" title="Kode channel di PG, dikirim lewat {{payment_method}}">Kode di PG</th>
                                        <th className="p-1.5 text-left w-[18%]">Label</th>
                                        <th className="p-1.5 text-left" title="Nentuin endpoint Buat Transaksi mana yang dipakai">Jenis</th>
                                        <th className="p-1.5 text-left">Group</th>
                                        <th className="p-1.5 text-right">Min Amt</th>
                                        <th className="p-1.5 text-right">Fee Flat</th>
                                        <th className="p-1.5 text-right">Fee %</th>
                                        <th className="p-1.5 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {channels.map((ch, idx) => (
                                        <tr key={idx} className={`transition-opacity duration-200 ${ch.active ? '' : 'opacity-50'}`}>
                                            <td className="p-1" data-label="Aktif">
                                                <div className="flex items-center gap-1">
                                                    <input type="checkbox" checked={ch.active} onChange={e => updateRow(idx, { active: e.target.checked })} />
                                                    {ch.sync_state && SYNC_BADGE[ch.sync_state] && (
                                                        <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${SYNC_BADGE[ch.sync_state]!.className}`}>
                                                            {SYNC_BADGE[ch.sync_state]!.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-1" data-label="Kode merchant">
                                                <input
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] outline-none focus:border-brand-400"
                                                    placeholder="bca"
                                                    value={ch.code}
                                                    onChange={e => updateRow(idx, { code: e.target.value.toLowerCase() })}
                                                />
                                            </td>
                                            <td className="p-1" data-label="Kode di PG">
                                                <input
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] font-mono outline-none focus:border-brand-400"
                                                    placeholder="BCAVA"
                                                    value={ch.pg_code}
                                                    onChange={e => updateRow(idx, { pg_code: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-1" data-label="Label">
                                                <input
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] outline-none focus:border-brand-400"
                                                    placeholder="BCA Virtual Account"
                                                    value={ch.label || ''}
                                                    onChange={e => updateRow(idx, { label: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-1" data-label="Jenis">
                                                <select
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] bg-white outline-none focus:border-brand-400"
                                                    value={ch.method || ''}
                                                    onChange={e => updateRow(idx, { method: e.target.value as Channel['method'] })}
                                                >
                                                    {METHODS.map(m => <option key={m || 'none'} value={m || ''}>{m || '—'}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-1" data-label="Group">
                                                <select
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] bg-white outline-none focus:border-brand-400"
                                                    value={ch.group || ''}
                                                    onChange={e => updateRow(idx, { group: e.target.value as Channel['group'] })}
                                                >
                                                    {GROUPS.map(g => <option key={g || 'none'} value={g || ''}>{g || '—'}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-1" data-label="Min amount">
                                                <input
                                                    type="number"
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] text-right outline-none focus:border-brand-400"
                                                    placeholder="10000"
                                                    value={ch.min_amount || ''}
                                                    onChange={e => updateRow(idx, { min_amount: Number(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-1" data-label="Fee flat">
                                                <input
                                                    type="number"
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] text-right outline-none focus:border-brand-400"
                                                    placeholder="4500"
                                                    value={ch.fee_flat || ''}
                                                    onChange={e => updateRow(idx, { fee_flat: Number(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-1" data-label="Fee %">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-full min-w-0 border border-slate-200 p-1.5 rounded-md text-[11px] text-right outline-none focus:border-brand-400"
                                                    placeholder="0.7"
                                                    value={ch.fee_percent || ''}
                                                    onChange={e => updateRow(idx, { fee_percent: Number(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-1 text-right" data-label="Hapus">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(idx)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                                                    title="Hapus channel"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                type="button"
                                onClick={addRow}
                                className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-800"
                            >
                                <Plus size={12} /> Tambah Channel
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
