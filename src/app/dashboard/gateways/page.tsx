"use client";

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

export default function GatewaysPage() {
    const [gateways, setGateways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadGateways = async () => {
            try {
                const data = await api.fetchCMS('/gateways');
                setGateways(data);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        loadGateways();
    }, []);

    if (loading) return <div className="p-4">Memuat data...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-sm">
                        <tr><th className="p-4">Nama PG</th><th className="p-4">Base URL</th><th className="p-4">Auth Type</th><th className="p-4">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {gateways.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500 italic">Belum ada gateway yang terdaftar.</td></tr>
                        ) : gateways.map((g) => (
                            <tr key={g.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 font-medium">{g.name}</td>
                                <td className="p-4 text-sm text-gray-600">{g.base_url}</td>
                                <td className="p-4 text-xs font-mono">{g.auth_type}</td>
                                <td className="p-4">{g.is_active ? '✅ Aktif' : '❌ Non-Aktif'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}