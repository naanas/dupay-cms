"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Plus, ShieldCheck, Globe, Key } from 'lucide-react';

export default function MerchantsPage() {
    const [merchants, setMerchants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [ipList, setIpList] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadMerchants = async () => {
        try {
            const data = await api.fetchCMS('/merchants');
            setMerchants(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { loadMerchants(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.fetchCMS('/merchants', 'POST', { name, whitelisted_ips: ipList });
            setName(''); setIpList(''); loadMerchants();
        } catch (err: any) { alert(err.message); } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Plus size={20} /></div>
                    <h2 className="text-xl font-bold text-slate-800">Register New Merchant</h2>
                </div>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-semibold mb-2 text-slate-700">Business Name</label>
                        <input required type="text" className="w-full border-slate-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="e.g. Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-semibold mb-2 text-slate-700">IP Whitelist</label>
                        <input type="text" className="w-full border-slate-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="Split by comma" value={ipList} onChange={(e) => setIpList(e.target.value)} />
                    </div>
                    <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white font-bold p-3.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-200">
                        {submitting ? 'Creating...' : 'Register Merchant'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-5 text-sm font-bold text-slate-600">Merchant Info</th>
                                <th className="p-5 text-sm font-bold text-slate-600">Credentials</th>
                                <th className="p-5 text-sm font-bold text-slate-600">Security</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {merchants.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5">
                                        <div className="font-bold text-slate-900">{m.name}</div>
                                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-tighter">ID: {m.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="p-5 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Key size={14} className="text-blue-500" />
                                            <code className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">{m.api_key}</code>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-red-500" />
                                            <code className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">{m.secret_key}</code>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <Globe size={14} className="text-slate-400" />
                                            {m.whitelisted_ips || <span className="text-slate-400 italic font-medium">Anywhere Access</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}