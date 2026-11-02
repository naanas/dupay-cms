"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '../../lib/api';
import { getSessionUser, HOME_BY_ROLE, saveSession } from '../../lib/session';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Udah login -> langsung ke halaman utama role-nya.
    useEffect(() => {
        const user = getSessionUser();
        if (user) router.replace(HOME_BY_ROLE[user.role]);
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.login(username, password);
            saveSession(data.token, data.user);
            router.push(HOME_BY_ROLE[data.user.role] || '/login');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <form onSubmit={handleLogin} className="animate-in bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-blue-600">Dupay</h1>
                    <p className="text-gray-500 text-sm mt-1">Login admin & merchant</p>
                </div>
                {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-200">{error}</div>}
                <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Username</label>
                    <input type="text" autoComplete="username" className="w-full border p-3 rounded-lg outline-none" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Password</label>
                    <input type="password" autoComplete="current-password" className="w-full border p-3 rounded-lg outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition">
                    {loading ? 'Processing...' : 'Login'}
                </button>
                <p className="text-center text-sm text-gray-500 mt-6">
                    Mau integrasi pembayaran? <Link href="/register" className="font-semibold text-blue-600 hover:underline">Daftar sebagai merchant</Link>
                </p>
            </form>
        </div>
    );
}
