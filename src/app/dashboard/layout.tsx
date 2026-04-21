"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Menu,
    X,
    Users,
    CreditCard,
    LogOut,
    ChevronRight,
    BookOpen,
    Activity
} from "lucide-react";

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
        localStorage.removeItem('dupay_token');
        router.push('/login');
    };

    if (!isMounted) return null;

    const navItems = [
        { name: 'Merchants', href: '/dashboard/merchants', icon: Users },
        { name: 'Gateways', href: '/dashboard/gateways', icon: CreditCard },
        { name: 'Transactions', href: '/dashboard/transactions', icon: Activity },
        { name: 'Documentation', href: '/dashboard/docs', icon: BookOpen },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative text-slate-900 font-sans">

            {/* 1. MOBILE HEADER (Z-INDEX 40) */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm text-white">D</div>
                    <span className="font-bold tracking-tight">DUPAY CMS</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* 2. SIDEBAR (Z-INDEX 50) */}
            <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out z-50
        md:relative md:translate-x-0 md:flex md:flex-col
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
                {/* Sidebar Branding (Desktop Only) */}
                <div className="p-8 hidden md:block text-left">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">D</div>
                        Dupay
                    </h2>
                </div>

                {/* Sidebar Close Button (Mobile Only) */}
                <div className="md:hidden p-6 flex justify-end">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={28} />
                    </button>
                </div>

                {/* PROFILE SECTION (MOBILE ONLY) */}
                <div className="md:hidden px-6 pb-6 border-b border-slate-800 mb-4 text-left">
                    <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-inner">AD</div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">Administrator</span>
                            <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                            </span>
                        </div>
                    </div>
                </div>

                <nav className="px-4 space-y-2 flex-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                        : 'hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} />
                                    <span className="font-semibold">{item.name}</span>
                                </div>
                                {isActive && <ChevronRight size={16} />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all font-bold"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* 3. OVERLAY (Z-INDEX 45) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-45 md:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 4. MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Desktop Header */}
                <header className="hidden md:flex bg-white border-b border-slate-200 p-5 px-10 items-center justify-between sticky top-0 z-30">
                    <div className="flex flex-col text-left">
                        <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wider">
                            {navItems.find(i => pathname.includes(i.href))?.name || 'Dashboard'}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium italic">Dupay Orchestrator Control Panel</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-2 pr-5 rounded-full border border-slate-100 shadow-sm">
                        <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm border border-blue-200 shadow-inner">AD</div>
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-700">Administrator</span>
                            <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                            </span>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}