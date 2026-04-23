"use client";

import { useMemo, useState } from 'react';
import { Plus, Trash2, Code2, Table2 } from 'lucide-react';

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

// Default channels buat Tripay (paling umum). Bisa di-klik "Load Tripay Preset" buat autofill.
const TRIPAY_PRESET: Channel[] = [
    { code: 'qris', pg_code: 'QRIS', label: 'QRIS', method: 'qris', group: 'QRIS', logo: '/payment/qris.png', min_amount: 1000, fee_flat: 750, fee_percent: 0.7, active: true },
    { code: 'bca', pg_code: 'BCAVA', label: 'BCA Virtual Account', method: 'va', group: 'Virtual Account', logo: '/payment/bca.png', min_amount: 10000, fee_flat: 4500, active: true },
    { code: 'mandiri', pg_code: 'MANDIRIVA', label: 'Mandiri Virtual Account', method: 'va', group: 'Virtual Account', logo: '/payment/mandiri.png', min_amount: 10000, fee_flat: 4000, active: true },
    { code: 'bni', pg_code: 'BNIVA', label: 'BNI Virtual Account', method: 'va', group: 'Virtual Account', logo: '/payment/bni.png', min_amount: 10000, fee_flat: 4500, active: true },
    { code: 'bri', pg_code: 'BRIVA', label: 'BRI Virtual Account', method: 'va', group: 'Virtual Account', logo: '/payment/bri.png', min_amount: 10000, fee_flat: 3500, active: true },
    { code: 'cimb', pg_code: 'CIMBVA', label: 'CIMB Niaga VA', method: 'va', group: 'Virtual Account', logo: '/payment/cimb.png', min_amount: 10000, fee_flat: 4500, active: true },
    { code: 'permata', pg_code: 'PERMATAVA', label: 'Permata Virtual Account', method: 'va', group: 'Virtual Account', logo: '/payment/permata.png', min_amount: 10000, fee_flat: 4500, active: true },
    { code: 'dana', pg_code: 'DANA', label: 'DANA', method: 'ewallet', group: 'E-Wallet', logo: '/payment/dana.png', min_amount: 10000, fee_percent: 1.5, active: true },
    { code: 'ovo', pg_code: 'OVO', label: 'OVO', method: 'ewallet', group: 'E-Wallet', logo: '/payment/ovo.png', min_amount: 10000, fee_percent: 1.5, active: true },
    { code: 'shopeepay', pg_code: 'SHOPEEPAY', label: 'ShopeePay', method: 'ewallet', group: 'E-Wallet', logo: '/payment/shopeepay.png', min_amount: 10000, fee_percent: 2.0, active: true },
    { code: 'linkaja', pg_code: 'LINKAJA', label: 'LinkAja', method: 'ewallet', group: 'E-Wallet', logo: '/payment/linkaja.png', min_amount: 10000, fee_percent: 1.5, active: true },
    { code: 'indomaret', pg_code: 'INDOMARET', label: 'Indomaret', method: 'cstore', group: 'Retail', logo: '/payment/indomaret.png', min_amount: 10000, fee_flat: 3500, active: true },
    { code: 'alfamart', pg_code: 'ALFAMART', label: 'Alfamart', method: 'cstore', group: 'Retail', logo: '/payment/alfamart.png', min_amount: 10000, fee_flat: 3500, active: true },
];

type Props = {
    value: string;                   // raw JSON string (akan jadi isi channel_mapping column)
    onChange: (next: string) => void;
};

export default function ChannelEditor({ value, onChange }: Props) {
    const initial = useMemo(() => parseInitial(value), []); // parse sekali di mount
    const [channels, setChannels] = useState<Channel[]>(initial.channels);
    const [mode, setMode] = useState<'visual' | 'raw'>('visual');
    const [rawDraft, setRawDraft] = useState(value);
    const [jsonError, setJsonError] = useState<string | null>(null);

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

    const loadPreset = () => {
        if (channels.length > 0 && !confirm('Isi semua channel dengan preset Tripay? Data existing akan ditimpa.')) return;
        commitChannels([...TRIPAY_PRESET]);
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Channel Mapping</label>
                    {initial.usedLegacy && mode === 'visual' && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                            Migrated from legacy format
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {mode === 'visual' && (
                        <button type="button" onClick={loadPreset} className="text-[11px] font-bold text-blue-600 hover:underline">
                            Load Tripay Preset
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
                            <p className="text-xs text-slate-400 mb-3">Belum ada channel. Tambah manual atau klik "Load Tripay Preset".</p>
                            <button type="button" onClick={addRow} className="text-xs font-bold text-blue-600 hover:underline">
                                + Tambah Channel Manual
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="p-1.5 text-left">On</th>
                                        <th className="p-1.5 text-left">Code</th>
                                        <th className="p-1.5 text-left">PG Code</th>
                                        <th className="p-1.5 text-left">Label</th>
                                        <th className="p-1.5 text-left">Method</th>
                                        <th className="p-1.5 text-left">Group</th>
                                        <th className="p-1.5 text-right">Min Amt</th>
                                        <th className="p-1.5 text-right">Fee Flat</th>
                                        <th className="p-1.5 text-right">Fee %</th>
                                        <th className="p-1.5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {channels.map((ch, idx) => (
                                        <tr key={idx} className={ch.active ? '' : 'opacity-50'}>
                                            <td className="p-1">
                                                <input type="checkbox" checked={ch.active} onChange={e => updateRow(idx, { active: e.target.checked })} />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    className="w-20 border border-slate-200 p-1.5 rounded-md text-[11px] outline-none focus:border-blue-400"
                                                    placeholder="bca"
                                                    value={ch.code}
                                                    onChange={e => updateRow(idx, { code: e.target.value.toLowerCase() })}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    className="w-24 border border-slate-200 p-1.5 rounded-md text-[11px] font-mono outline-none focus:border-blue-400"
                                                    placeholder="BCAVA"
                                                    value={ch.pg_code}
                                                    onChange={e => updateRow(idx, { pg_code: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    className="w-40 border border-slate-200 p-1.5 rounded-md text-[11px] outline-none focus:border-blue-400"
                                                    placeholder="BCA Virtual Account"
                                                    value={ch.label || ''}
                                                    onChange={e => updateRow(idx, { label: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <select
                                                    className="border border-slate-200 p-1.5 rounded-md text-[11px] bg-white outline-none focus:border-blue-400"
                                                    value={ch.method || ''}
                                                    onChange={e => updateRow(idx, { method: e.target.value as Channel['method'] })}
                                                >
                                                    {METHODS.map(m => <option key={m || 'none'} value={m || ''}>{m || '—'}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-1">
                                                <select
                                                    className="border border-slate-200 p-1.5 rounded-md text-[11px] bg-white outline-none focus:border-blue-400"
                                                    value={ch.group || ''}
                                                    onChange={e => updateRow(idx, { group: e.target.value as Channel['group'] })}
                                                >
                                                    {GROUPS.map(g => <option key={g || 'none'} value={g || ''}>{g || '—'}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="number"
                                                    className="w-20 border border-slate-200 p-1.5 rounded-md text-[11px] text-right outline-none focus:border-blue-400"
                                                    placeholder="10000"
                                                    value={ch.min_amount || ''}
                                                    onChange={e => updateRow(idx, { min_amount: Number(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="number"
                                                    className="w-16 border border-slate-200 p-1.5 rounded-md text-[11px] text-right outline-none focus:border-blue-400"
                                                    placeholder="4500"
                                                    value={ch.fee_flat || ''}
                                                    onChange={e => updateRow(idx, { fee_flat: Number(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-14 border border-slate-200 p-1.5 rounded-md text-[11px] text-right outline-none focus:border-blue-400"
                                                    placeholder="0.7"
                                                    value={ch.fee_percent || ''}
                                                    onChange={e => updateRow(idx, { fee_percent: Number(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="p-1 text-right">
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
                                className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800"
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
