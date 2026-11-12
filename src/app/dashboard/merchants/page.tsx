"use client";

import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { consumeIntentFromURL, onIntent } from '../../../lib/nav';
import MerchantLoginModal from './MerchantLoginModal';
import {
    Button, CopyField, DetailList, Drawer, EmptyState, Field, IconButton, inputClass, Notice, PageHeader, PageSkeleton,
    SearchInput, Segmented, Tag, TableCard, tdClass, thClass,
} from '../../../components/ui';
import { confirmDialog, toast } from '../../../components/overlays';
import { Check, Copy, Eye, KeyRound, Pencil, Plus, Trash2, Users } from 'lucide-react';

type Merchant = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    pic_name?: string;
    webhook_url?: string;
    whitelisted_ips?: string;
    api_key: string;
    secret_key: string;
    is_active: boolean;
    login_username?: string;
};

const EMPTY_FORM = { name: '', email: '', phone: '', pic_name: '', webhook_url: '', whitelisted_ips: '' };
type ActiveFilter = 'all' | 'active' | 'inactive';

export default function MerchantsPage() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

    // undefined = form tertutup, null = tambah baru, string = edit merchant itu
    const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
    const [viewData, setViewData] = useState<Merchant | null>(null);
    const [loginFor, setLoginFor] = useState<Merchant | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const loadMerchants = async () => {
        try {
            const data = await api.fetchCMS('/merchants');
            setMerchants(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Gagal memuat merchant', errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMerchants(); }, []);

    // "Tambah merchant" dari command palette.
    useEffect(() => {
        const openNew = () => { setFormData(EMPTY_FORM); setEditingId(null); };
        if (consumeIntentFromURL('new-merchant')) queueMicrotask(openNew);
        return onIntent('new-merchant', openNew);
    }, []);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openNew = () => { setFormData(EMPTY_FORM); setEditingId(null); };

    const handleEditClick = (merchant: Merchant) => {
        setEditingId(merchant.id);
        setFormData({
            name: merchant.name,
            email: merchant.email,
            phone: merchant.phone || '',
            pic_name: merchant.pic_name || '',
            webhook_url: merchant.webhook_url || '',
            whitelisted_ips: merchant.whitelisted_ips || '',
        });
    };

    const handleDelete = async (m: Merchant) => {
        const ok = await confirmDialog({
            title: `Hapus ${m.name}?`,
            description: 'Merchant dihapus permanen. API Key-nya langsung nggak bisa dipakai lagi.',
            confirmLabel: 'Hapus merchant',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            await api.fetchCMS(`/merchants/${m.id}`, 'DELETE');
            toast.success(`${m.name} dihapus`);
            loadMerchants();
        } catch (err) {
            toast.error('Gagal hapus merchant', errorMessage(err));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await api.fetchCMS(`/merchants/${editingId}`, 'PUT', formData);
                toast.success('Merchant diperbarui');
            } else {
                await api.fetchCMS('/merchants', 'POST', formData);
                toast.success('Merchant ditambahkan', 'API Key & Secret Key udah dibuat.');
            }
            setEditingId(undefined);
            setFormData(EMPTY_FORM);
            loadMerchants();
        } catch (err) {
            toast.error('Gagal menyimpan', errorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleActive = async (m: Merchant) => {
        const next = !m.is_active;
        if (!next) {
            const ok = await confirmDialog({
                title: `Nonaktifkan ${m.name}?`,
                description: 'API Key & login dashboard-nya langsung ditolak sampai diaktifkan lagi.',
                confirmLabel: 'Nonaktifkan',
                tone: 'danger',
            });
            if (!ok) return;
        }
        try {
            await api.fetchCMS(`/merchants/${m.id}/active`, 'PUT', { is_active: next });
            setMerchants(prev => prev.map(x => x.id === m.id ? { ...x, is_active: next } : x));
            toast.success(next ? `${m.name} diaktifkan` : `${m.name} dinonaktifkan`);
        } catch (err) {
            toast.error('Gagal mengubah status', errorMessage(err));
        }
    };

    const pendingCount = merchants.filter(m => !m.is_active).length;

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return merchants.filter(m =>
            (activeFilter === 'all' || (activeFilter === 'active') === m.is_active) &&
            (!q || [m.name, m.email, m.pic_name, m.login_username, m.phone].some(v => v?.toLowerCase().includes(q))),
        );
    }, [merchants, search, activeFilter]);

    if (loading) return <PageSkeleton table />;

    const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [k]: e.target.value });

    return (
        <div className="space-y-6 animate-in">
            <PageHeader
                title="Merchants"
                subtitle="Kelola akses, kredensial, dan keamanan semua klien Dupay."
                action={<Button icon={Plus} onClick={openNew}>Tambah merchant</Button>}
            />

            {pendingCount > 0 && (
                <Notice tone="warning">
                    <b>{pendingCount} merchant</b> nonaktif / nunggu persetujuan. Klik tombol status-nya buat mengaktifkan.
                </Notice>
            )}

            <TableCard
                toolbar={
                    <>
                        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama, email, PIC, username…" className="flex-1 min-w-0 lg:max-w-sm" />
                        <Segmented<ActiveFilter>
                            className="lg:ml-auto"
                            value={activeFilter}
                            onChange={setActiveFilter}
                            options={[
                                { value: 'all', label: 'Semua', count: merchants.length },
                                { value: 'active', label: 'Aktif', count: merchants.length - pendingCount },
                                { value: 'inactive', label: 'Nonaktif', count: pendingCount },
                            ]}
                        />
                    </>
                }
            >
                <table className="data-table text-left">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                            <th className={`${thClass} pl-5`}>Merchant</th>
                            <th className={`${thClass} w-28`}>Status</th>
                            <th className={`${thClass} w-[30%]`}>API Credentials</th>
                            <th className={`${thClass} w-36`}>Login</th>
                            <th className={`${thClass} pr-5 text-right w-32`}><span className="sr-only">Aksi</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 stagger">
                        {visible.length === 0 && (
                            <tr><td colSpan={5}>
                                <EmptyState
                                    icon={Users}
                                    title={merchants.length ? 'Nggak ada yang cocok' : 'Belum ada merchant'}
                                    description={merchants.length ? 'Coba kata kunci atau filter lain.' : 'Tambah merchant pertama buat bikin API Key.'}
                                    action={merchants.length ? undefined : <Button icon={Plus} size="sm" onClick={openNew}>Tambah merchant</Button>}
                                />
                            </td></tr>
                        )}
                        {visible.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80">
                                <td className={`${tdClass} pl-5`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 text-xs font-semibold shrink-0">
                                            {m.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-slate-900 truncate">{m.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 break-all">
                                                {m.email}{m.phone ? ` · ${m.phone}` : ''}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {m.whitelisted_ips
                                                    ? m.whitelisted_ips.split(',').map((ip, i) => <Tag key={i} tone="green" className="font-mono text-[10px]">{ip.trim()}</Tag>)
                                                    : <Tag className="text-[10px]">Semua IP boleh</Tag>}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Status aktif: merchant hasil daftar sendiri mulai dari nonaktif */}
                                <td className={tdClass} data-label="Status">
                                    <button
                                        onClick={() => toggleActive(m)}
                                        title={m.is_active ? 'Nonaktifkan merchant' : 'Aktifkan merchant'}
                                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 h-7 rounded-lg ring-1 ring-inset transition-colors ${m.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 ring-amber-600/20 hover:bg-amber-100'}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        {m.is_active ? 'Aktif' : 'Aktifkan'}
                                    </button>
                                </td>

                                <td className={tdClass} data-label="API Key">
                                    <div className="flex flex-col gap-1.5 w-full max-w-[260px]">
                                        {[
                                            { key: 'pk', label: 'PK', value: m.api_key },
                                            { key: 'sk', label: 'SK', value: m.secret_key },
                                        ].map(c => (
                                            <div key={c.key} className="flex items-center gap-2 h-8 rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200/80 pl-2 pr-0.5">
                                                <span className={`text-[9px] font-semibold ${c.key === 'sk' ? 'text-red-500' : 'text-brand-600'}`}>{c.label}</span>
                                                <span className="flex-1 min-w-0 text-xs font-mono truncate text-slate-700">{c.key === 'sk' ? '•'.repeat(16) : c.value}</span>
                                                <button onClick={() => handleCopy(c.value, m.id + c.key)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-md shrink-0" title="Salin" aria-label={`Salin ${c.label}`}>
                                                    {copiedId === m.id + c.key ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </td>

                                <td className={tdClass} data-label="Login">
                                    <button
                                        onClick={() => setLoginFor(m)}
                                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 h-7 rounded-lg ring-1 ring-inset max-w-full transition-colors ${m.login_username ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50' : 'bg-brand-50 text-brand-700 ring-brand-600/15 hover:bg-brand-100'}`}
                                    >
                                        <KeyRound size={12} className="shrink-0" /> <span className="truncate">{m.login_username || 'Bikin akun'}</span>
                                    </button>
                                </td>

                                <td className={`${tdClass} pr-5`} data-label="Aksi">
                                    <div className="flex items-center justify-end gap-0.5">
                                        <IconButton icon={Eye} label="Lihat detail" onClick={() => setViewData(m)} />
                                        <IconButton icon={Pencil} label="Edit" tone="brand" onClick={() => handleEditClick(m)} />
                                        <IconButton icon={Trash2} label="Hapus" tone="red" onClick={() => handleDelete(m)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableCard>

            {loginFor && <MerchantLoginModal merchant={loginFor} onClose={() => setLoginFor(null)} onSaved={loadMerchants} />}

            {editingId !== undefined && (
                <Drawer
                    onClose={() => setEditingId(undefined)}
                    title={editingId ? 'Edit merchant' : 'Tambah merchant'}
                    subtitle={editingId ? formData.name : 'API Key & Secret Key dibuat otomatis setelah disimpan.'}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setEditingId(undefined)}>Batal</Button>
                            <Button type="submit" form="merchant-form" loading={submitting} icon={editingId ? Pencil : Plus}>
                                {editingId ? 'Simpan perubahan' : 'Tambah merchant'}
                            </Button>
                        </>
                    }
                >
                    <form id="merchant-form" onSubmit={handleSubmit} className="space-y-6">
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-medium text-slate-400 mb-3">Profil bisnis</legend>
                            <Field label="Nama bisnis"><input required autoFocus className={inputClass} value={formData.name} onChange={set('name')} /></Field>
                            <Field label="Email operasional"><input required type="email" className={inputClass} value={formData.email} onChange={set('email')} /></Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Nama PIC"><input className={inputClass} value={formData.pic_name} onChange={set('pic_name')} /></Field>
                                <Field label="Nomor telepon"><input className={inputClass} value={formData.phone} onChange={set('phone')} /></Field>
                            </div>
                        </fieldset>
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-medium text-slate-400 mb-3">Integrasi</legend>
                            <Field label="Webhook URL" hint="Dupay ngirim POST ke sini tiap status transaksi berubah.">
                                <input className={`${inputClass} font-mono`} placeholder="https://toko.com/webhook/dupay" value={formData.webhook_url} onChange={set('webhook_url')} />
                            </Field>
                            <Field label="IP whitelist" hint="Pisahkan pakai koma. Kosong = semua IP boleh (tetap wajib signature).">
                                <input className={`${inputClass} font-mono`} placeholder="103.10.20.30, 103.10.20.31" value={formData.whitelisted_ips} onChange={set('whitelisted_ips')} />
                            </Field>
                        </fieldset>
                    </form>
                </Drawer>
            )}

            {viewData && (
                <Drawer
                    onClose={() => setViewData(null)}
                    title={viewData.name}
                    subtitle={<Tag tone={viewData.is_active ? 'green' : 'amber'}>{viewData.is_active ? 'Aktif' : 'Nonaktif'}</Tag>}
                    footer={
                        <>
                            <Button variant="secondary" icon={KeyRound} onClick={() => { setLoginFor(viewData); setViewData(null); }}>Akun login</Button>
                            <Button icon={Pencil} onClick={() => { handleEditClick(viewData); setViewData(null); }}>Edit</Button>
                        </>
                    }
                >
                    <div className="space-y-6">
                        <DetailList items={[
                            ['ID', <span key="id" className="font-mono text-xs">{viewData.id}</span>],
                            ['PIC', viewData.pic_name || '-'],
                            ['Email', viewData.email],
                            ['Telepon', viewData.phone || '-'],
                            ['Login', viewData.login_username || 'Belum ada'],
                            ['Webhook URL', <span key="w" className="font-mono text-xs">{viewData.webhook_url || 'Belum diset'}</span>],
                            ['IP whitelist', <span key="ip" className="font-mono text-xs">{viewData.whitelisted_ips || 'Semua IP boleh'}</span>],
                        ]} />
                        <div className="space-y-3">
                            <CopyField label="API Key (public)" value={viewData.api_key} />
                            <CopyField label="Secret Key (private)" value={viewData.secret_key} secret />
                        </div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}
