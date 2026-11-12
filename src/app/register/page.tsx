"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { getSessionUser, HOME_BY_ROLE } from '../../lib/session';
import AuthShell, { PasswordInput } from '../../components/AuthShell';
import { Button, Field, inputClass, Notice } from '../../components/ui';

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

    const input = `${inputClass} sm:h-11`;

    if (done) {
        return (
            <AuthShell title="Pendaftaran terkirim">
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 p-5 flex gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-900 leading-relaxed">
                        Akun <b>{form.username}</b> buat <b>{form.business_name}</b> udah dibuat dan lagi nunggu persetujuan admin Dupay.
                        Setelah diaktifkan, login pakai username & password tadi. API Key & Secret Key ada di menu <b>Integrasi API</b>.
                    </p>
                </div>
                <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
                    Ke halaman login
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Daftar sebagai merchant" subtitle="Akun baru aktif setelah disetujui admin Dupay." wide>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <Notice tone="error">{error}</Notice>}

                <fieldset className="space-y-4">
                    <legend className="text-xs font-medium text-slate-400 mb-3">Data bisnis</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Nama bisnis" className="sm:col-span-2">
                            <input className={input} value={form.business_name} onChange={set('business_name')} required minLength={3} />
                        </Field>
                        <Field label="Email">
                            <input type="email" autoComplete="email" className={input} value={form.email} onChange={set('email')} required />
                        </Field>
                        <Field label={<>Nomor telepon <span className="text-slate-400 font-normal">(opsional)</span></>}>
                            <input type="tel" autoComplete="tel" className={input} value={form.phone} onChange={set('phone')} />
                        </Field>
                        <Field label="Nama PIC" className="sm:col-span-2">
                            <input autoComplete="name" className={input} value={form.pic_name} onChange={set('pic_name')} required />
                        </Field>
                    </div>
                </fieldset>

                <fieldset className="space-y-4">
                    <legend className="text-xs font-medium text-slate-400 mb-3">Akun login</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Username" hint="3–50 karakter: huruf, angka, titik, strip, underscore." className="sm:col-span-2">
                            <input autoComplete="username" className={input} value={form.username} onChange={set('username')} required pattern="[a-zA-Z0-9_.\-]{3,50}" title="3-50 karakter: huruf, angka, titik, strip, underscore" />
                        </Field>
                        <Field label="Password" hint="Minimal 8 karakter.">
                            <PasswordInput autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
                        </Field>
                        <Field label="Ulangi password">
                            <PasswordInput autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
                        </Field>
                    </div>
                </fieldset>

                <Button type="submit" size="lg" loading={loading} className="w-full">
                    {loading ? 'Mendaftar…' : 'Daftar'}
                </Button>
            </form>
            <p className="text-sm text-slate-500 mt-8">
                Udah punya akun? <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">Masuk</Link>
            </p>
        </AuthShell>
    );
}
