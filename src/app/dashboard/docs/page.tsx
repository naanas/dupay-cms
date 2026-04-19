"use client";

import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import {
    Terminal, ShieldCheck, Key, ListChecks,
    ArrowRight, Info, AlertTriangle, Code2,
    Server, CheckCircle2, CreditCard
} from "lucide-react";

export default function DocsPage() {
    const [gateways, setGateways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGateways = async () => {
            try {
                const data = await api.fetchCMS('/gateways');
                // Filter cuma nampilin gateway yang is_active = true
                setGateways(data.filter((gw: any) => gw.is_active));
            } catch (err) {
                console.error("Gagal load gateways", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGateways();
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-700 pb-32 text-left">

            {/* HERO SECTION */}
            <div className="space-y-4 border-b border-slate-200 pb-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Integration Roadmap</h1>
                <p className="text-lg text-slate-500 leading-relaxed">
                    Gunakan panduan ini untuk menghubungkan aplikasi Anda dengan infrastruktur pembayaran Dupay dalam hitungan menit.
                </p>
            </div>

            {/* DYNAMIC GATEWAYS SECTION (NEW!) */}
            <section className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Server size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="text-blue-400" size={28} />
                        <h2 className="text-2xl font-bold">Supported Payment Gateways</h2>
                    </div>
                    <p className="text-slate-400 text-sm mb-8 max-w-xl leading-relaxed">
                        Berikut adalah daftar Payment Gateway yang saat ini aktif dan bisa Anda gunakan. Pastikan Anda memasukkan nama persis seperti di bawah ini ke dalam field <code>gateway_name</code> di JSON Payload Anda.
                    </p>

                    {loading ? (
                        <div className="text-blue-400 animate-pulse font-mono text-sm">Menyinkronkan daftar gateway...</div>
                    ) : gateways.length === 0 ? (
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-slate-400 text-sm italic">
                            Belum ada Payment Gateway yang aktif saat ini.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gateways.map((gw) => (
                                <div key={gw.id} className="bg-slate-800/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{gw.name}</h3>
                                        <div className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 font-bold">
                                            <CheckCircle2 size={12} /> ACTIVE
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Gunakan di Payload:</span>
                                        <code className="block bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-300 text-xs font-mono select-all">
                                            "gateway_name": "{gw.name}"
                                        </code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* STEP 1: CREDENTIALS */}
            <section className="relative pl-12 border-l-2 border-blue-500">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">1</div>
                <h2 className="text-2xl font-bold text-slate-800">Dapatkan Kredensial</h2>
                <p className="text-slate-600 mt-2">Masuk ke menu <strong>Merchants</strong>, salin dua kunci rahasia Anda:</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold">
                            <Key size={16} /> API Key (pk_...)
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Identitas Publik Merchant Anda. Wajib disisipkan ke dalam header <code>X-API-KEY</code>.</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2 text-red-500 font-bold">
                            <ShieldCheck size={16} /> Secret Key (sk_...)
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Kunci Enkripsi (Private). <strong>Jangan pernah</strong> dikirim lewat API. Gunakan hanya untuk hashing.</p>
                    </div>
                </div>
            </section>

            {/* STEP 2: PAYLOAD */}
            <section className="relative pl-12 border-l-2 border-slate-200">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h2 className="text-2xl font-bold text-slate-800">Persiapkan Payload & Timestamp</h2>
                <p className="text-slate-600 mt-2">Setiap request wajib menyertakan body JSON dan timestamp waktu saat ini.</p>
                <div className="mt-4 bg-slate-900 rounded-2xl p-6 overflow-hidden shadow-inner">
                    <div className="flex items-center gap-2 text-slate-400 mb-3 text-xs font-bold uppercase tracking-widest">
                        <Code2 size={14} /> Example JSON Body
                    </div>
                    <pre className="text-blue-300 font-mono text-sm leading-relaxed overflow-x-auto">
                        {`{
  "order_id": "INV-202404-001",
  "amount": 150000,
  "currency": "IDR",
  "payment_method": "VIRTUAL_ACCOUNT",
  "gateway_name": "${gateways.length > 0 ? gateways[0].name : "NAMA_GATEWAY_DI_ATAS"}"
}`}
                    </pre>
                </div>
            </section>

            {/* STEP 3: HMAC */}
            <section className="relative pl-12 border-l-2 border-blue-500">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">3</div>
                <h2 className="text-2xl font-bold text-slate-800">Generate Digital Signature (HMAC)</h2>
                <p className="text-slate-600 mt-2">Ini adalah bagian terpenting untuk validasi keamanan.</p>

                <div className="mt-6 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <h4 className="font-bold text-blue-900">Aturan Penggabungan String:</h4>
                    <p className="text-blue-800 text-sm italic bg-white p-3 rounded-lg border border-blue-100 font-mono inline-block shadow-sm">
                        StringSignature = JSON_BODY + TIMESTAMP
                    </p>
                    <p className="text-blue-700 text-xs leading-relaxed">
                        Gunakan algoritma <strong>HMAC-SHA256</strong> pada string di atas dengan <code>Secret Key</code> Anda sebagai kuncinya. Output harus dalam format <strong>Hexadecimal huruf kecil</strong>.
                    </p>
                </div>
            </section>

            {/* STEP 4: SEND REQUEST */}
            <section className="relative pl-12 border-l-2 border-slate-200 pb-10">
                <div className="absolute -left-4 top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h2 className="text-2xl font-bold text-slate-800">Kirim Request</h2>
                <p className="text-slate-600 mt-2">Tembak API dengan 4 Header wajib.</p>

                <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Header Key</th>
                                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Value Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50 transition-colors"><td className="p-4 font-mono text-blue-600 text-xs font-bold">X-API-KEY</td><td className="p-4 text-slate-600">Kunci Publik Merchant Anda</td></tr>
                            <tr className="hover:bg-slate-50 transition-colors"><td className="p-4 font-mono text-blue-600 text-xs font-bold">X-Timestamp</td><td className="p-4 text-slate-600">Format Unix atau ISO String saat request dikirim</td></tr>
                            <tr className="hover:bg-slate-50 transition-colors"><td className="p-4 font-mono text-blue-600 text-xs font-bold">X-Signature</td><td className="p-4 text-slate-600">Hasil HMAC-SHA256 (Dari Step 3)</td></tr>
                            <tr className="hover:bg-slate-50 transition-colors"><td className="p-4 font-mono text-blue-600 text-xs font-bold">X-Idempotency-Key</td><td className="p-4 text-slate-600">UUID Unik (Mencegah double charge saat retry)</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* FINAL ADVICE */}
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex gap-4 items-start shadow-sm">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-1" size={24} />
                <div>
                    <h4 className="font-bold text-amber-900">Peringatan Keamanan</h4>
                    <p className="text-amber-800 text-sm mt-1.5 leading-relaxed">
                        Pastikan proses pembuatan <strong>X-Signature</strong> dilakukan secara eksklusif di <strong>Server-Side</strong> (Backend) aplikasi Anda. Jangan pernah mengekspos <code>Secret Key</code> di browser (Frontend/React/Vue) atau aplikasi mobile klien karena sangat rentan diretas.
                    </p>
                </div>
            </div>
        </div>
    );
}