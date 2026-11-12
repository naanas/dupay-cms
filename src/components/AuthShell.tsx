"use client";

// Kerangka halaman login / daftar: panel brand di kiri (desktop), form di kanan.

import { useState } from "react";
import { Eye, EyeOff, Layers, ShieldCheck, Zap } from "lucide-react";
import { inputClass } from "./ui";

const POINTS = [
    { icon: Layers, title: "Satu API, banyak gateway", text: "Kirim kode metode bayar, Dupay yang milih PG & bikin tagihan." },
    { icon: ShieldCheck, title: "Aman dari ujung ke ujung", text: "Signature HMAC, webhook terverifikasi, status dicek ulang ke PG." },
    { icon: Zap, title: "Pantau real-time", text: "Lihat transaksi, cek status ke PG, & atur routing dari satu tempat." },
];

export default function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <aside className="hidden lg:flex relative overflow-hidden bg-slate-950 text-white p-12 flex-col">
                <div className="absolute inset-0 opacity-70" aria-hidden
                    style={{ background: "radial-gradient(40rem 30rem at 0% 0%, oklch(0.53 0.22 268 / 0.55), transparent 60%), radial-gradient(30rem 24rem at 100% 100%, oklch(0.6 0.15 200 / 0.35), transparent 60%)" }} />
                <div className="absolute inset-0 opacity-[0.07]" aria-hidden
                    style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                <div className="relative flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-white text-slate-900 flex items-center justify-center font-semibold">D</span>
                    <span className="text-lg font-semibold tracking-tight">Dupay</span>
                </div>
                <div className="relative mt-auto max-w-md">
                    <h2 className="text-3xl font-semibold tracking-tight leading-tight">Payment orchestrator buat bisnis lu.</h2>
                    <ul className="mt-8 space-y-5">
                        {POINTS.map(p => (
                            <li key={p.title} className="flex gap-4">
                                <span className="w-9 h-9 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center"><p.icon size={16} /></span>
                                <div>
                                    <p className="text-sm font-medium">{p.title}</p>
                                    <p className="text-sm text-slate-400 mt-0.5">{p.text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="relative mt-12 text-xs text-slate-500">© {new Date().getFullYear()} Dupay</p>
            </aside>

            <main className="flex items-center justify-center p-5 sm:p-10">
                <div className={`animate-in w-full ${wide ? "max-w-lg" : "max-w-sm"}`}>
                    <div className="lg:hidden flex items-center gap-2.5 mb-10">
                        <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">D</span>
                        <span className="text-lg font-semibold tracking-tight">Dupay</span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                    {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
                    <div className="mt-8">{children}</div>
                </div>
            </main>
        </div>
    );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const [shown, setShown] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={shown ? "text" : "password"} className={`${inputClass} h-11 pr-10`} />
            <button
                type="button"
                onClick={() => setShown(!shown)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                aria-label={shown ? "Sembunyikan password" : "Tampilkan password"}
            >
                {shown ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}
