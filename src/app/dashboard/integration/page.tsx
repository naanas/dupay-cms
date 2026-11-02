"use client";

import { useEffect, useState } from "react";
import { api, API_BASE, errorMessage } from "../../../lib/api";
import { CopyField, inputClass, PageHeader, Panel, PageSkeleton } from "../../../components/ui";
import { RotateCcw, Save } from "lucide-react";

type Profile = {
    name: string; email: string; phone: string; pic_name: string;
    api_key: string; secret_key: string; webhook_url: string; whitelisted_ips: string;
};

const V1 = `${API_BASE.replace(/\/$/, "")}/v1`;

export default function IntegrationPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState({ webhook_url: "", whitelisted_ips: "", pic_name: "", phone: "" });
    const [saving, setSaving] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    const apply = (p: Profile) => {
        setProfile(p);
        setForm({ webhook_url: p.webhook_url || "", whitelisted_ips: p.whitelisted_ips || "", pic_name: p.pic_name || "", phone: p.phone || "" });
    };

    useEffect(() => {
        api.fetchMerchant("/me").then(apply).catch(err => setNotice({ ok: false, text: errorMessage(err) }));
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setNotice(null);
        try {
            apply(await api.fetchMerchant("/me", "PUT", form));
            setNotice({ ok: true, text: "Pengaturan tersimpan." });
        } catch (err) {
            setNotice({ ok: false, text: errorMessage(err) });
        } finally {
            setSaving(false);
        }
    };

    const rotate = async () => {
        if (!confirm("Bikin Secret Key baru? Secret Key lama langsung nggak berlaku, jadi server toko lu harus langsung diganti ke yang baru.")) return;
        setRotating(true);
        setNotice(null);
        try {
            apply(await api.fetchMerchant("/me/rotate-secret", "POST"));
            setNotice({ ok: true, text: "Secret Key baru udah dibuat. Update di server toko lu sekarang." });
        } catch (err) {
            setNotice({ ok: false, text: errorMessage(err) });
        } finally {
            setRotating(false);
        }
    };

    if (!profile) {
        return notice
            ? <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">{notice.text}</div>
            : <PageSkeleton panels={2} />;
    }

    const dirty = form.webhook_url !== (profile.webhook_url || "") || form.whitelisted_ips !== (profile.whitelisted_ips || "")
        || form.pic_name !== (profile.pic_name || "") || form.phone !== (profile.phone || "");

    return (
        <div className="space-y-6 animate-in pb-20">
            <PageHeader title="Integrasi API" subtitle="Kunci API & pengaturan yang dipakai server toko lu buat konek ke Dupay." />

            {notice && (
                <div className={`p-3 rounded-xl border text-sm ${notice.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>{notice.text}</div>
            )}

            <Panel title="Kunci API" subtitle="Simpan di server (env variable). Jangan taruh Secret Key di frontend atau aplikasi mobile.">
                <div className="space-y-4">
                    <CopyField label="Base URL" value={V1} />
                    <CopyField label="API Key" value={profile.api_key} hint="Dikirim di header X-API-KEY." />
                    <CopyField label="Secret Key" value={profile.secret_key} secret hint="Buat bikin X-Signature & ngecek X-Dupay-Signature di webhook." />
                    <button onClick={rotate} disabled={rotating} className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:underline disabled:opacity-50">
                        <RotateCcw size={14} /> {rotating ? "Membuat..." : "Bikin Secret Key baru"}
                    </button>
                </div>
            </Panel>

            <form onSubmit={save}>
                <Panel title="Pengaturan" subtitle="Nama bisnis & email cuma bisa diubah admin Dupay.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Nama bisnis"><input className={`${inputClass} bg-slate-50 text-slate-500`} value={profile.name} disabled /></Field>
                        <Field label="Email"><input className={`${inputClass} bg-slate-50 text-slate-500`} value={profile.email} disabled /></Field>
                        <Field label="Webhook URL" hint="Dupay ngirim POST ke sini tiap status transaksi berubah. Kosong = nggak dikirim." wide>
                            <input className={inputClass} placeholder="https://toko-lu.com/webhook/dupay" value={form.webhook_url} onChange={e => setForm({ ...form, webhook_url: e.target.value })} />
                        </Field>
                        <Field label="IP server yang diizinkan" hint="Opsional. Pisahkan pakai koma. Kosong = semua IP boleh (tetap wajib signature)." wide>
                            <input className={inputClass} placeholder="103.10.20.30, 103.10.20.31" value={form.whitelisted_ips} onChange={e => setForm({ ...form, whitelisted_ips: e.target.value })} />
                        </Field>
                        <Field label="Nama PIC"><input className={inputClass} value={form.pic_name} onChange={e => setForm({ ...form, pic_name: e.target.value })} /></Field>
                        <Field label="Nomor telepon"><input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button type="submit" disabled={saving || !dirty} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-40">
                            <Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </Panel>
            </form>
        </div>
    );
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <label className={`block ${wide ? "md:col-span-2" : ""}`}>
            <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
            {children}
            {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
        </label>
    );
}
