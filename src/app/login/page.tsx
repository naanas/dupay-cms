"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('dupay123');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.login(username, password);
            localStorage.setItem('dupay_token', data.token);
            router.push('/dashboard/merchants');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-blue-600">Dupay</h1>
                    <p className="text-gray-500 text-sm mt-1">Orchestrator CMS</p>
                </div>
                {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-200">{error}</div>}
                <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Username</label>
                    <input type="text" className="w-full border p-3 rounded-lg outline-none" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Password</label>
                    <input type="password" className="w-full border p-3 rounded-lg outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition">
                    {loading ? 'Processing...' : 'Login'}
                </button>
            </form>
        </div>
    );
}