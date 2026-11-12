"use client";

// Command palette: ⌘K / Ctrl+K / "/" → cari halaman & aksi, navigasi pakai keyboard.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, CornerDownLeft, LogOut, Plus, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fireIntent, NAV } from "../lib/nav";
import type { Role } from "../lib/session";

export type Command = {
    id: string;
    title: string;
    subtitle?: string;
    group: "Halaman" | "Aksi" | "Terakhir dibuka";
    icon: LucideIcon;
    keywords?: string;
    run: () => void;
};

const RECENT_KEY = "dupay_palette_recent";

const readRecent = (): string[] => {
    try {
        const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
    } catch {
        return [];
    }
};
const pushRecent = (id: string) => {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter(x => x !== id)].slice(0, 4)));
    } catch { /* storage diblok: nggak apa-apa */ }
};

// Cocok kalau semua kata yang diketik ada di judul/keterangan/keyword.
const matches = (c: Command, q: string) => {
    const hay = `${c.title} ${c.subtitle || ""} ${c.keywords || ""}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};

export function useCommandPaletteShortcut(open: () => void) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
            if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                open();
            } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                open();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);
}

export default function CommandPalette({ role, onClose, onLogout }: { role: Role; onClose: () => void; onLogout: () => void }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [recent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));

    const commands = useMemo<Command[]>(() => {
        const go = (href: string) => () => router.push(href);
        const intent = (href: string, name: string) => () => {
            router.push(`${href}?intent=${name}`);
            // Kalau udah di halaman itu, halaman nggak di-mount ulang: kabari lewat event.
            setTimeout(() => fireIntent(name), 50);
        };
        const pages: Command[] = NAV[role].map(n => ({
            id: `page:${n.href}`, title: n.name, subtitle: n.description, group: "Halaman", icon: n.icon, keywords: n.keywords, run: go(n.href),
        }));
        const actions: Command[] = role === "admin"
            ? [
                { id: "act:new-merchant", title: "Tambah merchant", subtitle: "Daftarkan klien baru", group: "Aksi", icon: Plus, keywords: "buat merchant baru", run: intent("/dashboard/merchants", "new-merchant") },
                { id: "act:new-gateway", title: "Tambah gateway", subtitle: "Hubungkan payment gateway baru", group: "Aksi", icon: Plus, keywords: "buat pg baru", run: intent("/dashboard/gateways", "new-gateway") },
            ]
            : [];
        actions.push({ id: "act:logout", title: "Keluar", subtitle: "Logout dari dashboard", group: "Aksi", icon: LogOut, keywords: "logout sign out", run: onLogout });
        return [...pages, ...actions];
    }, [role, router, onLogout]);

    const results = useMemo(() => {
        const q = query.trim();
        if (q) return commands.filter(c => matches(c, q));
        // Belum ngetik: tampilkan yang terakhir dibuka dulu, lalu semua.
        const recents = recent
            .map(id => commands.find(c => c.id === id))
            .filter((c): c is Command => !!c)
            .map(c => ({ ...c, group: "Terakhir dibuka" as const, id: `recent:${c.id}` }));
        return [...recents, ...commands];
    }, [commands, query, recent]);

    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const run = (c: Command) => {
        pushRecent(c.id.replace(/^recent:/, ""));
        onClose();
        c.run();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(i => (results.length ? (i + 1) % results.length : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(i => (results.length ? (i - 1 + results.length) % results.length : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[active]) run(results[active]);
        } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        }
    };

    let lastGroup = "";
    return (
        <div className="modal-backdrop fixed inset-0 z-[60] bg-slate-950/30 backdrop-blur-[2px] flex items-start justify-center p-3 pt-[12vh]" onClick={onClose}>
            <div
                className="modal-panel w-full max-w-xl bg-white rounded-2xl shadow-pop border border-slate-200/80 overflow-hidden"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
            >
                <div className="flex items-center gap-3 px-4 border-b border-slate-100">
                    <Search size={18} className="text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setActive(0); }}
                        onKeyDown={onKeyDown}
                        placeholder="Cari halaman atau aksi…"
                        className="flex-1 h-14 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 outline-none"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="palette-list"
                        aria-activedescendant={results[active] ? `cmd-${active}` : undefined}
                    />
                    <kbd>Esc</kbd>
                </div>

                <div ref={listRef} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
                    {results.length === 0 && (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm font-medium text-slate-900">Nggak ada yang cocok sama “{query}”</p>
                            <p className="text-xs text-slate-500 mt-1">Coba kata lain, mis. “transaksi”, “gateway”, atau “api key”.</p>
                        </div>
                    )}
                    {results.map((c, i) => {
                        const header = c.group !== lastGroup ? c.group : null;
                        lastGroup = c.group;
                        const Icon = c.group === "Terakhir dibuka" ? Clock : c.icon;
                        const on = i === active;
                        return (
                            <div key={c.id}>
                                {header && <div className="px-3 pt-3 pb-1.5 text-[11px] font-medium text-slate-400">{header}</div>}
                                <button
                                    id={`cmd-${i}`}
                                    data-index={i}
                                    role="option"
                                    aria-selected={on}
                                    onMouseMove={() => setActive(i)}
                                    onClick={() => run(c)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${on ? "bg-slate-100" : ""}`}
                                >
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-white text-slate-900 shadow-soft" : "bg-slate-100 text-slate-500"}`}>
                                        <Icon size={15} />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-slate-900 truncate">{c.title}</span>
                                        {c.subtitle && <span className="block text-xs text-slate-500 truncate">{c.subtitle}</span>}
                                    </span>
                                    {on && <ArrowRight size={14} className="text-slate-400 shrink-0" />}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5"><kbd>↑</kbd><kbd>↓</kbd> pilih</span>
                    <span className="flex items-center gap-1.5"><kbd><CornerDownLeft size={10} className="inline" /></kbd> buka</span>
                    <span className="flex items-center gap-1.5 ml-auto"><kbd>/</kbd> atau <kbd>⌘K</kbd> buka palette</span>
                </div>
            </div>
        </div>
    );
}
