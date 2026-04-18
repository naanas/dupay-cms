const BASE_URL = 'http://localhost:8080/v1';

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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan API');
        return data;
    }
};