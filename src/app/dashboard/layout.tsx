"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const token = localStorage.getItem('dupay_token');
        if (!token) router.push('/login');
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('dupay_token');
        router.push('/login');
    };

    if (!isMounted) return null;

    return (
        <div className="min-h-screen flex bg-gray-100">
            <aside className="w-64 bg-gray-900 text-white flex flex-col">
                <div className="p-6"><h2 className="text-2xl font-bold text-blue-400">Dupay CMS</h2></div>
                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/dashboard/merchants" className={`block p-3 rounded-lg transition ${pathname.includes('/merchants') ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>Merchants</Link>
                    <Link href="/dashboard/gateways" className={`block p-3 rounded-lg transition ${pathname.includes('/gateways') ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>Gateways</Link>
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={handleLogout} className="w-full bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white p-3 rounded-lg font-semibold transition">Logout</button>
                </div>
            </aside>
            <main className="flex-1 overflow-auto">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800">{pathname.includes('/merchants') ? 'Merchants' : 'Gateways'}</h1>
                </header>
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}