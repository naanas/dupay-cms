"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, LayoutDashboard, Users, CreditCard, LogOut } from "lucide-react"; // Install lucide-react jika belum

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const token = localStorage.getItem('dupay_token');
        if (!token) router.push('/login');
    }, [router]);

    const handleLogout = () => {
        localStorage.getItem('dupay_token');
        router.push('/login');
    };

    if (!isMounted) return null;

    const navItems = [
        { name: 'Merchants', href: '/dashboard/merchants', icon: Users },
        { name: 'Gateways', href: '/dashboard/gateways', icon: CreditCard },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* MOBILE HEADER */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
                <h2 className="text-xl font-bold text-blue-400">Dupay</h2>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* SIDEBAR */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="p-6 hidden md:block">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">D</div>
                        Dupay CMS
                    </h2>
                </div>

                <nav className="mt-6 px-4 space-y-2 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.includes(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-semibold"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* OVERLAY MOBILE */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="hidden md:flex bg-white border-b border-slate-200 p-4 px-8 items-center justify-between sticky top-0 z-20">
                    <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
                        {navItems.find(i => pathname.includes(i.href))?.name || 'Dashboard'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500">Administrator</span>
                        <div className="w-10 h-10 bg-slate-200 rounded-full border border-slate-300"></div>
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}