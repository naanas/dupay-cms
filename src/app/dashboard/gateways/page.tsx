"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

export default function GatewaysPage() {
    const [gateways, setGateways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        base_url: '',
        charge_endpoint: '',
        auth_type: 'BASIC_AUTH',
        server_key: '',
        request_template: '{}',
        response_mapping: '{}',
        webhook_mapping: '{}',
        webhook_secret: '',
        webhook_validation_type: 'TOKEN_MATCH'
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
        try {
            await api.fetchCMS('/gateways', 'POST', formData);
            alert("Gateway berhasil ditambahkan!");
            loadGateways();
        } catch (err: any) { alert(err.message); }
    };

    if (loading) return <div className="p-4 text-gray-600 font-medium">Memuat data orchestrator...</div>;

    return (
        <div className="space-y-10">
            {/* FORM SECTION */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Configure New Gateway</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <input placeholder="Gateway Name (e.g. Midtrans)" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <input placeholder="Base URL (https://api.midtrans.com)" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={e => setFormData({ ...formData, base_url: e.target.value })} required />
                        <input placeholder="Charge Endpoint (/v2/charge)" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={e => setFormData({ ...formData, charge_endpoint: e.target.value })} required />
                        <select className="w-full border p-3 rounded-xl outline-none" onChange={e => setFormData({ ...formData, auth_type: e.target.value })}>
                            <option value="BASIC_AUTH">Basic Auth</option>
                            <option value="BEARER_TOKEN">Bearer Token</option>
                        </select>
                        <input type="password" placeholder="Server Key / API Key" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={e => setFormData({ ...formData, server_key: e.target.value })} />
                    </div>

                    <div className="space-y-4">
                        <textarea placeholder="Request Template (JSON)" className="w-full border p-3 rounded-xl h-24 font-mono text-sm"
                            onChange={e => setFormData({ ...formData, request_template: e.target.value })} />
                        <textarea placeholder="Webhook Mapping (JSON)" className="w-full border p-3 rounded-xl h-24 font-mono text-sm"
                            onChange={e => setFormData({ ...formData, webhook_mapping: e.target.value })} />
                        <div className="flex gap-4">
                            <input placeholder="Webhook Secret" className="flex-1 border p-3 rounded-xl outline-none"
                                onChange={e => setFormData({ ...formData, webhook_secret: e.target.value })} />
                            <button type="submit" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                                Save Gateway
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* LIST SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-sm text-gray-500">
                        <tr>
                            <th className="p-5 font-bold">Gateway Name</th>
                            <th className="p-5 font-bold">Endpoint</th>
                            <th className="p-5 font-bold">Auth Type</th>
                            <th className="p-5 font-bold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                        {gateways.map((g) => (
                            <tr key={g.id} className="hover:bg-gray-50 transition">
                                <td className="p-5 font-semibold text-gray-900">{g.name}</td>
                                <td className="p-5 text-sm font-mono text-gray-500">{g.charge_endpoint}</td>
                                <td className="p-5"><span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">{g.auth_type}</span></td>
                                <td className="p-5 text-green-600 font-bold">● Active</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}