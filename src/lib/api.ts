import { clearSession, getToken, SessionUser } from './session';

// Response API bentuknya beda-beda per endpoint; tiap halaman yang ngetik sendiri.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiData = any;

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const BASE_URL = `${API_BASE.replace(/\/$/, '')}/v1`;

// Request ke API yang butuh login (token JWT). Token habis/invalid -> balik ke halaman login.
const authed = async (path: string, method: string = 'GET', body: unknown = null): Promise<ApiData> => {
    if (typeof window === 'undefined') return;
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        throw new Error('Silakan login dulu');
    }

    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    const raw = await res.text();
    let data: ApiData = null;
    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            if (!res.ok) throw new Error(raw);
            throw new Error('Response API bukan JSON yang valid');
        }
    }
    if (res.status === 401) {
        clearSession();
        window.location.href = '/login';
    }
    if (!res.ok) throw new Error(data?.error || raw || 'Terjadi kesalahan API');
    return data;
};

export const api = {
    login: async (username: string, password: string): Promise<{ token: string; user: SessionUser }> => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Login gagal');
        return data;
    },

    register: async (body: { business_name: string; email: string; pic_name: string; phone: string; username: string; password: string }): Promise<{ message: string }> => {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal');
        return data;
    },

    changePassword: (old_password: string, new_password: string) =>
        authed('/auth/password', 'PUT', { old_password, new_password }),

    // Khusus admin
    fetchCMS: (endpoint: string, method: string = 'GET', body: unknown = null) => authed(`/cms${endpoint}`, method, body),

    // Khusus merchant yang login
    fetchMerchant: (endpoint: string, method: string = 'GET', body: unknown = null) => authed(`/merchant${endpoint}`, method, body),

    // Endpoint publik (tanpa login), mis. daftar metode bayar
    fetchPublic: async (endpoint: string): Promise<ApiData> => {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Terjadi kesalahan API');
        return data;
    },
};
