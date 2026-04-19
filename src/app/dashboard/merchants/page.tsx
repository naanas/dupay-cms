"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import {
    Plus, ShieldCheck, Globe, Key, Mail, Phone,
    Copy, Check, Eye, Pencil, Trash2, Search, Building2, X
} from 'lucide-react';

export default function MerchantsPage() {
    const [merchants, setMerchants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // State untuk Edit dan View Modal
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewData, setViewData] = useState<any | null>(null);

    // FORM PASTI 6 FIELD SEKARANG
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', pic_name: '', webhook_url: '', whitelisted_ips: ''
    });

    const loadMerchants = async () => {
        try {
            const data = await api.fetchCMS('/merchants');
            setMerchants(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { loadMerchants(); }, []);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // --- FUNGSI CRUD LENGKAP ---
    const handleEditClick = (merchant: any) => {
        setEditingId(merchant.id);
        setFormData({
            name: merchant.name,
            email: merchant.email,
            phone: merchant.phone || '',
            pic_name: merchant.pic_name || '',
            webhook_url: merchant.webhook_url || '', // FIXED TYPO DISINI
            whitelisted_ips: merchant.whitelisted_ips || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Yakin ingin menghapus merchant ${name} secara permanen?`)) {
            try {
                await api.fetchCMS(`/merchants/${id}`, 'DELETE');
                loadMerchants();
            } catch (err: any) { alert("Gagal hapus: " + err.message); }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await api.fetchCMS(`/merchants/${editingId}`, 'PUT', formData);
                setEditingId(null);
            } else {
                await api.fetchCMS('/merchants', 'POST', formData);
            }
            setFormData({ name: '', email: '', phone: '', pic_name: '', webhook_url: '', whitelisted_ips: '' });
            loadMerchants();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

    if (loading) return <div className="p-10 text-center text-slate-400 font-medium">Memuat data merchant...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Merchant Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola akses, kredensial, dan keamanan semua klien Dupay.</p>
                </div>
            </div>

            {/* FORM: 6 INPUTS LENGKAP */}
            <div className={`p-6 md:p-8 rounded-2xl shadow-sm border transition-all ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={`font-bold ${editingId ? 'text-amber-800' : 'text-slate-800'}`}>
                        {editingId ? 'Edit Merchant Data' : 'Register New Merchant'}
                    </h2>
                    {editingId && (
                        <button onClick={() => { setEditingId(null); setFormData({ name: '', email: '', phone: '', pic_name: '', webhook_url: '', whitelisted_ips: '' }) }} className="text-sm text-amber-600 hover:underline">
                            Batal Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kolom 1 */}

                        <div className="space-y-4">
                            <input required className="w-full border p-3 rounded-xl text-sm outline-none"
                                placeholder="Nama Bisnis *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            <input required type="email" className="w-full border p-3 rounded-xl text-sm outline-none"
                                placeholder="Email Operasional *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            <input className="w-full border p-3 rounded-xl text-sm outline-none"
                                placeholder="Nomor Telepon (Phone)" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />

                        </div>
                        {/* Kolom 2 */}
                        <div className="space-y-4">
                            <input className="w-full border p-3 rounded-xl text-sm outline-none"
                                placeholder="Nama PIC (Owner/Admin)" value={formData.pic_name} onChange={e => setFormData({ ...formData, pic_name: e.target.value })} />

                            {/* INPUT WEBHOOK URL DITAMBAHKAN DISINI */}
                            <input className="w-full border p-3 rounded-xl text-sm outline-none"
                                placeholder="Webhook URL (Optional)" value={formData.webhook_url} onChange={e => setFormData({ ...formData, webhook_url: e.target.value })} />

                            <input className="w-full border p-3 rounded-xl text-sm outline-none"
                                placeholder="IP Whitelist (Pisahkan dgn koma)" value={formData.whitelisted_ips} onChange={e => setFormData({ ...formData, whitelisted_ips: e.target.value })} />

                            <button type="submit" disabled={submitting} className={`w-full h-[46px] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                                {submitting ? 'Memproses...' : editingId ? 'Update Merchant' : 'Tambah Merchant'}
                            </button>
                        </div>
                    </div>

                </form>
            </div>

            {/* TABLE DATA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Merchant Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">IP Whitelist</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">API Credentials</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {merchants.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors group">

                                    {/* Column 1: Info (Name, Email, Phone) */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                {getInitials(m.name)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{m.name}</div>
                                                <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                                    <span>{m.email}</span> • <span>{m.phone || 'No Phone'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Column 2: IP Whitelist Tampil Jelas */}
                                    <td className="px-6 py-4">
                                        {m.whitelisted_ips ? (
                                            <div className="flex flex-col gap-1">
                                                {m.whitelisted_ips.split(',').map((ip: string, i: number) => (
                                                    <span key={i} className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 w-fit">
                                                        {ip.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-slate-400 bg-slate-100 px-2 py-1 rounded">Any IP Allowed</span>
                                        )}
                                    </td>

                                    {/* Column 3: Credentials (DENGAN TOMBOL COPY YANG SUDAH DIPERBAIKI) */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2 min-w-[260px]">
                                            <div className="flex items-center justify-between border rounded-md p-1.5 pl-2.5 hover:border-blue-300 transition-all">
                                                <div className="flex gap-2 items-center">
                                                    <Key size={12} className="text-blue-500" />
                                                    <span className="text-xs font-mono">{m.api_key.substring(0, 16)}...</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(m.api_key, m.id + 'pk')}
                                                    className="p-1.5 hover:bg-blue-50 rounded transition-all"
                                                >
                                                    {copiedId === m.id + 'pk' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400 hover:text-blue-500" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between border rounded-md p-1.5 pl-2.5 hover:border-red-300 transition-all">
                                                <div className="flex gap-2 items-center">
                                                    <ShieldCheck size={12} className="text-red-500" />
                                                    <span className="text-xs font-mono">{m.secret_key.substring(0, 16)}...</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(m.secret_key, m.id + 'sk')}
                                                    className="p-1.5 hover:bg-red-50 rounded transition-all"
                                                >
                                                    {copiedId === m.id + 'sk' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400 hover:text-red-500" />}
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Column 4: Actions */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setViewData(m)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="View">
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleEditClick(m)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg" title="Edit">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL VIEW DETAIL */}
            {viewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg relative shadow-2xl">
                        <button onClick={() => setViewData(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800">
                            <X size={24} />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <Building2 className="text-blue-600" /> Detail Merchant
                        </h2>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">ID</span> <span className="col-span-2 font-mono">{viewData.id}</span></div>
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">Nama Bisnis</span> <span className="col-span-2 font-bold">{viewData.name}</span></div>
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">PIC</span> <span className="col-span-2">{viewData.pic_name || '-'}</span></div>
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">Email</span> <span className="col-span-2">{viewData.email}</span></div>
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">Phone</span> <span className="col-span-2">{viewData.phone || '-'}</span></div>
                            {/* BARIS WEBHOOK URL DITAMBAHKAN DISINI */}
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">Webhook URL</span> <span className="col-span-2 font-mono text-blue-600 break-all">{viewData.webhook_url || 'Belum diset'}</span></div>
                            <div className="grid grid-cols-3 border-b pb-2"><span className="text-slate-500">IP Whitelist</span> <span className="col-span-2 font-mono">{viewData.whitelisted_ips || 'Kosong (Akses Publik)'}</span></div>

                            <div className="mt-6 p-4 bg-slate-50 rounded-xl space-y-3">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 block mb-1">API KEY (Public)</span>
                                    <code className="text-xs text-blue-600 break-all select-all">{viewData.api_key}</code>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-500 block mb-1">SECRET KEY (Private)</span>
                                    <code className="text-xs text-red-600 break-all select-all">{viewData.secret_key}</code>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setViewData(null)} className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
                            Tutup Modal
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}