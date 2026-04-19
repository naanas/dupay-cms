"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import {
    Plus, Settings, Globe, Shield, Code2,
    Trash2, Pencil, Eye, X, Save, CheckCircle2
} from 'lucide-react';

export default function GatewaysPage() {
    const [gateways, setGateways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // State UI
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewData, setViewData] = useState<any | null>(null);

    // STATE FORM UPDATE: Tambah response_mapping
    const [formData, setFormData] = useState({
        name: '',
        base_url: '',
        charge_endpoint: '',
        auth_type: 'BASIC_AUTH',
        custom_auth_header: '',
        server_key: '',
        merchant_code: '',
        private_key: '',
        request_template: '{}',
        response_mapping: '{}', // BARU
        webhook_mapping: '{}',
        webhook_secret: '',
        is_active: true
    });

    const loadGateways = async () => {
        try {
            const data = await api.fetchCMS('/gateways');
            setGateways(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { loadGateways(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await api.fetchCMS(`/gateways/${editingId}`, 'PUT', formData);
                setEditingId(null);
            } else {
                await api.fetchCMS('/gateways', 'POST', formData);
            }

            // Reset Form
            setFormData({
                name: '', base_url: '', charge_endpoint: '', auth_type: 'BASIC_AUTH',
                custom_auth_header: '', server_key: '', merchant_code: '', private_key: '',
                request_template: '{}', response_mapping: '{}', webhook_mapping: '{}', webhook_secret: '', is_active: true
            });
            loadGateways();
        } catch (err: any) { alert(err.message); } finally { setSubmitting(false); }
    };

    const handleEdit = (gw: any) => {
        setEditingId(gw.id);
        setFormData({
            ...gw,
            // Kosongkan password field saat edit demi keamanan, user hanya isi jika ingin mengubahnya
            server_key: '',
            private_key: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Hapus Gateway ${name}?`)) {
            try {
                await api.fetchCMS(`/gateways/${id}`, 'DELETE');
                loadGateways();
            } catch (err: any) { alert(err.message); }
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 font-medium">Memuat konfigurasi gateway...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Gateways</h1>
                    <p className="text-sm text-slate-500 mt-1">Konfigurasi koneksi ke penyedia layanan pembayaran (PG).</p>
                </div>
            </div>

            {/* FORM KONFIGURASI */}
            <div className={`p-6 md:p-8 rounded-3xl border transition-all ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {editingId ? <Pencil size={20} /> : <Plus size={20} />}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {editingId ? 'Edit Gateway Configuration' : 'Configure New Gateway'}
                        </h2>
                    </div>
                    {editingId && (
                        <button onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', base_url: '', charge_endpoint: '', auth_type: 'BASIC_AUTH', custom_auth_header: '', server_key: '', merchant_code: '', private_key: '', request_template: '{}', response_mapping: '{}', webhook_mapping: '{}', webhook_secret: '', is_active: true });
                        }} className="text-sm font-bold text-blue-600 hover:underline">
                            Batal Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* KOLOM KIRI: Koneksi Utama & Credentials */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Gateway Identity</label>
                            <input required className="w-full border p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Tripay Sandbox" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Base URL</label>
                            <input required className="w-full border p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://api.gateway.com/" value={formData.base_url} onChange={e => setFormData({ ...formData, base_url: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Charge Path</label>
                                <input required className="w-full border p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="transaction/create" value={formData.charge_endpoint} onChange={e => setFormData({ ...formData, charge_endpoint: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Auth Type</label>
                                <select className="w-full border p-3 rounded-xl mt-1.5 outline-none bg-white" value={formData.auth_type} onChange={e => setFormData({ ...formData, auth_type: e.target.value })}>
                                    <option value="BASIC_AUTH">Basic Auth</option>
                                    <option value="BEARER_TOKEN">Bearer Token</option>
                                    <option value="CUSTOM_HEADER">Custom Header</option>
                                    <option value="TRIPAY_HMAC">Tripay HMAC</option>
                                    <option value="IPAYMU_V2">iPaymu Signature V2</option>
                                </select>
                            </div>
                        </div>

                        {/* INPUT CUSTOM HEADER (MUNCUL KALAU DIPILIH) */}
                        {formData.auth_type === 'CUSTOM_HEADER' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Custom Auth Header Name</label>
                                <input required className="w-full border p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. va atau signature" value={formData.custom_auth_header} onChange={e => setFormData({ ...formData, custom_auth_header: e.target.value })} />
                            </div>
                        )}

                        {/* BOX CREDENTIALS KHUSUS */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 mt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield size={16} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Gateway Credentials</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">API Key / Server Key (Encrypted)</label>
                                <input type="password" required={!editingId} className="w-full border p-2.5 rounded-lg mt-1 outline-none text-sm" placeholder="••••••••••••" value={formData.server_key} onChange={e => setFormData({ ...formData, server_key: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 ml-1">Merchant Code</label>
                                    <input className="w-full border p-2.5 rounded-lg mt-1 outline-none text-sm" placeholder="Opsional (Tripay)" value={formData.merchant_code} onChange={e => setFormData({ ...formData, merchant_code: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 ml-1">Private Key</label>
                                    <input type="password" className="w-full border p-2.5 rounded-lg mt-1 outline-none text-sm" placeholder="••••••" value={formData.private_key} onChange={e => setFormData({ ...formData, private_key: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KOLOM KANAN: Mapping & JSON */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Request Template (JSON)</label>
                            {/* Diubah jadi h-24 biar muat 3 textarea dengan rapi */}
                            <textarea className="w-full border p-3 rounded-xl mt-1.5 outline-none font-mono text-xs h-24" value={formData.request_template} onChange={e => setFormData({ ...formData, request_template: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Response Mapping (JSON)</label>
                            <textarea className="w-full border p-3 rounded-xl mt-1.5 outline-none font-mono text-xs h-24" placeholder='{"pg_transaction_id": "data.sessionId", "checkout_url": "data.url"}' value={formData.response_mapping} onChange={e => setFormData({ ...formData, response_mapping: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Webhook Mapping (JSON)</label>
                            <textarea className="w-full border p-3 rounded-xl mt-1.5 outline-none font-mono text-xs h-24" value={formData.webhook_mapping} onChange={e => setFormData({ ...formData, webhook_mapping: e.target.value })} />
                        </div>
                        <div className="flex items-end pt-2">
                            <button type="submit" disabled={submitting} className="w-full h-[52px] bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70">
                                <Save size={20} />
                                {submitting ? 'Saving...' : editingId ? 'Update Configuration' : 'Save Gateway'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* TABLE LIST GATEWAY */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Gateway Provider</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Connection</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Auth Method</th>
                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {gateways.map((gw) => (
                            <tr key={gw.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-5">
                                    <div className="font-bold text-slate-900">{gw.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-tighter">ID: {gw.id.slice(0, 8)}</div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Globe size={14} className="text-blue-500" />
                                        {gw.base_url.replace('https://', '')}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 font-bold italic">{gw.charge_endpoint}</div>
                                </td>
                                <td className="p-5">
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200">
                                        {gw.auth_type}
                                    </span>
                                    {gw.merchant_code && (
                                        <span className="ml-2 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-100">
                                            Has Merchant Code
                                        </span>
                                    )}
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => setViewData(gw)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="View Detail"><Eye size={18} /></button>
                                        <button onClick={() => handleEdit(gw)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Edit"><Pencil size={18} /></button>
                                        <button onClick={() => handleDelete(gw.id, gw.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL VIEW DETAIL */}
            {viewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setViewData(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 p-2"><X size={24} /></button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Settings size={28} /></div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{viewData.name}</h2>
                                <div className="flex items-center gap-2 text-green-500 text-xs font-bold mt-1"><CheckCircle2 size={14} /> ACTIVE CONNECTION</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Full API URL</span>
                                    <code className="text-blue-600 break-all">{viewData.base_url}{viewData.charge_endpoint}</code>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Authorization</span>
                                    <div className="font-bold text-slate-700">{viewData.auth_type}</div>
                                    {viewData.auth_type === 'CUSTOM_HEADER' && (
                                        <div className="text-[10px] text-slate-500 mt-1">Header: {viewData.custom_auth_header}</div>
                                    )}
                                    <div className="text-[10px] text-slate-400 mt-1 italic">Keys are Encrypted (AES-256)</div>
                                    {viewData.merchant_code && (
                                        <div className="mt-2 pt-2 border-t border-slate-200">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Merchant Code</span>
                                            <code className="font-mono text-slate-800">{viewData.merchant_code}</code>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Request JSON Sample</span>
                                    <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto max-h-24">{viewData.request_template}</pre>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Response Mapping</span>
                                    <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto max-h-24">{viewData.response_mapping}</pre>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Webhook Mapping</span>
                                    <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto max-h-24">{viewData.webhook_mapping}</pre>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setViewData(null)} className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                            Close Detail
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}