"use client";

import { useMemo, useState } from 'react';
import { ArrowLeft, Save, Plus, Copy, Check, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { api, API_BASE } from '../../../lib/api';
import ChannelEditor from './ChannelEditor';
import EndpointCard from './EndpointCard';
import {
    AUTH_TYPES, authConfig, autoEndpointName, CHANNEL_METHODS, ChannelMethod, emptyEndpoint, Endpoint,
    endpointsFromGateway, GatewayRecord, parseJsonObject,
} from './gatewayTypes';

type WebhookForm = {
    order_id_path: string;
    status_path: string;
    success: string; // dipisah koma
    failed: string;
    refunded: string;
    extra: Record<string, unknown>; // key lain di webhook_mapping biar nggak hilang
};

type FormState = {
    name: string;
    base_url: string;
    is_active: boolean;
    priority: string; // string biar input angka bisa dikosongin waktu ngetik
    auth_type: string;
    custom_auth_header: string;
    server_key: string;
    private_key: string;
    merchant_code: string;
    webhook: WebhookForm;
    webhook_validation_type: string;
    webhook_secret: string;
    channel_mapping: string;
    endpoints: Endpoint[];
    // Kartu Webhook & Daftar Channel bukan baris di tabel endpoint, jadi ditandain terpisah.
    showWebhook: boolean;
    showChannels: boolean;
};

const WEBHOOK_BASE_KEY = 'dupay_webhook_base_url';
const DEFAULT_WEBHOOK_BASE = process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL || API_BASE;

type EndpointType = 'charge' | 'status' | 'webhook' | 'channels' | 'custom';

const ENDPOINT_TYPES: { type: EndpointType; label: string; description: string }[] = [
    { type: 'charge', label: 'Buat Transaksi', description: 'Dipanggil waktu merchant minta charge. Bisa dibikin beda per jenis channel.' },
    { type: 'status', label: 'Cek Status', description: 'Nanya status transaksi ke PG, buat sync kalau callback telat / nggak nyampe.' },
    { type: 'webhook', label: 'Webhook / Callback', description: 'PG ngabarin Dupay waktu status pembayaran berubah.' },
    { type: 'channels', label: 'Daftar Channel', description: 'Metode bayar (VA, QRIS, e-wallet) & kodenya di PG. Bisa ditarik dari API PG.' },
    { type: 'custom', label: 'Lainnya', description: 'Endpoint lain dari docs PG (refund, cancel, dll). Disimpan & bisa dites.' },
];

const listToText = (v: unknown) => (Array.isArray(v) ? v.map(String).join(', ') : '');
const textToList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

const hasChannels = (raw: string) => {
    try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v.length > 0 : Object.keys(v || {}).length > 0; } catch { return false; }
};

const fromGateway = (gw: GatewayRecord | null): FormState => {
    const wm = parseJsonObject(gw?.webhook_mapping || '{}');
    const { order_id_path, status_path, success_statuses, failed_statuses, refunded_statuses, ...extra } = wm;
    const endpoints = gw ? endpointsFromGateway(gw) : [];
    const webhook: WebhookForm = {
        order_id_path: typeof order_id_path === 'string' ? order_id_path : '',
        status_path: typeof status_path === 'string' ? status_path : '',
        success: listToText(success_statuses),
        failed: listToText(failed_statuses),
        refunded: listToText(refunded_statuses),
        extra,
    };
    const channelMapping = gw?.channel_mapping || '[]';
    return {
        name: gw?.name || '',
        base_url: gw?.base_url || '',
        is_active: gw ? gw.is_active !== false : true,
        priority: String(gw?.priority ?? 100),
        auth_type: gw?.auth_type || 'BEARER_TOKEN',
        custom_auth_header: gw?.custom_auth_header || '',
        server_key: '',
        private_key: '',
        merchant_code: gw?.merchant_code || '',
        webhook,
        webhook_validation_type: gw?.webhook_validation_type || '',
        webhook_secret: gw?.webhook_secret || '',
        channel_mapping: channelMapping,
        endpoints,
        showWebhook: !!(webhook.order_id_path || webhook.status_path || webhook.success || webhook.failed),
        showChannels: hasChannels(channelMapping) || endpoints.some(ep => ep.action === 'channels'),
    };
};

type Props = {
    gateway: GatewayRecord | null; // null = gateway baru
    onBack: () => void;
    onSaved: () => void;
};

export default function GatewayEditor({ gateway, onBack, onSaved }: Props) {
    const [id, setId] = useState<string | null>(gateway?.id ?? null);
    const [form, setForm] = useState<FormState>(() => fromGateway(gateway));
    // Kartu yang udah ada waktu editor dibuka mulai ketutup; yang baru ditambah langsung kebuka.
    const [initial] = useState(() => ({
        uids: new Set(form.endpoints.map(ep => ep.uid)),
        webhook: form.showWebhook,
        channels: form.showChannels,
    }));
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);
    // Domain publik backend buat URL webhook (localhost nggak bisa dipanggil PG). Disimpan per browser.
    const [webhookBase, setWebhookBase] = useState(() => {
        try {
            const saved = localStorage.getItem(WEBHOOK_BASE_KEY);
            if (saved) return saved;
        } catch { /* localStorage nggak tersedia */ }
        return DEFAULT_WEBHOOK_BASE;
    });
    const changeWebhookBase = (v: string) => {
        setWebhookBase(v);
        try { localStorage.setItem(WEBHOOK_BASE_KEY, v); } catch { /* abaikan */ }
    };
    const [pickerOpen, setPickerOpen] = useState(false);

    const set = (patch: Partial<FormState>) => {
        setForm(f => ({ ...f, ...patch }));
        setDirty(true);
    };
    const setWebhook = (patch: Partial<WebhookForm>) => set({ webhook: { ...form.webhook, ...patch } });

    const updateEndpoint = (uid: string, patch: Partial<Endpoint>) => {
        setForm(f => ({ ...f, endpoints: f.endpoints.map(ep => (ep.uid === uid ? { ...ep, ...patch } : ep)) }));
        setDirty(true);
    };
    const removeEndpoint = (uid: string) => set({ endpoints: form.endpoints.filter(ep => ep.uid !== uid) });

    const auth = authConfig(form.auth_type);

    // Isi form dalam bentuk yang dimengerti backend. Dipakai buat Simpan, Test, & Tarik dari PG.
    const toPayload = () => ({
        ...(id ? { id } : {}),
        name: form.name.trim(),
        base_url: form.base_url.trim(),
        is_active: form.is_active,
        priority: Number(form.priority) || 0,
        auth_type: form.auth_type,
        custom_auth_header: form.custom_auth_header,
        server_key: form.server_key,
        private_key: form.private_key,
        merchant_code: form.merchant_code,
        webhook_mapping: form.showWebhook
            ? JSON.stringify({
                ...form.webhook.extra,
                order_id_path: form.webhook.order_id_path.trim(),
                status_path: form.webhook.status_path.trim(),
                success_statuses: textToList(form.webhook.success),
                failed_statuses: textToList(form.webhook.failed),
                refunded_statuses: textToList(form.webhook.refunded),
            })
            : '{}',
        webhook_validation_type: form.showWebhook ? form.webhook_validation_type : '',
        webhook_secret: form.showWebhook ? form.webhook_secret : '',
        channel_mapping: form.showChannels ? form.channel_mapping : '[]',
        endpoints: form.endpoints.map(({ uid: _uid, ...ep }) => {
            void _uid;
            return { ...ep, name: autoEndpointName(ep) };
        }),
        // kolom format lama, dikosongin karena udah pindah ke endpoints
        charge_endpoint: '',
        request_template: '{}',
        response_mapping: '{}',
    });

    const validate = (): string | null => {
        if (!form.name.trim()) return 'Nama gateway wajib diisi.';
        if (!form.base_url.trim()) return 'Base URL wajib diisi.';
        if (!id && auth.serverKey && !form.server_key) return `${auth.serverKey.label} wajib diisi.`;
        if (!id && auth.privateKey && !form.private_key) return `${auth.privateKey.label} wajib diisi.`;
        if (auth.customHeader && !form.custom_auth_header.trim()) return 'Nama header auth wajib diisi.';
        for (const ep of form.endpoints) {
            if (!ep.action && !ep.name.trim()) return 'Ada endpoint "Lainnya" yang belum dikasih nama.';
            if (!ep.path.trim()) return `${autoEndpointName(ep) || 'Endpoint'}: path belum diisi.`;
        }
        return null;
    };

    const save = async () => {
        const problem = validate();
        if (problem) { setError(problem); return; }
        setSaving(true);
        setError(null);
        try {
            const payload = toPayload();
            if (id) {
                await api.fetchCMS(`/gateways/${id}`, 'PUT', payload);
            } else {
                const res = await api.fetchCMS('/gateways', 'POST', payload);
                if (res?.data?.id) setId(res.data.id);
            }
            // Kredensial udah tersimpan (terenkripsi), kosongin dari form.
            setForm(f => ({ ...f, server_key: '', private_key: '' }));
            setDirty(false);
            setSavedAt(new Date());
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    const back = () => {
        if (dirty && !confirm('Ada perubahan yang belum disimpan. Tetap keluar?')) return;
        onBack();
    };

    const webhookURL = `${(webhookBase.trim() || DEFAULT_WEBHOOK_BASE).replace(/\/$/, '')}/v1/webhook/${encodeURIComponent(form.name.trim() || 'nama-gateway')}`;
    const webhookIsLocal = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(webhookURL);
    // URL callback yang ditulis langsung di request template (mis. notifyUrl iPaymu) harus ngarah ke nama gateway ini.
    const mismatchedCallbackNames = [...new Set(form.endpoints.flatMap(ep =>
        [...ep.request_template.matchAll(/\/v1\/webhook\/([^"'\s?#]+)/g)].map(m => {
            try { return decodeURIComponent(m[1]); } catch { return m[1]; }
        }),
    ))].filter(n => n.toLowerCase() !== form.name.trim().toLowerCase());
    const copyWebhook = async () => {
        try {
            await navigator.clipboard.writeText(webhookURL);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard nggak tersedia, user bisa copy manual */ }
    };

    // Kode merchant channel aktif, buat pilihan {{payment_method}} waktu Test.
    const channelCodes = useMemo(() => {
        if (!form.showChannels) return [];
        try {
            const list = JSON.parse(form.channel_mapping || '[]');
            return Array.isArray(list)
                ? list.filter((ch: { active?: boolean; code?: string }) => ch.active !== false && ch.code).map((ch: { code: string }) => ch.code)
                : [];
        } catch { return []; }
    }, [form.channel_mapping, form.showChannels]);

    // Jenis channel yang belum dipakai endpoint lain dengan peran yang sama ('' = semua channel).
    const freeScopes = (action: 'charge' | 'status', exceptUid?: string): ChannelMethod[] => {
        const used = form.endpoints.filter(ep => ep.action === action && ep.uid !== exceptUid).map(ep => ep.channel_method);
        return CHANNEL_METHODS.map(m => m.value).filter(m => !used.includes(m));
    };

    const typeAvailable = (type: EndpointType) => {
        if (type === 'charge' || type === 'status') return freeScopes(type).length > 0;
        if (type === 'webhook') return !form.showWebhook;
        if (type === 'channels') return !form.showChannels;
        return true;
    };

    const addType = (type: EndpointType) => {
        setPickerOpen(false);
        if (type === 'webhook') return set({ showWebhook: true });
        if (type === 'channels') return set({ showChannels: true });
        if (type === 'custom') return set({ endpoints: [...form.endpoints, emptyEndpoint('')] });
        set({ endpoints: [...form.endpoints, emptyEndpoint(type, freeScopes(type)[0])] });
    };

    const removeChannels = () => {
        if (hasChannels(form.channel_mapping) && !confirm('Hapus Daftar Channel? Tabel channel ikut dikosongin waktu disimpan.')) return;
        set({ showChannels: false, endpoints: form.endpoints.filter(ep => ep.action !== 'channels') });
    };

    // Urutan kartu tetap: Buat Transaksi, Cek Status, Webhook, Daftar Channel, Lainnya.
    const sortedRole = (action: 'charge' | 'status') => form.endpoints
        .filter(ep => ep.action === action)
        .sort((a, b) => CHANNEL_METHODS.findIndex(m => m.value === a.channel_method) - CHANNEL_METHODS.findIndex(m => m.value === b.channel_method));
    const roleEndpoints = [...sortedRole('charge'), ...sortedRole('status')];
    const channelsEp = form.endpoints.find(ep => ep.action === 'channels');
    const custom = form.endpoints.filter(ep => ep.action === '');
    const isEmpty = roleEndpoints.length === 0 && custom.length === 0 && !form.showWebhook && !form.showChannels;

    const cardProps = { getDraft: toPayload, channelCodes };

    const inputCls = 'w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white';
    const labelCls = 'text-xs font-bold text-slate-600';
    const hintCls = 'text-[11px] text-slate-400 mt-1';

    const fetchDisabledReason = !channelsEp
        ? 'tambahin API daftar channel dulu (tombol di atas tabel)'
        : !channelsEp.path.trim() ? 'isi path API daftar channel dulu' : undefined;

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center gap-3">
                <button type="button" onClick={back} className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-600" title="Kembali">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{id ? `Edit ${form.name || 'Gateway'}` : 'Tambah Payment Gateway'}</h1>
                    <p className="text-sm text-slate-500">Isi Koneksi & Autentikasi, lalu tambah endpoint yang dibutuhin. Semua endpoint bisa di-Test sebelum disimpan.</p>
                </div>
            </div>

            <Section n={1} title="Koneksi">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Nama gateway *</label>
                        <input className={`${inputCls} mt-1`} placeholder="mis. tripay, midtrans, xendit" value={form.name} onChange={e => set({ name: e.target.value })} />
                        <p className={hintCls}>Jadi bagian URL webhook. Pakai huruf kecil tanpa spasi. Merchant nggak perlu tahu nama ini.</p>
                    </div>
                    <div>
                        <label className={labelCls}>Base URL *</label>
                        <input className={`${inputCls} mt-1 font-mono`} placeholder="https://api.namapg.com/v1" value={form.base_url} onChange={e => set({ base_url: e.target.value })} />
                        <p className={hintCls}>Bagian awal URL API dari docs PG (sandbox / production), tanpa path endpoint.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className={labelCls}>Prioritas</label>
                        <input type="number" className={`${inputCls} mt-1`} value={form.priority} onChange={e => set({ priority: e.target.value })} />
                        <p className={hintCls}>Merchant cuma kirim metode bayar, Dupay yang milih gateway. Kalau beberapa gateway punya metode bayar yang sama, yang angkanya paling kecil dipakai duluan.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:pt-6">
                        <input type="checkbox" checked={form.is_active} onChange={e => set({ is_active: e.target.checked })} />
                        Gateway aktif (bisa dipakai merchant)
                    </label>
                </div>
            </Section>

            <Section n={2} title="Autentikasi" subtitle="Cara Dupay login ke API PG. Lihat bagian Authentication / Header di docs PG.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Jenis autentikasi</label>
                        <select className={`${inputCls} mt-1`} value={form.auth_type} onChange={e => set({ auth_type: e.target.value })}>
                            {AUTH_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <p className={hintCls}>{auth.description}</p>
                    </div>
                    <div className="space-y-3">
                        {auth.customHeader && (
                            <div>
                                <label className={labelCls}>Nama header *</label>
                                <input className={`${inputCls} mt-1 font-mono`} placeholder="mis. X-API-KEY" value={form.custom_auth_header} onChange={e => set({ custom_auth_header: e.target.value })} />
                            </div>
                        )}
                        {auth.serverKey && (
                            <SecretInput label={`${auth.serverKey.label}${id ? '' : ' *'}`} saved={!!id} value={form.server_key} onChange={v => set({ server_key: v })} className={inputCls} />
                        )}
                        {auth.privateKey && (
                            <SecretInput label={`${auth.privateKey.label}${id ? '' : ' *'}`} saved={!!id} value={form.private_key} onChange={v => set({ private_key: v })} className={inputCls} />
                        )}
                        <div>
                            <label className={labelCls}>{auth.merchantCode.label}</label>
                            <input className={`${inputCls} mt-1`} value={form.merchant_code} onChange={e => set({ merchant_code: e.target.value })} />
                            {auth.merchantCode.hint && <p className={hintCls}>{auth.merchantCode.hint}</p>}
                        </div>
                        <p className="text-[11px] text-slate-400">Kunci disimpan terenkripsi.</p>
                    </div>
                </div>
            </Section>

            <Section n={3} title="Endpoint" subtitle="Tambah endpoint dari docs PG sesuai kebutuhan. Semuanya opsional.">
                <div className="space-y-3">
                    {isEmpty && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400">
                            Belum ada endpoint. Klik <b>Tambah Endpoint</b> di bawah.
                        </div>
                    )}

                    {roleEndpoints.map(ep => {
                        const action = ep.action as 'charge' | 'status';
                        return (
                            <EndpointCard
                                {...cardProps}
                                key={ep.uid}
                                endpoint={ep}
                                title={autoEndpointName(ep)}
                                description={ep.channel_method === ''
                                    ? 'Dipakai buat semua channel, kecuali jenis channel yang punya endpoint sendiri.'
                                    : 'Dipakai khusus channel dengan jenis ini.'}
                                channelMethodChoices={freeScopes(action, ep.uid)}
                                defaultOpen={!initial.uids.has(ep.uid)}
                                onChange={patch => updateEndpoint(ep.uid, patch)}
                                onRemove={() => removeEndpoint(ep.uid)}
                            />
                        );
                    })}

                    {form.showWebhook && (
                        <PlainCard
                            title="Webhook / Callback"
                            description="Notifikasi dari PG waktu status pembayaran berubah."
                            summary={`order ID: ${form.webhook.order_id_path || '-'} · status: ${form.webhook.status_path || '-'} · berhasil: ${form.webhook.success || '-'}`}
                            defaultOpen={!initial.webhook}
                            onRemove={() => set({ showWebhook: false })}
                        >
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <label className={labelCls}>Domain publik backend Dupay</label>
                                <input
                                    className={`${inputCls} mt-1 font-mono`}
                                    placeholder="mis. https://api.dupay.id"
                                    value={webhookBase}
                                    onChange={e => changeWebhookBase(e.target.value)}
                                />
                                <p className={hintCls}>Cuma buat nyusun URL di bawah, nggak disimpan ke gateway. Backend nerima callback di <code>/v1/webhook/&lt;nama gateway&gt;</code> di domain mana pun dia jalan.</p>
                                {webhookIsLocal && (
                                    <p className="text-[11px] font-medium text-amber-700 mt-1">
                                        localhost nggak bisa dipanggil server PG. Pakai domain backend yang udah di-deploy, atau buat tes lokal pakai tunnel (mis. ngrok / cloudflared) lalu isi URL tunnel-nya di sini.
                                    </p>
                                )}
                                <div className={`${labelCls} mt-3`}>Daftarin URL ini di dashboard PG (Callback / Notification URL)</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 break-all">{webhookURL}</code>
                                    <button type="button" onClick={copyWebhook} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100" title="Copy">
                                        {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                                    </button>
                                </div>
                                {mismatchedCallbackNames.length > 0 && (
                                    <p className="text-[11px] font-medium text-amber-700 mt-2">
                                        Request template ngirim URL callback ke <code>/v1/webhook/{mismatchedCallbackNames.join(', ')}</code>, tapi nama gateway ini &quot;{form.name.trim()}&quot;.
                                        Callback-nya bakal ditolak (gateway nggak ketemu). Samain: ganti nama gateway jadi <code>{mismatchedCallbackNames[0]}</code>, atau ganti URL di template.
                                    </p>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-500 mt-4">Lihat contoh body callback di docs PG, lalu isi lokasinya:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className={labelCls}>Lokasi order ID</label>
                                    <input className={`${inputCls} mt-1 font-mono`} placeholder="mis. merchant_ref / order_id" value={form.webhook.order_id_path} onChange={e => setWebhook({ order_id_path: e.target.value })} />
                                    <p className={hintCls}>Field yang isinya order_id dari merchant.</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Lokasi status</label>
                                    <input className={`${inputCls} mt-1 font-mono`} placeholder="mis. status / transaction_status" value={form.webhook.status_path} onChange={e => setWebhook({ status_path: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                {([
                                    ['success', 'Status yang artinya BERHASIL', 'mis. PAID, settlement'],
                                    ['failed', 'Status yang artinya GAGAL', 'mis. EXPIRED, FAILED'],
                                    ['refunded', 'Status yang artinya REFUND', 'mis. REFUND'],
                                ] as [keyof WebhookForm, string, string][]).map(([key, label, ph]) => (
                                    <div key={key}>
                                        <label className={labelCls}>{label}</label>
                                        <input className={`${inputCls} mt-1 font-mono`} placeholder={ph} value={form.webhook[key] as string} onChange={e => setWebhook({ [key]: e.target.value })} />
                                    </div>
                                ))}
                            </div>
                            <p className={hintCls}>Pisahkan pakai koma. Status lain dianggap masih PENDING. Daftar ini juga dipakai buat nerjemahin hasil Cek Status.</p>

                            <div className="mt-4">
                                <label className={labelCls}>Verifikasi callback</label>
                                {form.auth_type === 'TRIPAY_HMAC' ? (
                                    <p className="text-xs text-emerald-700 mt-1">Otomatis: signature callback dicek pakai Private Key.</p>
                                ) : form.auth_type === 'IPAYMU_V2' ? (
                                    <p className="text-xs text-emerald-700 mt-1">
                                        Otomatis: header <code>X-Signature</code> dicek pakai VA. Kalau nggak cocok, status nggak diambil dari callback
                                        tapi ditanyain langsung ke iPaymu lewat endpoint Cek Status, jadi endpoint Cek Status wajib ada.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                                        <select className={inputCls} value={form.webhook_validation_type} onChange={e => set({ webhook_validation_type: e.target.value })}>
                                            <option value="">Nggak diverifikasi (siapa pun bisa kirim callback palsu)</option>
                                            <option value="TOKEN_MATCH">Cocokkan token rahasia</option>
                                        </select>
                                        {form.webhook_validation_type === 'TOKEN_MATCH' && (
                                            <div>
                                                <input className={`${inputCls} font-mono`} placeholder="token dari dashboard PG" value={form.webhook_secret} onChange={e => set({ webhook_secret: e.target.value })} />
                                                <p className={hintCls}>PG harus ngirim token ini di header <code>X-Callback-Signature</code> atau <code>X-Signature</code>.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </PlainCard>
                    )}

                    {form.showChannels && (
                        <PlainCard
                            title="Daftar Channel"
                            description="Metode bayar yang bisa dipilih merchant & kodenya di PG."
                            summary={`${channelCodes.length} channel aktif${channelsEp ? ` · API: ${channelsEp.http_method} ${channelsEp.path || '(path belum diisi)'}` : ''}`}
                            defaultOpen={!initial.channels}
                            onRemove={removeChannels}
                        >
                            {channelsEp ? (
                                <EndpointCard
                                    {...cardProps}
                                    endpoint={channelsEp}
                                    title="API daftar channel"
                                    defaultOpen={!initial.uids.has(channelsEp.uid)}
                                    description='Dipakai tombol "Tarik dari PG" buat ngisi tabel di bawah.'
                                    onChange={patch => updateEndpoint(channelsEp.uid, patch)}
                                    onRemove={() => removeEndpoint(channelsEp.uid)}
                                />
                            ) : (
                                <button type="button" onClick={() => set({ endpoints: [...form.endpoints, emptyEndpoint('channels')] })} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                                    <Plus size={13} /> PG punya API daftar channel? Tambahin biar tabel bisa diisi otomatis (opsional)
                                </button>
                            )}
                            <div className="mt-4">
                                <ChannelEditor
                                    key={id || 'new'}
                                    value={form.channel_mapping}
                                    onChange={next => set({ channel_mapping: next })}
                                    getDraft={toPayload}
                                    fetchDisabledReason={fetchDisabledReason}
                                />
                            </div>
                        </PlainCard>
                    )}

                    {custom.map(ep => (
                        <EndpointCard
                            {...cardProps}
                            key={ep.uid}
                            endpoint={ep}
                            title={ep.name}
                            editableName
                            defaultOpen={!initial.uids.has(ep.uid)}
                            description="Belum dipanggil otomatis, cuma disimpan & bisa dites."
                            onChange={patch => updateEndpoint(ep.uid, patch)}
                            onRemove={() => removeEndpoint(ep.uid)}
                        />
                    ))}

                    {/* PEMILIH JENIS ENDPOINT */}
                    {pickerOpen ? (
                        <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black text-slate-700 uppercase">Pilih jenis endpoint</span>
                                <button type="button" onClick={() => setPickerOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {ENDPOINT_TYPES.map(t => {
                                    const available = typeAvailable(t.type);
                                    return (
                                        <button
                                            key={t.type}
                                            type="button"
                                            disabled={!available}
                                            onClick={() => addType(t.type)}
                                            className="text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-400 hover:shadow-sm disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:shadow-none"
                                        >
                                            <div className="text-sm font-bold text-slate-800">{t.label}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">{available ? t.description : 'Udah ditambahin.'}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setPickerOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600">
                            <Plus size={16} /> Tambah Endpoint
                        </button>
                    )}
                </div>
            </Section>

            {/* FOOTER SIMPAN — nempel rata di bawah area konten (kanan sidebar), isinya sejajar sama kartu */}
            <div className="fixed bottom-0 left-0 md:left-72 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] px-4 md:px-10">
                <div className="max-w-6xl mx-auto py-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={back} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Kembali</button>
                <div className="flex-1 text-xs font-medium">
                    {error && <span className="text-red-600">⚠ {error}</span>}
                    {!error && dirty && <span className="text-amber-600">Ada perubahan yang belum disimpan.</span>}
                    {!error && !dirty && savedAt && <span className="text-emerald-600">✓ Tersimpan {savedAt.toLocaleTimeString('id-ID')}</span>}
                </div>
                <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-70">
                    <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                </div>
            </div>
        </div>
    );
}

function Section({ n, title, subtitle, children }: { n?: number; title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
                {n !== undefined && <div className="w-7 h-7 shrink-0 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">{n}</div>}
                <div>
                    <h2 className="text-base font-black text-slate-900">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

// Kartu buat Webhook & Daftar Channel, gayanya sama kayak EndpointCard (bisa dibuka/tutup).
function PlainCard({ title, description, summary, defaultOpen = true, onRemove, children }: {
    title: string; description?: string; summary: string; defaultOpen?: boolean; onRemove: () => void; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
            <div className={`flex items-start gap-3 ${open ? 'mb-3' : ''}`}>
                <button type="button" onClick={() => setOpen(!open)} className="p-1 -ml-1 mt-0.5 text-slate-400 hover:text-slate-800" title={open ? 'Tutup' : 'Buka'}>
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                    <button type="button" onClick={() => setOpen(!open)} className="font-bold text-slate-800 text-sm text-left hover:text-blue-700">{title}</button>
                    {open
                        ? description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
                        : <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">{summary}</p>}
                </div>
                <button type="button" onClick={onRemove} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md" title="Hapus"><Trash2 size={15} /></button>
            </div>
            {open && children}
        </div>
    );
}

function SecretInput({ label, saved, value, onChange, className }: { label: string; saved: boolean; value: string; onChange: (v: string) => void; className: string }) {
    return (
        <div>
            <label className="text-xs font-bold text-slate-600">{label}</label>
            <input
                type="password"
                autoComplete="new-password"
                className={`${className} mt-1 font-mono`}
                placeholder={saved ? 'Tersimpan — isi cuma kalau mau ganti' : ''}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}
