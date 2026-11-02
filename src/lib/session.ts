// Sesi login CMS (admin / merchant), disimpan di localStorage.

import { useMemo, useSyncExternalStore } from 'react';

export type Role = 'admin' | 'merchant';

export type SessionUser = {
    username: string;
    role: Role;
    merchant_id?: string;
    merchant_name?: string;
};

const TOKEN_KEY = 'dupay_token';
const USER_KEY = 'dupay_user';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));

export const getSessionUser = (): SessionUser | null => {
    if (typeof window === 'undefined' || !getToken()) return null;
    try {
        const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        if (user && (user.role === 'admin' || user.role === 'merchant')) return user;
    } catch { /* rusak, anggap belum login */ }
    return null;
};

export const saveSession = (token: string, user: SessionUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

// Halaman pertama setelah login & menu yang boleh dibuka per role.
export const HOME_BY_ROLE: Record<Role, string> = {
    admin: '/dashboard/merchants',
    merchant: '/dashboard/overview',
};

export const ROUTES_BY_ROLE: Record<Role, string[]> = {
    admin: ['/dashboard/merchants', '/dashboard/gateways', '/dashboard/transactions', '/dashboard/docs', '/dashboard/account'],
    merchant: ['/dashboard/overview', '/dashboard/my-transactions', '/dashboard/payment-methods', '/dashboard/integration', '/dashboard/docs', '/dashboard/account'],
};

export const canOpen = (role: Role, pathname: string) =>
    ROUTES_BY_ROLE[role].some(p => pathname === p || pathname.startsWith(p + '/'));

// Hook baca sesi dari localStorage tanpa hydration mismatch (server selalu dapat null).
const noopSubscribe = () => () => {};
const sessionSnapshot = () => `${getToken() || ''}|${localStorage.getItem(USER_KEY) || ''}`;

export const useSessionUser = (): SessionUser | null | undefined => {
    const snapshot = useSyncExternalStore(noopSubscribe, sessionSnapshot, () => null);
    return useMemo(() => (snapshot === null ? undefined : getSessionUser()), [snapshot]);
};
