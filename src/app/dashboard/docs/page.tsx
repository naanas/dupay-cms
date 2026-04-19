"use client";

import {
    Terminal, ShieldCheck, Key, ListChecks,
    ArrowRight, Info, AlertTriangle, Code2
} from "lucide-react";

export default function DocsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-700 pb-32 text-left">

            {/* HERO SECTION */}
            <div className="space-y-4 border-b border-slate-200 pb-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Integration Roadmap</h1>
                <p className="text-lg text-slate-500 leading-relaxed">
                    Gunakan panduan ini untuk menghubungkan aplikasi Anda dengan infrastruktur pembayaran Dupay dalam hitungan menit.
                </p>
            </div>

            {/* STEP 1 */}
            <section className="relative pl-12 border-l-2 border-blue-500">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">1</div>
                <h2 className="text-2xl font-bold text-slate-800">Dapatkan Kredensial</h2>
                <p className="text-slate-600 mt-2">Masuk ke menu <strong>Merchants</strong>, salin dua kunci rahasia Anda:</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold">
                            <Key size={16} /> API Key (pk_...)
                        </div>
                        <p className="text-xs text-slate-500">Identitas Merchant. Masukkan ke header <code>X-API-KEY</code>.</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-red-500 font-bold">
                            <ShieldCheck size={16} /> Secret Key (sk_...)
                        </div>
                        <p className="text-xs text-slate-500">Kunci Enkripsi. <strong>Jangan pernah</strong> dikirim lewat API.</p>
                    </div>
                </div>
            </section>

            {/* STEP 2 */}
            <section className="relative pl-12 border-l-2 border-slate-200">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h2 className="text-2xl font-bold text-slate-800">Persiapkan Payload & Timestamp</h2>
                <p className="text-slate-600 mt-2">Setiap request wajib menyertakan body JSON dan timestamp waktu saat ini.</p>
                <div className="mt-4 bg-slate-900 rounded-2xl p-6 overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-400 mb-3 text-xs font-bold uppercase tracking-widest">
                        <Code2 size={14} /> Example JSON Body
                    </div>
                    <pre className="text-blue-400 font-mono text-sm leading-relaxed">
                        {`{
  "order_id": "INV-202404-001",
  "amount": 150000,
  "payment_method": "VIRTUAL_ACCOUNT",
  "gateway_name": "Midtrans"
}`}
                    </pre>
                </div>
            </section>

            {/* STEP 3 */}
            <section className="relative pl-12 border-l-2 border-blue-500">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">3</div>
                <h2 className="text-2xl font-bold text-slate-800">Generate Digital Signature (HMAC)</h2>
                <p className="text-slate-600 mt-2">Ini adalah bagian terpenting untuk validasi keamanan.</p>

                <div className="mt-6 p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-4">
                    <h4 className="font-bold text-blue-900">Aturan Penggabungan String:</h4>
                    <p className="text-blue-800 text-sm italic bg-white p-3 rounded-lg border border-blue-100 font-mono inline-block">
                        StringSignature = JSON_BODY + TIMESTAMP
                    </p>
                    <p className="text-blue-700 text-xs">
                        Gunakan algoritma <strong>HMAC-SHA256</strong> pada string di atas dengan <code>Secret Key</code> Anda sebagai kuncinya. Output harus dalam format <strong>Hexadecimal</strong>.
                    </p>
                </div>
            </section>

            {/* STEP 4 */}
            <section className="relative pl-12 border-l-2 border-slate-200 pb-10">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h2 className="text-2xl font-bold text-slate-800">Kirim Request</h2>
                <p className="text-slate-600 mt-2">Tembak API dengan 4 Header wajib.</p>

                <div className="mt-6 space-y-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-slate-400 border-b">
                                <th className="pb-2 text-left">Header Key</th>
                                <th className="pb-2 text-left">Value Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr><td className="py-3 font-mono text-blue-600">X-API-KEY</td><td className="py-3">Kunci Publik Merchant Anda</td></tr>
                            <tr><td className="py-3 font-mono text-blue-600">X-Timestamp</td><td className="py-3">Format Unix atau ISO String</td></tr>
                            <tr><td className="py-3 font-mono text-blue-600">X-Signature</td><td className="py-3">Hasil HMAC-SHA256 (Step 3)</td></tr>
                            <tr><td className="py-3 font-mono text-blue-600">X-Idempotency-Key</td><td className="py-3">UUID Unik (Mencegah double charge)</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* FINAL ADVICE */}
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 items-start">
                <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
                <div>
                    <h4 className="font-bold text-amber-900">Peringatan Keamanan</h4>
                    <p className="text-amber-800 text-sm mt-1 leading-relaxed">
                        Pastikan proses pembuatan <strong>X-Signature</strong> dilakukan di <strong>Server-Side</strong> (Backend) aplikasi Anda. Jangan pernah mengekspos <code>Secret Key</code> di browser atau aplikasi mobile klien.
                    </p>
                </div>
            </div>
        </div>
    );
}