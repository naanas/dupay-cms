// Menu dashboard per role. Dipakai navbar, tab bar HP & command palette.

import {
    Activity, BookOpen, CreditCard, LayoutDashboard, Plug, UserCog, Users, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "./session";

export type NavItem = {
    name: string;
    short?: string; // label pendek buat tab bar HP
    href: string;
    icon: LucideIcon;
    description: string;
    keywords?: string;
    tab?: boolean; // tampil di tab bar bawah (HP)
    menu?: boolean; // cuma di menu akun, bukan di navbar utama
};

export const NAV: Record<Role, NavItem[]> = {
    admin: [
        { name: "Merchants", href: "/dashboard/merchants", icon: Users, description: "Kelola merchant, API key & akun login", keywords: "klien toko api key", tab: true },
        { name: "Gateways", href: "/dashboard/gateways", icon: CreditCard, description: "Koneksi PG, endpoint, channel & routing", keywords: "tripay ipaymu pg channel routing", tab: true },
        { name: "Transaksi", short: "Transaksi", href: "/dashboard/transactions", icon: Activity, description: "Monitor semua transaksi & cek status ke PG", keywords: "transactions order status sync", tab: true },
        { name: "Dokumentasi", short: "Docs", href: "/dashboard/docs", icon: BookOpen, description: "Panduan integrasi API merchant", keywords: "docs api signature webhook", tab: true },
        { name: "Akun", href: "/dashboard/account", icon: UserCog, description: "Ganti password", keywords: "password profil", menu: true },
    ],
    merchant: [
        { name: "Ringkasan", href: "/dashboard/overview", icon: LayoutDashboard, description: "Ringkasan transaksi & status integrasi", keywords: "overview dashboard home", tab: true },
        { name: "Transaksi", href: "/dashboard/my-transactions", icon: Activity, description: "Daftar transaksi toko & cek status", keywords: "transactions order status", tab: true },
        { name: "Metode Bayar", short: "Metode", href: "/dashboard/payment-methods", icon: Wallet, description: "Metode bayar yang bisa dipakai customer", keywords: "channel qris va ewallet", tab: true },
        { name: "Integrasi API", short: "Integrasi", href: "/dashboard/integration", icon: Plug, description: "API key, secret key & webhook URL", keywords: "api key secret webhook ip", tab: true },
        { name: "Dokumentasi", href: "/dashboard/docs", icon: BookOpen, description: "Panduan integrasi API", keywords: "docs api signature webhook" },
        { name: "Akun", href: "/dashboard/account", icon: UserCog, description: "Ganti password", keywords: "password profil", menu: true },
    ],
};

export const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

// ---- Aksi dari command palette ----
// Palette pindah ke `${href}?intent=<nama>` lalu ngirim event. Halaman tujuan cek consumeIntentFromURL
// pas dibuka + onIntent pas udah di halaman itu (dengar event).

const INTENT_EVENT = "dupay:intent";

export const fireIntent = (name: string) => window.dispatchEvent(new CustomEvent(INTENT_EVENT, { detail: name }));

export function consumeIntentFromURL(name: string): boolean {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    if (url.searchParams.get("intent") !== name) return false;
    url.searchParams.delete("intent");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return true;
}

export function onIntent(name: string, handler: () => void): () => void {
    const listener = (e: Event) => {
        if ((e as CustomEvent).detail === name) {
            consumeIntentFromURL(name);
            handler();
        }
    };
    window.addEventListener(INTENT_EVENT, listener);
    return () => window.removeEventListener(INTENT_EVENT, listener);
}
