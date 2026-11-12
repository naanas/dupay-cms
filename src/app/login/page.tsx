"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { getSessionUser, HOME_BY_ROLE, saveSession } from '../../lib/session';
import AuthShell, { PasswordInput } from '../../components/AuthShell';
import { Button, Field, inputClass, Notice } from '../../components/ui';

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
        <AuthShell title="Masuk ke Dupay" subtitle="Satu login buat admin & merchant.">
            <form onSubmit={handleLogin} className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                <Field label="Username">
                    <input type="text" autoComplete="username" autoFocus className={`${inputClass} sm:h-11`} value={username} onChange={(e) => setUsername(e.target.value)} required />
                </Field>
                <Field label="Password">
                    <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </Field>
                <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
                    {loading ? 'Memproses…' : <>Masuk <ArrowRight size={16} /></>}
                </Button>
            </form>
            <p className="text-sm text-slate-500 mt-8">
                Mau integrasi pembayaran? <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">Daftar sebagai merchant</Link>
            </p>
        </AuthShell>
    );
}
