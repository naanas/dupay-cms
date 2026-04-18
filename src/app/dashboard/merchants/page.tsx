"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

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
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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

    if (loading) return <div className="p-4">Memuat data...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Tambah Merchant Baru</h2>
                <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Nama Merchant</label>
                        <input required type="text" className="w-full border p-2.5 rounded-lg outline-none" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">IP Whitelist (Opsional)</label>
                        <input type="text" className="w-full border p-2.5 rounded-lg outline-none" value={ipList} onChange={(e) => setIpList(e.target.value)} />
                    </div>
                    <button type="submit" disabled={submitting} className="bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                        {submitting ? 'Menyimpan...' : 'Tambah'}
                    </button>
                </form>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-sm">
                        <tr><th className="p-4">Nama</th><th className="p-4">API Key</th><th className="p-4">Secret Key</th><th className="p-4">IPs</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {merchants.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 font-medium">{m.name}</td>
                                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono text-xs border border-blue-200">{m.api_key}</span></td>
                                <td className="p-4"><span className="bg-red-50 text-red-700 px-2 py-1 rounded font-mono text-xs border border-red-200">{m.secret_key}</span></td>
                                <td className="p-4 text-xs text-gray-500">{m.whitelisted_ips || 'Semua IP'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}