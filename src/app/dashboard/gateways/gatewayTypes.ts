// Tipe & helper bersama buat halaman Gateways.

// action = endpoint ini dipanggil otomatis buat apa. '' = endpoint lain (cuma disimpan & bisa dites).
export type EndpointAction = '' | 'charge' | 'status' | 'channels';
export type ChannelMethod = '' | 'va' | 'qris' | 'ewallet' | 'cstore';

export type Endpoint = {
    uid: string; // cuma buat key React, nggak dikirim ke backend
    name: string;
    action: EndpointAction;
    channel_method: ChannelMethod;
    http_method: 'GET' | 'POST';
    path: string;
    request_template: string;
    response_mapping: string;
    is_active: boolean;
};

export type GatewayRecord = {
    id: string;
    name: string;
    base_url: string;
    auth_type: string;
    custom_auth_header?: string;
    merchant_code?: string;
    webhook_mapping?: string;
    webhook_secret?: string;
    webhook_validation_type?: string;
    channel_mapping?: string;
    is_active?: boolean;
    priority?: number;
    endpoints?: Partial<Endpoint>[] | null;
    // format lama (1 endpoint per gateway), dipakai kalau endpoints masih kosong
    charge_endpoint?: string;
    request_template?: string;
    response_mapping?: string;
};

export const CHANNEL_METHODS: { value: ChannelMethod; label: string }[] = [
    { value: '', label: 'Semua channel' },
    { value: 'va', label: 'Virtual Account' },
    { value: 'qris', label: 'QRIS' },
    { value: 'ewallet', label: 'E-Wallet' },
    { value: 'cstore', label: 'Retail (minimarket)' },
];

const ROLE_NAME: Record<Exclude<EndpointAction, ''>, string> = {
    charge: 'Buat Transaksi',
    status: 'Cek Status',
    channels: 'Daftar Channel',
};

// Nama endpoint yang dipakai otomatis dibikin dari perannya, mis. "Buat Transaksi (QRIS)".
export const autoEndpointName = (ep: Pick<Endpoint, 'action' | 'channel_method' | 'name'>) => {
    if (!ep.action) return ep.name.trim();
    const method = CHANNEL_METHODS.find(m => m.value === ep.channel_method && m.value !== '');
    return method && ep.action !== 'channels' ? `${ROLE_NAME[ep.action]} (${method.label})` : ROLE_NAME[ep.action];
};

let uidCounter = 0;
export const newUid = () => `ep-${Date.now()}-${uidCounter++}`;

export const emptyEndpoint = (action: EndpointAction, channel_method: ChannelMethod = ''): Endpoint => ({
    uid: newUid(),
    name: '',
    action,
    channel_method,
    http_method: action === 'charge' ? 'POST' : 'GET',
    path: '',
    request_template: action === 'charge' ? '{}' : '',
    response_mapping: '{}',
    is_active: true,
});

export const endpointsFromGateway = (gw: GatewayRecord): Endpoint[] => {
    if (Array.isArray(gw.endpoints) && gw.endpoints.length > 0) {
        return gw.endpoints.map(ep => ({
            uid: newUid(),
            name: ep.name || '',
            action: ep.action || '',
            channel_method: ep.channel_method || '',
            http_method: ep.http_method || 'POST',
            path: ep.path || '',
            request_template: ep.request_template || '',
            response_mapping: ep.response_mapping || '',
            is_active: ep.is_active !== false,
        }));
    }
    if (gw.charge_endpoint) {
        return [{
            ...emptyEndpoint('charge'),
            path: gw.charge_endpoint,
            request_template: gw.request_template || '{}',
            response_mapping: gw.response_mapping || '{}',
        }];
    }
    return [];
};

// ---- Auth type: field kredensial yang muncul tergantung pilihan ----

type CredField = { label: string; hint?: string };
export type AuthConfig = {
    value: string;
    label: string;
    description: string;
    serverKey?: CredField;
    privateKey?: CredField;
    customHeader?: boolean;
    merchantCode: CredField; // selalu muncul; bisa dipakai di template lewat {{merchant_code}}
};

const MERCHANT_CODE_OPTIONAL: CredField = { label: 'Merchant ID / Kode Merchant (opsional)', hint: 'Bisa dipakai di template lewat {{merchant_code}}.' };

export const AUTH_TYPES: AuthConfig[] = [
    { value: 'NONE', label: 'Tanpa autentikasi', description: 'Request dikirim tanpa header auth.', merchantCode: MERCHANT_CODE_OPTIONAL },
    {
        value: 'BEARER_TOKEN', label: 'Bearer Token', description: 'Header Authorization: Bearer <API Key>. Paling umum.',
        serverKey: { label: 'API Key / Token' }, merchantCode: MERCHANT_CODE_OPTIONAL,
    },
    {
        value: 'BASIC_AUTH', label: 'Basic Auth', description: 'API Key dikirim sebagai username Basic Auth, password kosong (mis. Midtrans, Xendit).',
        serverKey: { label: 'API Key / Server Key' }, merchantCode: MERCHANT_CODE_OPTIONAL,
    },
    {
        value: 'CUSTOM_HEADER', label: 'Header custom', description: 'API Key dikirim di header dengan nama yang lu tentuin.',
        serverKey: { label: 'Nilai header (API Key)' }, customHeader: true, merchantCode: MERCHANT_CODE_OPTIONAL,
    },
    {
        value: 'TRIPAY_HMAC', label: 'Signature Tripay', description: 'Bearer API Key + signature HMAC otomatis di endpoint Buat Transaksi. Callback diverifikasi pakai Private Key.',
        serverKey: { label: 'API Key' }, privateKey: { label: 'Private Key' }, merchantCode: { label: 'Kode Merchant' },
    },
    {
        value: 'IPAYMU_V2', label: 'Signature iPaymu v2', description: 'Header va, signature & timestamp dibikin otomatis.',
        privateKey: { label: 'API Key' }, merchantCode: { label: 'VA (nomor virtual account iPaymu)' },
    },
];

export const authConfig = (value: string) => AUTH_TYPES.find(a => a.value === value) || AUTH_TYPES[0];

// ---- Path JSON ala backend (gjson sederhana): "data.reference", "data.items.0.code", fallback "a|b" ----

export const getPath = (obj: unknown, paths: string): unknown => {
    for (const p of paths.split('|').map(s => s.trim()).filter(Boolean)) {
        let cur: unknown = obj;
        for (const part of p.split('.')) {
            if (cur !== null && typeof cur === 'object') cur = (cur as Record<string, unknown>)[part];
            else { cur = undefined; break; }
        }
        if (cur !== undefined && cur !== null && cur !== '') return cur;
    }
    return undefined;
};

type Leaf = { path: string; norm: string; key: string; depth: number; inArray: boolean };

// Nama field dibandingin tanpa peduli gaya penulisan: TransactionId = transaction_id = transactionId.
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, '');

// Semua path ke nilai yang ada isinya. Array cuma dibuka elemen pertamanya (mis. va_numbers.0.va_number).
const leaves = (obj: unknown, prefix = '', inArray = false): Leaf[] => {
    if (Array.isArray(obj)) return obj.length > 0 ? leaves(obj[0], prefix ? `${prefix}.0` : '0', true) : [];
    if (obj === null || typeof obj !== 'object') return [];
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object') return leaves(value, path, inArray);
        if (value === null || value === '') return [];
        const segs = path.split('.').filter(p => !/^\d+$/.test(p));
        return [{ path, norm: normName(segs.join('.')), key: normName(key), depth: segs.length, inArray }];
    });
};

// Kalau ada beberapa yang cocok: yang di luar array menang, lalu yang di dalam "data"/"result"
// (field pembungkus kayak "Status": 200 di level atas kalah sama "Data.Status"), lalu yang paling dangkal.
const PAYLOAD_KEYS = ['data', 'result', 'response', 'payload'];
const rank = (l: Leaf) => [l.inArray ? 1 : 0, PAYLOAD_KEYS.includes(l.norm.split('.')[0]) ? 0 : 1, l.depth];
const better = (a: Leaf, b: Leaf) => {
    const ra = rank(a), rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
};

// Nyari path yang cocok sama nama-nama umum (dicocokin ke ujung path dulu, lalu ke nama key terakhir).
export const guessPath = (obj: unknown, candidates: string[], all = false): string => {
    const ls = leaves(obj);
    const found: string[] = [];
    for (const c of candidates) {
        const nc = normName(c);
        const byPath = ls.filter(l => l.norm === nc || l.norm.endsWith(`.${nc}`));
        const hits = (byPath.length ? byPath : ls.filter(l => l.key === nc)).sort(better);
        const hit = hits.find(h => !found.includes(h.path));
        if (hit) {
            if (!all) return hit.path;
            found.push(hit.path);
        }
    }
    return found.join('|');
};

// Path array-of-object pertama (buat daftar channel).
export const findListPath = (obj: unknown, prefix = ''): string | null => {
    if (Array.isArray(obj)) return obj.length > 0 && typeof obj[0] === 'object' ? prefix : null;
    if (obj === null || typeof obj !== 'object') return null;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const found = findListPath(value, prefix ? `${prefix}.${key}` : key);
        if (found !== null) return found;
    }
    return null;
};

export const parseJsonObject = (raw: string): Record<string, unknown> => {
    try {
        const v = JSON.parse(raw || '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
        return {};
    }
};

// Semua lokasi field di contoh response (buat dipilih di CMS). Array cuma dibuka elemen pertamanya (index 0).
export const allPaths = (obj: unknown, prefix = '', out: { path: string; value: unknown }[] = []) => {
    if (out.length >= 300) return out;
    if (Array.isArray(obj)) {
        if (obj.length > 0) allPaths(obj[0], prefix ? `${prefix}.0` : '0', out);
        return out;
    }
    if (obj !== null && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            allPaths(value, prefix ? `${prefix}.${key}` : key, out);
        }
        return out;
    }
    if (prefix) out.push({ path: prefix, value: obj });
    return out;
};
