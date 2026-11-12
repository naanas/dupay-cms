"use client";

import { useMemo, useRef, useState } from 'react';
import { Play, Trash2, Wand2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api';
import {
    Endpoint, ChannelMethod, CHANNEL_METHODS,
    getPath, guessPath, findListPath, parseJsonObject, allPaths,
} from './gatewayTypes';

// Data yang Dupay ambil dari response PG, per peran endpoint.
// candidates = nama field umum di berbagai PG, dipakai tombol "Isi otomatis".
type MapField = { key: string; label: string; hint?: string; required?: boolean; candidates: string[]; all?: boolean };

const ROLE_FIELDS: Record<'charge' | 'status' | 'channels', MapField[]> = {
    charge: [
        // Penulisan nggak ngaruh: transaction_id juga cocok ke TransactionId (iPaymu) / transactionId.
        { key: 'pg_transaction_id', label: 'ID transaksi di PG', hint: 'Dipakai buat Cek Status ({{pg_reference_id}})', required: true, candidates: ['reference', 'transaction_id', 'trx_id', 'invoice_id', 'payment_id', 'payment_request_id', 'charge_id', 'token', 'id'] },
        { key: 'checkout_url', label: 'Link halaman bayar', candidates: ['checkout_url', 'payment_url', 'redirect_url', 'invoice_url', 'snap_url', 'payment_link', 'checkout_link', 'desktop_web_checkout_url', 'mobile_web_checkout_url', 'web_url', 'url'] },
        { key: 'payment_code', label: 'Kode bayar / nomor VA / isi QR', candidates: ['pay_code', 'payment_code', 'payment_no', 'va_number', 'virtual_account', 'virtual_account_number', 'account_number', 'bill_key', 'payment_number', 'qr_string', 'qr_content', 'qris_string', 'qr_code'], all: true },
        { key: 'payment_deeplink', label: 'Link buka aplikasi (e-wallet)', candidates: ['deeplink_url', 'deeplink', 'deep_link', 'mobile_deeplink_checkout_url', 'deeplink_redirect', 'mobile_url', 'app_url', 'pay_url'] },
    ],
    status: [
        { key: 'status', label: 'Status pembayaran', hint: 'Diterjemahin pakai daftar status di bagian Webhook', required: true, candidates: ['transaction_status', 'payment_status', 'status', 'state'] },
    ],
    channels: [
        { key: 'pg_code', label: 'Kode channel', required: true, candidates: ['code', 'channel_code', 'bank_code', 'payment_method', 'method'] },
        { key: 'label', label: 'Nama channel', candidates: ['name', 'channel_name', 'display_name', 'label', 'title'] },
        { key: 'group', label: 'Grup', candidates: ['group', 'category', 'channel_type', 'type'] },
        { key: 'min_amount', label: 'Minimal nominal', candidates: ['minimum_amount', 'min_amount', 'min'] },
        { key: 'max_amount', label: 'Maksimal nominal', candidates: ['maximum_amount', 'max_amount', 'max'] },
        { key: 'fee_flat', label: 'Biaya flat', candidates: ['fee_merchant.flat', 'fee.flat', 'fee_flat', 'flat_fee'] },
        { key: 'fee_percent', label: 'Biaya persen', candidates: ['fee_merchant.percent', 'fee.percent', 'fee_percent', 'percent_fee'] },
        { key: 'logo', label: 'Logo', candidates: ['icon_url', 'logo_url', 'logo', 'image_url', 'icon'] },
        { key: 'active', label: 'Aktif', candidates: ['active', 'is_active', 'enabled'] },
    ],
};

const PATH_EXAMPLE: Record<Endpoint['action'], string> = {
    charge: 'transaction/create',
    status: 'transaction/detail?reference={{pg_reference_id}}',
    channels: 'merchant/payment-channel',
    '': 'transaction/refund',
};

// Jumlah field non-array di level mana pun; response daftar channel biasanya cuma punya success/message.
const leafCount = (obj: unknown): number =>
    obj !== null && typeof obj === 'object' && !Array.isArray(obj)
        ? Object.values(obj as Record<string, unknown>).reduce<number>((n, v) => n + (v !== null && typeof v === 'object' ? (Array.isArray(v) ? 0 : leafCount(v)) : 1), 0)
        : 0;

const PLACEHOLDERS = ['{{order_id}}', '{{amount}}', '{{payment_method}}', '{{pg_reference_id}}', '{{merchant_code}}', '{{expired_time}}', '{{expired_minutes}}'];

const preview = (v: unknown) => {
    if (v === undefined) return null;
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length > 60 ? `${s.slice(0, 60)}…` : s;
};

const parseSample = (raw: string): { obj: unknown; error: string | null } => {
    if (!raw.trim()) return { obj: null, error: null };
    try { return { obj: JSON.parse(raw), error: null }; } catch { return { obj: null, error: 'Bukan JSON yang valid' }; }
};

type TestResult = { method: string; url: string; request_body: string; status_code: number; body: string };

type Props = {
    endpoint: Endpoint;
    onChange: (patch: Partial<Endpoint>) => void;
    onRemove?: () => void;
    title: string;
    description?: string;
    channelMethodChoices?: ChannelMethod[]; // diisi = jenis channel bisa dipilih ('' = semua channel)
    editableName?: boolean;                 // endpoint lain (custom)
    getDraft: () => object;                 // isi form gateway, buat Test
    channelCodes: string[];                 // kode merchant dari tabel channel, buat pilihan {{payment_method}}
    defaultOpen?: boolean;
};

export default function EndpointCard({
    endpoint: ep, onChange, onRemove, title, description, channelMethodChoices, editableName, getDraft, channelCodes, defaultOpen = true,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const templateRef = useRef<HTMLTextAreaElement>(null);
    const [showHelper, setShowHelper] = useState(false);
    const [sample, setSample] = useState('');
    const [testOpen, setTestOpen] = useState(false);
    const [testValues, setTestValues] = useState(() => ({
        order_id: `TEST-${Date.now()}`, amount: '10000', payment_method: channelCodes[0] || '', pg_reference_id: '',
    }));
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [autoFillMsg, setAutoFillMsg] = useState<{ ok: boolean; text: string } | null>(null);
    // Kolom lokasi yang terakhir diklik; field dari daftar "Field di contoh response" masuk ke sini.
    const [activeField, setActiveField] = useState<string | null>(null);

    const mapping = useMemo(() => {
        const obj = parseJsonObject(ep.response_mapping);
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]));
    }, [ep.response_mapping]);
    const setMapping = (next: Record<string, string>) => {
        const cleaned = Object.fromEntries(Object.entries(next).filter(([k]) => k.trim() !== ''));
        onChange({ response_mapping: JSON.stringify(cleaned, null, 2) });
    };

    const { obj: sampleObj, error: sampleError } = parseSample(sample);
    // Placeholder yang nggak dikenal bakal kekirim mentah ke PG, jadi dikasih tahu dari awal.
    const unknownPlaceholders = [...new Set(
        [...`${ep.path} ${ep.http_method === 'GET' ? '' : ep.request_template}`.matchAll(/\{\{([^}]*)\}\}/g)]
            .map(m => `{{${m[1]}}}`)
            .filter(ph => !PLACEHOLDERS.includes(ph)),
    )];
    // Dicek kayak backend: placeholder tanpa kutip (mis. {"id": {{pg_reference_id}}}) dianggap nilai.
    const templateError = useMemo(() => {
        if (ep.http_method === 'GET' || !ep.request_template.trim()) return null;
        try { JSON.parse(ep.request_template.replace(/\{\{[^}]*\}\}/g, '0')); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
    }, [ep.http_method, ep.request_template]);
    const fields = ep.action ? ROLE_FIELDS[ep.action] : null;

    // Buat daftar channel, path field dihitung dari tiap item di dalam list.
    const listPath = mapping.list || '';
    const listItems = ep.action === 'channels' && sampleObj !== null
        ? (listPath ? getPath(sampleObj, listPath) : sampleObj)
        : null;
    const previewBase = ep.action === 'channels' ? (Array.isArray(listItems) ? listItems[0] : undefined) : sampleObj;

    const autoFill = () => {
        if (sampleObj === null || !fields) return;
        const next = { ...mapping };
        let base: unknown = sampleObj;
        let filled = 0;
        if (ep.action === 'channels') {
            const lp = next.list || findListPath(sampleObj) || '';
            if (!next.list && lp) { next.list = lp; filled++; }
            const items = lp ? getPath(sampleObj, lp) : sampleObj;
            base = Array.isArray(items) ? items[0] : undefined;
        }
        const empty = fields.filter(f => !next[f.key]);
        for (const f of empty) {
            const guess = guessPath(base, f.candidates, f.all);
            if (guess) { next[f.key] = guess; filled++; }
        }
        setMapping(next);

        if (filled > 0) {
            const missing = fields.filter(f => f.required && !next[f.key]).map(f => f.label);
            setAutoFillMsg({ ok: true, text: `${filled} field keisi. Cek nilai → di sebelahnya.${missing.length ? ` Belum ketemu: ${missing.join(', ')}, isi manual.` : ''}` });
        } else if (empty.length === 0) {
            setAutoFillMsg({ ok: true, text: 'Semua field udah keisi. Kosongin dulu field yang mau ditebak ulang.' });
        } else if (ep.action !== 'channels' && findListPath(sampleObj) !== null && leafCount(sampleObj) <= 3) {
            setAutoFillMsg({ ok: false, text: 'Response ini isinya daftar (array), kayaknya ini endpoint daftar channel. Pasang di bagian 6 "Channel Pembayaran", bukan di sini.' });
        } else {
            setAutoFillMsg({ ok: false, text: 'Nggak ada nama field yang dikenali di contoh response. Isi lokasinya manual, mis. data.id.' });
        }
    };

    const pickPath = (fullPath: string) => {
        // Buat daftar channel, lokasi field dihitung dari tiap item, jadi awalan "<list>.0." dibuang.
        const prefix = ep.action === 'channels' && listPath ? `${listPath}.0.` : '';
        const path = prefix && fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
        if (!fields) {
            // Endpoint lain: tambah baris baru, namanya dari ujung lokasi.
            let key = path.split('.').filter(p => !/^\d+$/.test(p)).pop() || 'field';
            for (let n = 2; key in mapping; n++) key = `${key.replace(/_\d+$/, '')}_${n}`;
            setMapping({ ...mapping, [key]: path });
            return;
        }
        if (!activeField) {
            setAutoFillMsg({ ok: false, text: 'Klik dulu kolom lokasi yang mau diisi (bagian 2), baru klik field di daftar.' });
            return;
        }
        setMapping({ ...mapping, [activeField]: path });
        setAutoFillMsg({ ok: true, text: `${activeField === 'list' ? 'Lokasi daftar channel' : fields.find(f => f.key === activeField)?.label} diisi ${path}.` });
    };

    const insertPlaceholder = (ph: string) => {
        const el = templateRef.current;
        const text = ep.request_template;
        const start = el?.selectionStart ?? text.length;
        const end = el?.selectionEnd ?? text.length;
        onChange({ request_template: text.slice(0, start) + ph + text.slice(end) });
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + ph.length, start + ph.length);
        });
    };

    const runTest = async () => {
        setTesting(true);
        setTestResult(null);
        setTestError(null);
        try {
            const { uid: _uid, ...endpoint } = ep;
            void _uid;
            const res = await api.fetchCMS('/gateways/test-endpoint', 'POST', {
                gateway: getDraft(),
                endpoint,
                values: { ...testValues, amount: Number(testValues.amount) || 0 },
            });
            const result: TestResult = res?.data;
            setTestResult(result);
            // Response asli langsung dipakai buat preview & isi otomatis mapping.
            if (result?.body && result.status_code < 400) {
                setSample(result.body);
                setAutoFillMsg(null);
                setShowHelper(true);
            }
            // merchant_ref biasanya harus unik, siapin order_id baru buat test berikutnya.
            if (testValues.order_id.startsWith('TEST-')) setTestValues(v => ({ ...v, order_id: `TEST-${Date.now()}` }));
        } catch (err) {
            setTestError(err instanceof Error ? err.message : String(err));
        } finally {
            setTesting(false);
        }
    };

    const inputCls = 'w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-400 bg-white';

    return (
        <div className={`border rounded-2xl p-4 bg-white ${ep.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
            {/* HEADER */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setOpen(!open)} className="p-1 -ml-1 mt-0.5 text-slate-400 hover:text-slate-800" title={open ? 'Tutup' : 'Buka'}>
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1 min-w-[200px]">
                    {editableName && open ? (
                        <input className={`${inputCls} font-bold text-sm`} placeholder="Nama endpoint, mis. Refund" value={ep.name} onChange={e => onChange({ name: e.target.value })} />
                    ) : (
                        <button type="button" onClick={() => setOpen(!open)} className="font-bold text-slate-800 text-sm text-left hover:text-blue-700">
                            {title || 'Endpoint tanpa nama'}
                        </button>
                    )}
                    {open ? (
                        description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
                    ) : (
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                            {ep.http_method} {ep.path || <span className="text-amber-600">(path belum diisi)</span>}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {channelMethodChoices && (
                        <select className={`${inputCls} w-auto`} value={ep.channel_method} onChange={e => onChange({ channel_method: e.target.value as ChannelMethod })}>
                            {CHANNEL_METHODS.filter(m => channelMethodChoices.includes(m.value) || m.value === ep.channel_method)
                                .map(m => <option key={m.value || 'all'} value={m.value}>{m.value ? `Khusus ${m.label}` : 'Semua channel'}</option>)}
                        </select>
                    )}
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <input type="checkbox" checked={ep.is_active} onChange={e => onChange({ is_active: e.target.checked })} /> Aktif
                    </label>
                    {onRemove && (
                        <button type="button" onClick={onRemove} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md" title="Hapus endpoint"><Trash2 size={15} /></button>
                    )}
                </div>
            </div>

            {open && (<>
            {/* METHOD + PATH */}
            <div className="flex items-center gap-2 mt-3">
                <select className={`${inputCls} w-24 font-mono`} value={ep.http_method} onChange={e => onChange({ http_method: e.target.value as Endpoint['http_method'] })}>
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                </select>
                <input
                    className={`${inputCls} font-mono`}
                    placeholder={`path dari docs PG, mis. ${PATH_EXAMPLE[ep.action]}`}
                    value={ep.path}
                    onChange={e => onChange({ path: e.target.value })}
                />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 ml-1">Bagian URL setelah Base URL. Boleh pakai placeholder, mis. <code>status?ref={'{{pg_reference_id}}'}</code>.</p>
            {unknownPlaceholders.length > 0 && (
                <p className="text-[11px] font-medium text-red-600 mt-1 ml-1">
                    ⚠ {unknownPlaceholders.join(', ')} bukan placeholder Dupay, jadi bakal kekirim apa adanya ke PG. Pakai salah satu: {PLACEHOLDERS.join(' ')}.
                </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* KIRI: BODY REQUEST */}
                <div>
                    <div className="text-[11px] font-bold text-slate-600 uppercase">1. Yang dikirim ke PG</div>
                    {ep.http_method === 'GET' ? (
                        <p className="text-[11px] text-slate-400 mt-2">Method GET nggak punya body. Parameter ditaruh di path.</p>
                    ) : (
                        <>
                            <p className="text-[10px] text-slate-400 mt-0.5">Tempel contoh <b>request body</b> dari docs PG, lalu ganti nilai yang berubah tiap transaksi pakai tombol di bawah.</p>
                            <textarea
                                ref={templateRef}
                                className={`${inputCls} font-mono text-[11px] h-40 mt-1.5`}
                                placeholder={'{\n  "order_id": "{{order_id}}",\n  "amount": "{{amount}}"\n}'}
                                value={ep.request_template}
                                onChange={e => onChange({ request_template: e.target.value })}
                            />
                            {templateError && <p className="text-[11px] font-medium text-red-600 mt-1">Bukan JSON yang valid: {templateError}</p>}
                            <div className="flex flex-wrap gap-1 mt-1">
                                {PLACEHOLDERS.map(ph => (
                                    <button key={ph} type="button" onClick={() => insertPlaceholder(ph)} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100">
                                        + {ph}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                <code>{'"{{amount}}"'}</code> pakai tanda kutip, nanti jadi angka. <code>{'{{payment_method}}'}</code> = kode channel di PG.
                                {' '}<code>{'{{expired_time}}'}</code> = batas bayar (unix detik), <code>{'{{expired_minutes}}'}</code> = menit dari sekarang (dari merchant, default 24 jam).
                            </p>
                        </>
                    )}
                </div>

                {/* KANAN: MAPPING RESPONSE */}
                <div>
                    <div className="text-[11px] font-bold text-slate-600 uppercase">2. Yang diambil dari response PG</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        Isi lokasi tiap data di response PG, mis. <code>data.reference</code>. Pakai <code>|</code> buat cadangan. Paling gampang: Test dulu atau tempel contoh response, lalu klik Isi otomatis.
                    </p>

                    {fields ? (
                        <div className="space-y-1.5 mt-2">
                            {ep.action === 'channels' && (
                                <FieldRow
                                    onFocus={() => setActiveField('list')} active={activeField === 'list'}
                                    label="Lokasi daftar channel (array)" required value={listPath}
                                    onChange={v => setMapping({ ...mapping, list: v })}
                                    preview={sampleObj !== null ? (Array.isArray(listItems) ? `${listItems.length} channel` : 'bukan array') : null}
                                    placeholder="mis. data"
                                />
                            )}
                            {fields.map(f => (
                                <FieldRow
                                    onFocus={() => setActiveField(f.key)} active={activeField === f.key}
                                    key={f.key} label={f.label} hint={f.hint} required={f.required} value={mapping[f.key] || ''}
                                    onChange={v => setMapping({ ...mapping, [f.key]: v })}
                                    preview={previewBase !== undefined && previewBase !== null && mapping[f.key] ? preview(getPath(previewBase, mapping[f.key])) ?? '— nggak ketemu' : null}
                                    placeholder={f.candidates[0]}
                                />
                            ))}
                            {ep.action === 'channels' && <p className="text-[10px] text-slate-400">Lokasi field channel dihitung dari tiap item di dalam daftar.</p>}
                        </div>
                    ) : (
                        <CustomMapping mapping={mapping} onChange={setMapping} sampleObj={sampleObj} />
                    )}

                    <button type="button" onClick={() => setShowHelper(!showHelper)} className="flex items-center gap-1 mt-3 text-[11px] font-bold text-slate-500 hover:text-slate-800">
                        {showHelper ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Contoh response (buat bantu isi, nggak disimpan)
                    </button>
                    {showHelper && (
                        <div className="mt-1.5">
                            <textarea
                                className={`${inputCls} font-mono text-[10px] h-28 ${sampleError ? 'border-red-400 bg-red-50' : ''}`}
                                placeholder="Tempel contoh response sukses dari docs PG di sini, atau klik Test biar keisi otomatis."
                                value={sample}
                                onChange={e => { setSample(e.target.value); setAutoFillMsg(null); }}
                            />
                            {sampleError && <p className="text-[10px] text-red-600">{sampleError}</p>}
                            {fields && (
                                <button type="button" disabled={sampleObj === null} onClick={autoFill} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline disabled:text-slate-300 disabled:no-underline">
                                    <Wand2 size={12} /> Isi otomatis dari contoh (cuma isi yang masih kosong)
                                </button>
                            )}
                            {autoFillMsg && (
                                <p className={`text-[11px] font-medium mt-1 ${autoFillMsg.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{autoFillMsg.text}</p>
                            )}
                            {sampleObj !== null && (
                                <div className="mt-2">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Field di contoh response</div>
                                    <p className="text-[10px] text-slate-400">
                                        {fields ? 'Klik kolom lokasi di atas, lalu klik field di sini buat ngisi.' : 'Klik field buat nambahin ke daftar data.'} Isi daftar (array) ditampilin dari item pertama (.0).
                                    </p>
                                    <div className="mt-1 max-h-48 overflow-auto border border-slate-200 rounded-md bg-slate-50 divide-y divide-slate-100">
                                        {allPaths(sampleObj).map(({ path, value }) => (
                                            <button key={path} type="button" onClick={() => pickPath(path)} className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-blue-50">
                                                <code className="text-[10px] text-blue-700 shrink-0">{path}</code>
                                                <span className="text-[10px] text-slate-500 truncate">{preview(value) ?? 'null'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* TEST */}
            <div className="mt-4 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setTestOpen(!testOpen)} className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:underline">
                    <Play size={12} /> {testOpen ? 'Tutup Test' : 'Test endpoint ini'}
                </button>
                {testOpen && (
                    <div className="mt-2 rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {([
                                ['order_id', '{{order_id}}'],
                                ['amount', '{{amount}}'],
                                ['payment_method', '{{payment_method}} (kode internal)'],
                                ['pg_reference_id', '{{pg_reference_id}} (ID transaksi di PG)'],
                            ] as [keyof typeof testValues, string][]).map(([key, label]) => (
                                <label key={key} className="text-[10px] font-bold text-slate-500">
                                    {label}
                                    <input
                                        className={`${inputCls} font-mono mt-0.5`}
                                        list={key === 'payment_method' ? `codes-${ep.uid}` : undefined}
                                        placeholder={key === 'payment_method' ? 'mis. bca atau kode PG' : ''}
                                        value={testValues[key]}
                                        onChange={e => setTestValues({ ...testValues, [key]: e.target.value })}
                                    />
                                </label>
                            ))}
                        </div>
                        <datalist id={`codes-${ep.uid}`}>
                            {channelCodes.map(code => <option key={code} value={code} />)}
                        </datalist>
                        <p className="text-[10px] text-slate-500">
                            payment_method: pilih kode dari tabel channel (diterjemahin ke kode PG), atau ketik langsung kode PG-nya (mis. BRIVA) kalau tabel channel masih kosong.
                        </p>
                        {ep.action === 'charge' && !testValues.payment_method.trim() && ep.request_template.includes('{{payment_method}}') && (
                            <p className="text-[11px] font-medium text-red-600">⚠ payment_method masih kosong. Body bakal ngirim metode bayar kosong dan biasanya ditolak PG.</p>
                        )}
                        <p className="text-[10px] text-amber-700">Request beneran dikirim ke PG pakai isi form sekarang (nggak perlu save dulu). Test Buat Transaksi bakal bikin transaksi di PG, tapi nggak dicatat di Dupay.</p>
                        <button type="button" onClick={runTest} disabled={testing || !ep.path.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-60">
                            <Play size={12} /> {testing ? 'Mengirim...' : 'Kirim Request'}
                        </button>
                        {testError && <p className="text-[11px] text-red-600 font-medium break-all">⚠ {testError}</p>}
                        {testResult && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${testResult.status_code < 400 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{testResult.status_code}</span>
                                    <code className="text-slate-600 break-all">{testResult.method} {testResult.url}</code>
                                </div>
                                <details className="text-[10px]">
                                    <summary className="cursor-pointer font-bold text-slate-500">Body yang dikirim</summary>
                                    <pre className="mt-1 font-mono bg-white border border-slate-200 rounded-md p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">{testResult.request_body ? prettyJson(testResult.request_body) : '(kosong)'}</pre>
                                </details>
                                {testResult.status_code >= 400 && pgErrorMessage(testResult.body) && (
                                    <p className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                                        Pesan dari PG: {pgErrorMessage(testResult.body)}
                                    </p>
                                )}
                                <details className="text-[10px]" open={testResult.status_code >= 400}>
                                    <summary className="cursor-pointer font-bold text-slate-500">Response dari PG</summary>
                                    <pre className="mt-1 font-mono bg-white border border-slate-200 rounded-md p-2 overflow-auto max-h-60 whitespace-pre-wrap break-all">{prettyJson(testResult.body) || '(kosong)'}</pre>
                                </details>
                                {testResult.status_code < 400 && (
                                    <p className="text-[10px] text-slate-500">Response PG udah dimasukin ke &quot;Contoh response&quot;. Cek preview di bagian 2, atau klik Isi otomatis.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            </>)}
        </div>
    );
}

// Ambil pesan error umum dari response PG (message / error / error_message / errors).
const pgErrorMessage = (raw: string): string | null => {
    try {
        const v = JSON.parse(raw);
        const msg = getPath(v, 'message|error.message|error_message|error|errors|status_message');
        if (msg === undefined) return null;
        return typeof msg === 'string' ? msg : JSON.stringify(msg);
    } catch {
        return raw.trim() ? raw.trim().slice(0, 200) : null;
    }
};

const prettyJson = (raw: string) => {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
};

function FieldRow({ label, hint, required, value, onChange, preview: pv, placeholder, onFocus, active }: {
    label: string; hint?: string; required?: boolean; value: string; onChange: (v: string) => void; preview: string | null; placeholder?: string;
    onFocus: () => void; active: boolean;
}) {
    return (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 items-start">
            <div className="pt-1.5">
                <div className="text-[11px] font-semibold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</div>
                {hint && <div className="text-[9px] text-slate-400 leading-tight">{hint}</div>}
            </div>
            <div>
                <input
                    className={`w-full border p-1.5 rounded-md text-[11px] font-mono outline-none focus:border-blue-400 bg-white ${active ? 'border-blue-400' : 'border-slate-200'}`}
                    placeholder={placeholder ? `mis. ${placeholder}` : ''}
                    value={value}
                    onFocus={onFocus}
                    onChange={e => onChange(e.target.value)}
                />
                {pv !== null && (
                    <div className={`text-[10px] font-mono mt-0.5 truncate ${pv.startsWith('—') || pv === 'bukan array' ? 'text-amber-600' : 'text-emerald-700'}`}>→ {pv}</div>
                )}
            </div>
        </div>
    );
}

// Endpoint lain: pasangan nama bebas → lokasi di response.
function CustomMapping({ mapping, onChange, sampleObj }: { mapping: Record<string, string>; onChange: (m: Record<string, string>) => void; sampleObj: unknown }) {
    const rows = Object.entries(mapping);
    const update = (idx: number, key: string, path: string) =>
        onChange(Object.fromEntries(rows.map(([k, p], i) => (i === idx ? [key, path] : [k, p]))));
    return (
        <div className="space-y-1.5 mt-2">
            {rows.length === 0 && <p className="text-[11px] text-slate-400">Opsional. Cuma dipakai buat nampilin data waktu Test.</p>}
            {rows.map(([key, path], idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                    <input className="w-2/5 border border-slate-200 p-1.5 rounded-md text-[11px] outline-none focus:border-blue-400" placeholder="nama" value={key} onChange={e => update(idx, e.target.value, path)} />
                    <div className="flex-1">
                        <input className="w-full border border-slate-200 p-1.5 rounded-md text-[11px] font-mono outline-none focus:border-blue-400" placeholder="lokasi, mis. data.id" value={path} onChange={e => update(idx, key, e.target.value)} />
                        {sampleObj !== null && path && <div className="text-[10px] font-mono text-emerald-700 truncate mt-0.5">→ {preview(getPath(sampleObj, path)) ?? '— nggak ketemu'}</div>}
                    </div>
                    <button type="button" onClick={() => onChange(Object.fromEntries(rows.filter((_, i) => i !== idx)))} className="p-1.5 text-slate-400 hover:text-red-500"><X size={13} /></button>
                </div>
            ))}
            <button type="button" onClick={() => onChange({ ...mapping, [`field_${rows.length + 1}`]: '' })} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                <Plus size={12} /> Tambah data
            </button>
        </div>
    );
}
