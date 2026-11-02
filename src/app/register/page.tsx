"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '../../lib/api';
import { getSessionUser, HOME_BY_ROLE } from '../../lib/session';

const EMPTY = { business_name: '', email: '', pic_name: '', phone: '', username: '', password: '' };

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState(EMPTY);
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    // Udah login -> nggak perlu daftar.
    useEffect(() => {
        const user = getSessionUser();
        if (user) router.replace(HOME_BY_ROLE[user.role]);
    }, [router]);

    const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (form.password !== confirm) {
            setError('Konfirmasi password nggak sama');
            return;
        }
        setLoading(true);
        try {
            await api.register(form);
            setDone(true);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const input = 'w-full border p-3 rounded-lg outline-none text-sm';
    const label = 'block text-sm font-semibold mb-2 text-gray-700';

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="animate-in bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                    <h1 className="text-2xl font-extrabold text-blue-600 mb-3">Pendaftaran terkirim</h1>
                    <p className="text-sm text-gray-600">
                        Akun <b>{form.username}</b> buat <b>{form.business_name}</b> udah dibuat dan lagi nunggu persetujuan admin Dupay.
                        Setelah diaktifkan, login pakai username & password tadi. API Key & Secret Key ada di menu <b>Integrasi API</b>.
                    </p>
                    <Link href="/login" className="inline-block mt-6 w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700">Ke halaman login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <form onSubmit={handleSubmit} className="animate-in bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-blue-600">Dupay</h1>
                    <p className="text-gray-500 text-sm mt-1">Daftar sebagai merchant</p>
                </div>
                {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-200">{error}</div>}

                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Data bisnis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="sm:col-span-2">
                        <label className={label}>Nama bisnis *</label>
                        <input className={input} value={form.business_name} onChange={set('business_name')} required minLength={3} />
                    </div>
                    <div>
                        <label className={label}>Email *</label>
                        <input type="email" autoComplete="email" className={input} value={form.email} onChange={set('email')} required />
                    </div>
                    <div>
                        <label className={label}>Nomor telepon</label>
                        <input type="tel" autoComplete="tel" className={input} value={form.phone} onChange={set('phone')} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={label}>Nama PIC *</label>
                        <input autoComplete="name" className={input} value={form.pic_name} onChange={set('pic_name')} required />
                    </div>
                </div>

                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Akun login</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="sm:col-span-2">
                        <label className={label}>Username *</label>
                        <input autoComplete="username" className={input} value={form.username} onChange={set('username')} required pattern="[a-zA-Z0-9_.\-]{3,50}" title="3-50 karakter: huruf, angka, titik, strip, underscore" />
                    </div>
                    <div>
                        <label className={label}>Password *</label>
                        <input type="password" autoComplete="new-password" className={input} value={form.password} onChange={set('password')} required minLength={8} />
                    </div>
                    <div>
                        <label className={label}>Ulangi password *</label>
                        <input type="password" autoComplete="new-password" className={input} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition">
                    {loading ? 'Mendaftar...' : 'Daftar'}
                </button>
                <p className="text-center text-sm text-gray-500 mt-6">
                    Udah punya akun? <Link href="/login" className="font-semibold text-blue-600 hover:underline">Login</Link>
                </p>
            </form>
        </div>
    );
}
