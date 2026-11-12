"use client";

import { useEffect, useState } from "react";
import { api, API_BASE } from "../../../lib/api";
import { useSessionUser } from "../../../lib/session";
import { Skeleton } from "../../../components/ui";
import {
    ShieldCheck, Key, AlertTriangle, Copy, Check, CreditCard,
    Webhook, ListChecks, Workflow, BookOpen,
} from "lucide-react";

const V1 = `${API_BASE.replace(/\/$/, "")}/v1`;

type Channel = {
    code?: string; label?: string; group?: string;
    min_amount?: number; max_amount?: number; fee_flat?: number; fee_percent?: number;
};

const rupiah = (n?: number) => (n ? `Rp${n.toLocaleString("id-ID")}` : "-");
const fee = (ch: Channel) => [ch.fee_flat ? rupiah(ch.fee_flat) : "", ch.fee_percent ? `${ch.fee_percent}%` : ""].filter(Boolean).join(" + ") || "-";

const SECTIONS = [
    { id: "alur", label: "Alur" },
    { id: "kredensial", label: "Kredensial" },
    { id: "signature", label: "Signature" },
    { id: "metode", label: "Metode bayar" },
    { id: "endpoint", label: "Endpoint" },
    { id: "webhook", label: "Webhook" },
    { id: "status", label: "Status & error" },
];

export default function DocsPage() {
    // Sama persis dengan yang diterima merchant dari GET /v1/channels.
    const [methods, setMethods] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useSessionUser();
    const isAdmin = user?.role === "admin";

    useEffect(() => {
        api.fetchPublic("/channels")
            .then(res => setMethods(Array.isArray(res?.data) ? res.data : []))
            .catch(err => console.error("Gagal load metode bayar", err))
            .finally(() => setLoading(false));
    }, []);

    const sample = methods[0]?.code || "bri";

    return (
        <div className="max-w-4xl mx-auto space-y-14 animate-in pb-32 text-left">

            {/* HERO */}
            <div className="space-y-4 border-b border-slate-200 pb-8">
                <div className="flex items-center gap-2 text-brand-600 text-xs font-bold uppercase tracking-widest">
                    <BookOpen size={14} /> Dokumentasi API Merchant
                </div>
                <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">Integrasi Dupay</h1>
                <p className="text-lg text-slate-500 leading-relaxed">
                    Satu API buat semua metode bayar. Merchant cukup kirim <strong>kode metode bayar</strong> (mis. <code>{sample}</code>),
                    Dupay yang milih payment gateway, bikin tagihan, & ngabarin hasilnya lewat webhook.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">Base URL:</span>
                    <InlineCopy text={V1} />
                </div>
                <nav className="flex flex-wrap gap-2 pt-2">
                    {SECTIONS.map(s => (
                        <a key={s.id} href={`#${s.id}`} className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
                            {s.label}
                        </a>
                    ))}
                </nav>
            </div>

            {/* ALUR */}
            <Section id="alur" icon={<Workflow size={20} />} title="Alur integrasi">
                <ol className="space-y-3">
                    {[
                        ["Tampilkan pilihan bayar", <>Panggil <Code>GET /v1/channels</Code>, render daftar metode bayar di halaman checkout.</>],
                        ["Bikin transaksi", <>Pas customer milih, backend lu panggil <Code>POST /v1/charge</Code> dengan <Code>payment_method</Code> = kode yang dipilih.</>],
                        ["Arahkan customer", <>Tampilkan <Code>payment_code</Code> (nomor VA / QR string) atau redirect ke <Code>checkout_url</Code> dari response.</>],
                        ["Terima hasil", <>Dupay ngirim webhook ke <Code>webhook_url</Code> merchant waktu status berubah. Kalau ragu, cek pakai <Code>GET /v1/charge/:id</Code> atau <Code>POST /v1/charge/:id/sync</Code>.</>],
                    ].map(([title, body], i) => (
                        <li key={i} className="flex gap-4">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                            <div>
                                <div className="font-bold text-slate-800">{title}</div>
                                <div className="text-sm text-slate-600 mt-0.5">{body}</div>
                            </div>
                        </li>
                    ))}
                </ol>
                <Note>
                    {isAdmin ? <>
                        Merchant <strong>nggak perlu tahu</strong> payment gateway yang dipakai. Dupay milih gateway aktif dengan prioritas tertinggi
                        yang punya metode bayar itu & nominalnya masuk batas min/max. Field <Code>gateway_name</Code> masih diterima buat maksa gateway tertentu, tapi opsional.
                    </> : <>
                        Lu cukup kirim <strong>kode metode bayar</strong>. Dupay yang ngurus jalur pembayarannya, jadi nggak ada setting tambahan di sisi toko.
                    </>}
                </Note>
            </Section>

            {/* KREDENSIAL */}
            <Section id="kredensial" icon={<Key size={20} />} title="Kredensial">
                <p>{isAdmin
                    ? <>Ambil dari menu <strong>Merchants</strong> di CMS, lalu kasih ke merchant (atau bikinin akun login biar merchant lihat sendiri):</>
                    : <>Ada di menu <strong>Integrasi API</strong>:</>}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card icon={<Key size={16} />} color="text-brand-600" title="API Key (pk_...)">
                        Identitas merchant. Dikirim di header <Code>X-API-KEY</Code>.
                    </Card>
                    <Card icon={<ShieldCheck size={16} />} color="text-red-500" title="Secret Key (sk_...)">
                        Buat bikin & ngecek signature. <strong>Jangan pernah</strong> dikirim lewat request atau ditaruh di frontend/aplikasi mobile.
                    </Card>
                </div>
                <p>Di menu yang sama {isAdmin ? "atur" : "lu bisa atur"} juga:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Webhook URL</strong>: alamat di server merchant yang nerima notifikasi status.</li>
                    <li><strong>Whitelisted IPs</strong> (opsional): kalau diisi, request dari IP lain ditolak <Code>403</Code>. Pisahkan pakai koma.</li>
                </ul>
            </Section>

            {/* SIGNATURE */}
            <Section id="signature" icon={<ShieldCheck size={20} />} title="Header & signature">
                <p>Semua endpoint <Code>/v1/charge</Code> wajib pakai header berikut:</p>
                <Table
                    head={["Header", "Isi"]}
                    rows={[
                        ["X-API-KEY", "API Key merchant"],
                        ["X-Timestamp", "Waktu sekarang, mis. Unix detik (1730000000). Bebas formatnya, asal sama persis dengan yang dipakai di signature."],
                        ["X-Signature", "HMAC-SHA256(raw_body + timestamp, secret_key), hex huruf kecil"],
                        ["X-Idempotency-Key", "Wajib di POST /v1/charge. ID unik per transaksi (mis. UUID). Request ulang dengan key yang sama balikin transaksi yang sama, nggak bikin tagihan dobel."],
                        ["Content-Type", "application/json"],
                    ]}
                    mono
                />
                <div className="p-5 bg-brand-50/60 border border-brand-100 rounded-2xl space-y-2">
                    <p className="font-mono text-sm text-brand-900">signature = hex( HMAC_SHA256( key = secret_key, data = raw_body + timestamp ) )</p>
                    <ul className="text-xs text-brand-800 list-disc pl-5 space-y-1">
                        <li><strong>raw_body</strong> = string JSON yang <em>persis</em> dikirim. Jangan di-stringify ulang setelah ditandatangani (spasi/urutan beda = signature salah).</li>
                        <li>Request tanpa body (<Code>GET</Code>, <Code>POST .../sync</Code>): raw_body = string kosong, jadi yang ditandatangani cuma timestamp.</li>
                    </ul>
                </div>
                <CodeTabs tabs={{
                    "Node.js": `const crypto = require("crypto");

const API_KEY = process.env.DUPAY_API_KEY;
const SECRET_KEY = process.env.DUPAY_SECRET_KEY;

async function dupay(method, path, payload) {
  const body = payload ? JSON.stringify(payload) : "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHmac("sha256", SECRET_KEY)
    .update(body + timestamp)
    .digest("hex");

  const res = await fetch("${V1}" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      ...(method === "POST" && payload ? { "X-Idempotency-Key": payload.order_id } : {}),
    },
    body: body || undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}`,
                    PHP: `<?php
function dupay($method, $path, $payload = null) {
    $body = $payload ? json_encode($payload) : "";
    $timestamp = (string) time();
    $signature = hash_hmac("sha256", $body . $timestamp, getenv("DUPAY_SECRET_KEY"));

    $headers = [
        "Content-Type: application/json",
        "X-API-KEY: " . getenv("DUPAY_API_KEY"),
        "X-Timestamp: " . $timestamp,
        "X-Signature: " . $signature,
    ];
    if ($method === "POST" && $payload) {
        $headers[] = "X-Idempotency-Key: " . $payload["order_id"];
    }

    $ch = curl_init("${V1}" . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $res = json_decode(curl_exec($ch), true);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status >= 400) throw new Exception($res["error"]);
    return $res["data"];
}`,
                    "cURL": `BODY='{"order_id":"INV-001","amount":50000,"currency":"IDR","payment_method":"${sample}"}'
TS=$(date +%s)
SIG=$(printf '%s%s' "$BODY" "$TS" | openssl dgst -sha256 -hmac "$DUPAY_SECRET_KEY" | sed 's/^.* //')

curl -X POST "${V1}/charge" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: $DUPAY_API_KEY" \\
  -H "X-Timestamp: $TS" \\
  -H "X-Signature: $SIG" \\
  -H "X-Idempotency-Key: INV-001" \\
  -d "$BODY"`,
                }} />
                <Note>
                    Pakai <Code>order_id</Code> sebagai idempotency key itu cara paling gampang. Kalau satu order bisa dibayar ulang pakai metode lain, bikin key baru per percobaan.
                </Note>
            </Section>

            {/* METODE BAYAR */}
            <Section id="metode" icon={<CreditCard size={20} />} title="Metode bayar yang tersedia">
                <p>
                    Ini isi <Code>GET /v1/channels</Code> saat ini. Kirim nilai di kolom <strong>Kode</strong> sebagai <Code>payment_method</Code>.
                    Daftarnya bisa berubah{isAdmin ? " (diatur di menu Payment Gateways)" : ""}, jadi sebaiknya ambil dari API, jangan di-hardcode.
                </p>
                {loading ? (
                    <div className="space-y-2" aria-busy>
                        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : methods.length === 0 ? (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        {isAdmin ? "Belum ada metode bayar aktif. Isi Daftar Channel di salah satu gateway aktif dulu." : "Belum ada metode bayar aktif. Hubungi admin Dupay."}
                    </div>
                ) : (
                    <Table
                        head={["Kode", "Nama", "Grup", "Min", "Maks", "Biaya"]}
                        rows={methods.map(m => [m.code!, m.label || "-", m.group || "-", rupiah(m.min_amount), rupiah(m.max_amount), fee(m)])}
                        monoFirst
                    />
                )}
            </Section>

            {/* ENDPOINT */}
            <Section id="endpoint" icon={<ListChecks size={20} />} title="Endpoint">
                <Endpoint
                    method="GET" path="/v1/channels" auth={false}
                    desc="Daftar metode bayar yang bisa dipakai. Publik (tanpa header), boleh dipanggil langsung dari browser."
                    response={`{
  "status": "success",
  "data": [
    {
      "code": "${sample}",
      "pg_code": "",
      "label": "${methods[0]?.label || "BRI Virtual Account"}",
      "method": "va",
      "group": "Virtual Account",
      "logo": "https://...",
      "min_amount": 10000,
      "max_amount": 50000000,
      "fee_flat": 4250,
      "active": true
    }
  ]
}`}
                />

                <Endpoint
                    method="POST" path="/v1/charge"
                    desc="Bikin transaksi baru. Dupay milih gateway, nerusin ke PG, lalu balikin instruksi bayar."
                    fields={[
                        ["order_id", "string", "wajib", "ID order di sistem merchant"],
                        ["amount", "number", "wajib", "Nominal dalam Rupiah, > 0"],
                        ["currency", "string", "wajib", "\"IDR\""],
                        ["payment_method", "string", "wajib", "Kode dari GET /v1/channels"],
                        ...(isAdmin ? [["gateway_name", "string", "opsional", "Maksa pakai gateway tertentu. Biasanya nggak perlu."]] : []),
                    ]}
                    request={`{
  "order_id": "INV-001",
  "amount": 50000,
  "currency": "IDR",
  "payment_method": "${sample}"
}`}
                    response={`{
  "status": "success",
  "message": "Charge routed successfully",
  "data": {
    "id": "8f3c...e21",           // ID transaksi Dupay, dipakai di /v1/charge/:id
    "order_id": "INV-001",
    "amount": 50000,
    "payment_method": "${sample}",
    "status": "PENDING",
    "pg_reference_id": "T12345...",
    "payment_code": "8808123456789",  // nomor VA / QR string, kalau ada
    "checkout_url": "https://...",    // halaman bayar PG, kalau ada
    "payment_deeplink": "",           // deeplink e-wallet, kalau ada
    "created_at": "2026-10-27T10:00:00Z"
  }
}`}
                    note="Simpan data.id. Field payment_code / checkout_url / payment_deeplink terisi tergantung metode bayar & PG-nya."
                />

                <Endpoint
                    method="GET" path="/v1/charge/:id"
                    desc="Ambil data & status transaksi yang tersimpan di Dupay. Nggak manggil PG."
                    response={`{
  "data": { "id": "8f3c...e21", "order_id": "INV-001", "status": "SUCCESS", ... }
}`}
                    note="Tanpa body, jadi signature = HMAC(timestamp)."
                />

                <Endpoint
                    method="POST" path="/v1/charge/:id/sync"
                    desc="Minta Dupay ngecek status langsung ke PG. Pakai kalau webhook telat/nggak nyampe. Kalau statusnya berubah, Dupay juga ngirim webhook ke merchant."
                    response={`{
  "data": { "id": "8f3c...e21", "status": "SUCCESS", ... },
  "pg_status": "PAID"   // status mentah dari PG
}`}
                    note="Tanpa body, jadi signature = HMAC(timestamp). Cuma bisa buat transaksi milik merchant itu sendiri."
                />
            </Section>

            {/* WEBHOOK */}
            <Section id="webhook" icon={<Webhook size={20} />} title="Webhook ke merchant">
                <p>
                    Waktu PG ngabarin pembayaran (atau hasil sync berubah), Dupay ngirim <Code>POST</Code> ke <strong>Webhook URL</strong> merchant:
                </p>
                <CodeBlock code={`POST https://toko-lu.com/webhook/dupay
Content-Type: application/json
X-Dupay-Signature: 5d41402abc4b2a76b9719d911017c592...

{
  "order_id": "INV-001",
  "amount": 50000,
  "status": "SUCCESS",
  "payment_method": "${sample}",
  "timestamp": 1730000000
}`} />
                <div className="p-5 bg-brand-50/60 border border-brand-100 rounded-2xl">
                    <p className="font-mono text-sm text-brand-900">X-Dupay-Signature = hex( HMAC_SHA256( key = secret_key, data = raw_body ) )</p>
                    <p className="text-xs text-brand-800 mt-2">Beda sama request ke Dupay: di sini <strong>tanpa timestamp</strong>, cuma raw body. Hitung dari body mentah sebelum di-parse.</p>
                </div>
                <CodeTabs tabs={{
                    "Node.js (Express)": `const crypto = require("crypto");

app.post("/webhook/dupay", express.raw({ type: "application/json" }), (req, res) => {
  const expected = crypto.createHmac("sha256", process.env.DUPAY_SECRET_KEY)
    .update(req.body) // Buffer mentah
    .digest("hex");
  const given = req.get("X-Dupay-Signature") || "";
  if (given.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return res.status(401).end();
  }

  const event = JSON.parse(req.body);
  // update order event.order_id -> event.status (cek dulu biar nggak diproses dua kali)
  res.json({ success: true });
});`,
                    PHP: `<?php
$raw = file_get_contents("php://input");
$expected = hash_hmac("sha256", $raw, getenv("DUPAY_SECRET_KEY"));
if (!hash_equals($expected, $_SERVER["HTTP_X_DUPAY_SIGNATURE"] ?? "")) {
    http_response_code(401);
    exit;
}

$event = json_decode($raw, true);
// update order $event["order_id"] -> $event["status"]
echo json_encode(["success" => true]);`,
                }} />
                <Note warn>
                    Webhook dikirim <strong>sekali</strong> (timeout 5 detik) dan belum ada retry otomatis. Kalau server merchant lagi down, pakai
                    <Code>POST /v1/charge/:id/sync</Code> buat order yang masih PENDING. Proses webhook secara idempotent: status yang sama bisa datang lebih dari sekali.
                </Note>
            </Section>

            {/* STATUS & ERROR */}
            <Section id="status" icon={<AlertTriangle size={20} />} title="Status & error">
                <Table
                    head={["Status", "Arti"]}
                    rows={[
                        ["PENDING", "Tagihan udah dibikin, nunggu customer bayar"],
                        ["SUCCESS", "Udah dibayar"],
                        ["FAILED", "Gagal / kedaluwarsa / dibatalkan"],
                        ["REFUNDED", "Dana dikembalikan"],
                    ]}
                    monoFirst
                />
                <p>Kalau gagal, response berisi <Code>{`{"error": "pesan"}`}</Code>:</p>
                <Table
                    head={["HTTP", "Penyebab umum"]}
                    rows={[
                        ["400", "Body nggak valid / field wajib kosong"],
                        ["401", "Header kurang, API Key salah / merchant nonaktif, atau signature salah"],
                        ["403", "IP server merchant belum masuk Whitelisted IPs"],
                        ["404", "Transaksi nggak ditemukan"],
                        ["500", "Transaksi gagal dibikin: metode bayar nggak tersedia, nominal di luar batas, X-Idempotency-Key kosong, atau ditolak PG"],
                    ]}
                    monoFirst
                />
            </Section>

            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex gap-4 items-start shadow-sm">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-1" size={24} />
                <div>
                    <h4 className="font-bold text-amber-900">Peringatan keamanan</h4>
                    <p className="text-amber-800 text-sm mt-1.5 leading-relaxed">
                        Bikin <strong>X-Signature</strong> & panggil <Code>/v1/charge</Code> cuma dari <strong>backend</strong> merchant. Jangan pernah
                        taruh <Code>Secret Key</Code> di browser atau aplikasi mobile. Satu-satunya endpoint yang aman dipanggil dari frontend adalah <Code>GET /v1/channels</Code>.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ---- Komponen kecil ----

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-6 space-y-4 text-slate-600 text-sm leading-relaxed">
            <h2 className="flex items-center gap-2.5 text-2xl font-bold text-slate-800">
                <span className="text-brand-500">{icon}</span> {title}
            </h2>
            {children}
        </section>
    );
}

function Code({ children }: { children: React.ReactNode }) {
    return <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[0.85em] font-mono">{children}</code>;
}

function Note({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl border text-sm ${warn ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            {children}
        </div>
    );
}

function Card({ icon, color, title, children }: { icon: React.ReactNode; color: string; title: string; children: React.ReactNode }) {
    return (
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className={`flex items-center gap-2 mb-2 font-bold ${color}`}>{icon} {title}</div>
            <p className="text-xs text-slate-500 leading-relaxed">{children}</p>
        </div>
    );
}

function Table({ head, rows, mono, monoFirst }: { head: string[]; rows: string[][]; mono?: boolean; monoFirst?: boolean }) {
    return (
        <div className="table-wrap bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="data-table text-sm text-left">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        {head.map(h => <th key={h} className="p-3 font-bold uppercase text-[10px] tracking-wider">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((cell, j) => (
                                <td key={j} data-label={j === 0 ? undefined : head[j]} className={`p-3 align-top ${j === 0 && (mono || monoFirst) ? "font-mono text-xs font-bold text-brand-600" : "text-slate-600"}`}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function useCopy() {
    const [copied, setCopied] = useState(false);
    const copy = (text: string) => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return { copied, copy };
}

function InlineCopy({ text }: { text: string }) {
    const { copied, copy } = useCopy();
    return (
        <button onClick={() => copy(text)} className="inline-flex items-center gap-2 font-mono text-xs bg-slate-900 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-slate-800">
            {text} {copied ? <Check size={12} /> : <Copy size={12} className="text-slate-400" />}
        </button>
    );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
    const { copied, copy } = useCopy();
    return (
        <div className="bg-slate-900 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label || ""}</span>
                <button onClick={() => copy(code)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white">
                    {copied ? <><Check size={12} /> Disalin</> : <><Copy size={12} /> Salin</>}
                </button>
            </div>
            <pre className="p-4 text-brand-200 font-mono text-xs leading-relaxed overflow-x-auto">{code}</pre>
        </div>
    );
}

function CodeTabs({ tabs }: { tabs: Record<string, string> }) {
    const names = Object.keys(tabs);
    const [active, setActive] = useState(names[0]);
    return (
        <div className="space-y-0">
            <div className="flex gap-1">
                {names.map(n => (
                    <button key={n} onClick={() => setActive(n)}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-bold ${active === n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        {n}
                    </button>
                ))}
            </div>
            <CodeBlock code={tabs[active]} />
        </div>
    );
}

const METHOD_STYLE: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700",
    POST: "bg-brand-100 text-brand-700",
};

function Endpoint({ method, path, desc, auth = true, fields, request, response, note }: {
    method: "GET" | "POST"; path: string; desc: string; auth?: boolean;
    fields?: string[][]; request?: string; response: string; note?: string;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${METHOD_STYLE[method]}`}>{method}</span>
                <code className="font-mono font-bold text-slate-900 break-all">{path}</code>
                <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full border ${auth ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {auth ? "Wajib signature" : "Publik"}
                </span>
            </div>
            <p className="text-slate-600">{desc}</p>
            {fields && (
                <Table head={["Field", "Tipe", "", "Keterangan"]} rows={fields} monoFirst />
            )}
            <div className={`grid gap-4 ${request ? "md:grid-cols-2" : ""}`}>
                {request && <CodeBlock label="Request body" code={request} />}
                <CodeBlock label="Response 200" code={response} />
            </div>
            {note && <p className="text-xs text-slate-500">{note}</p>}
        </div>
    );
}
