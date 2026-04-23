const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const BASE_URL = `${API_BASE.replace(/\/$/, '')}/v1`;

export const api = {
    login: async (username: string, password: string): Promise<any> => {
        const res = await fetch(`${BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    fetchCMS: async (endpoint: string, method: string = 'GET', body: any = null): Promise<any> => {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('dupay_token');
        if (!token) throw new Error('No token found');

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${BASE_URL}/cms${endpoint}`, options);
        const raw = await res.text();
        let data: any = null;
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch {
                if (!res.ok) throw new Error(raw);
                throw new Error('Response API bukan JSON yang valid');
            }
        }
        if (!res.ok) throw new Error(data?.error || raw || 'Terjadi kesalahan API');
        return data;
    }
};