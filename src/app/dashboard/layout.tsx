"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Command as CommandIcon, LogOut, Search } from "lucide-react";
import { canOpen, clearSession, HOME_BY_ROLE, useSessionUser } from "../../lib/session";
import { isActivePath, NAV } from "../../lib/nav";
import CommandPalette, { useCommandPaletteShortcut } from "../../components/CommandPalette";
import { OverlayHost } from "../../components/overlays";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const user = useSessionUser(); // undefined = belum kebaca (render server), null = belum login
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Belum login -> ke /login. Buka menu role lain (mis. merchant ke /dashboard/gateways) -> balik ke home role-nya.
    useEffect(() => {
        if (user === undefined) return;
        if (!user) {
            clearSession();
            router.replace("/login");
        } else if (!canOpen(user.role, pathname)) {
            router.replace(HOME_BY_ROLE[user.role]);
        }
    }, [router, pathname, user]);

    // Navbar sedikit lebih tegas setelah halaman di-scroll.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleLogout = useCallback(() => {
        clearSession();
        router.push("/login");
    }, [router]);

    const openPalette = useCallback(() => setPaletteOpen(true), []);
    useCommandPaletteShortcut(openPalette);

    if (!user || !canOpen(user.role, pathname)) return null;

    const navItems = NAV[user.role];
    const mainItems = navItems.filter(i => !i.menu);
    const tabItems = navItems.filter(i => i.tab).slice(0, 4);
    const displayName = user.role === "admin" ? "Administrator" : (user.merchant_name || user.username);
    const initials = displayName.substring(0, 2).toUpperCase();
    const roleLabel = user.role === "admin" ? "Admin" : "Merchant";

    return (
        <div className="min-h-screen text-slate-900">
            {/* ===== Navbar floating ===== */}
            <div className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
                <header
                    className={`glass mx-auto max-w-6xl h-14 rounded-2xl border flex items-center gap-2 pl-3 pr-2 transition-shadow duration-300 ${scrolled ? "border-slate-200/90 shadow-float" : "border-slate-200/60 shadow-soft"}`}
                >
                    <Link href={HOME_BY_ROLE[user.role]} className="flex items-center gap-2.5 shrink-0 pr-2 rounded-lg">
                        <span className="w-8 h-8 rounded-[10px] bg-slate-900 text-white flex items-center justify-center text-sm font-semibold shadow-soft relative overflow-hidden">
                            <span className="absolute inset-0 bg-gradient-to-br from-brand-500/60 to-transparent" aria-hidden />
                            <span className="relative">D</span>
                        </span>
                        <span className="font-semibold tracking-tight">Dupay</span>
                        <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-900/5 text-slate-500">{roleLabel}</span>
                    </Link>

                    {/* Menu utama (desktop) */}
                    <nav className="hidden md:flex items-center gap-0.5 mx-auto" aria-label="Menu utama">
                        {mainItems.map(item => {
                            const active = isActivePath(pathname, item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`relative flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium transition-colors ${active ? "bg-slate-900 text-white shadow-soft" : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5"}`}
                                >
                                    <Icon size={15} className={active ? "text-white/80" : "text-slate-400"} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto md:ml-0 flex items-center gap-1.5">
                        {/* Pencarian / command palette */}
                        <button
                            onClick={openPalette}
                            className="hidden lg:flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors w-48"
                            aria-label="Buka pencarian"
                        >
                            <Search size={15} />
                            <span className="flex-1 text-left">Cari…</span>
                            <kbd>⌘K</kbd>
                        </button>
                        <button onClick={openPalette} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-900/5" aria-label="Buka pencarian">
                            <Search size={18} />
                        </button>

                        <UserMenu
                            open={menuOpen}
                            setOpen={setMenuOpen}
                            initials={initials}
                            displayName={displayName}
                            username={user.username}
                            roleLabel={roleLabel}
                            items={navItems.filter(i => i.menu || !i.tab)}
                            onLogout={handleLogout}
                            onPalette={openPalette}
                        />
                    </div>
                </header>
            </div>

            {/* ===== Konten ===== */}
            <main className="px-4 md:px-6 pt-6 md:pt-8 pb-32 md:pb-16">
                <div key={pathname} className="max-w-6xl mx-auto page-enter">
                    {children}
                </div>
            </main>

            {/* ===== Tab bar floating (HP) ===== */}
            <nav
                className="md:hidden fixed z-40 bottom-0 inset-x-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                aria-label="Menu utama"
            >
                <div className="glass mx-auto max-w-md rounded-2xl border border-slate-200/80 shadow-float flex items-stretch p-1.5 gap-1">
                    {tabItems.map(item => {
                        const active = isActivePath(pathname, item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl text-[10px] font-medium transition-colors ${active ? "bg-slate-900 text-white" : "text-slate-500 active:bg-slate-900/5"}`}
                            >
                                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                                <span className="truncate max-w-full px-1">{item.short || item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={openPalette}
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl text-[10px] font-medium text-slate-500 active:bg-slate-900/5"
                    >
                        <CommandIcon size={19} strokeWidth={1.8} />
                        <span>Lainnya</span>
                    </button>
                </div>
            </nav>

            {paletteOpen && <CommandPalette role={user.role} onClose={() => setPaletteOpen(false)} onLogout={handleLogout} />}
            <OverlayHost />
        </div>
    );
}

function UserMenu({ open, setOpen, initials, displayName, username, roleLabel, items, onLogout, onPalette }: {
    open: boolean;
    setOpen: (v: boolean) => void;
    initials: string;
    displayName: string;
    username: string;
    roleLabel: string;
    items: typeof NAV["admin"];
    onLogout: () => void;
    onPalette: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open, setOpen]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 h-9 pl-1 pr-1.5 sm:pr-2 rounded-xl hover:bg-slate-900/5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Menu akun"
            >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-[11px] font-semibold">{initials}</span>
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-32 truncate">{displayName}</span>
                <ChevronDown size={14} className={`hidden sm:block text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div role="menu" className="toast-enter absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200/80 shadow-pop p-1.5 z-50">
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 truncate">@{username} · {roleLabel}</p>
                    </div>
                    {items.map(item => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
                                <Icon size={15} className="text-slate-400" /> {item.name}
                            </Link>
                        );
                    })}
                    <button role="menuitem" onClick={() => { setOpen(false); onPalette(); }} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
                        <Search size={15} className="text-slate-400" /> Cari & perintah
                        <kbd className="ml-auto">⌘K</kbd>
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button role="menuitem" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-red-600 hover:bg-red-50">
                        <LogOut size={15} /> Keluar
                    </button>
                </div>
            )}
        </div>
    );
}
