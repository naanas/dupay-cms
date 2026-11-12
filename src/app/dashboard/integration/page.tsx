"use client";

import { useEffect, useState } from "react";
import { api, API_BASE, errorMessage } from "../../../lib/api";
import { Button, CopyField, Field, inputClass, Notice, PageHeader, Panel, PageSkeleton } from "../../../components/ui";
import { confirmDialog, toast } from "../../../components/overlays";
import { KeyRound, RotateCcw, Save, Settings2 } from "lucide-react";

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
    const [loadError, setLoadError] = useState("");

    const apply = (p: Profile) => {
        setProfile(p);
        setForm({ webhook_url: p.webhook_url || "", whitelisted_ips: p.whitelisted_ips || "", pic_name: p.pic_name || "", phone: p.phone || "" });
    };

    useEffect(() => {
        api.fetchMerchant("/me").then(apply).catch(err => setLoadError(errorMessage(err)));
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            apply(await api.fetchMerchant("/me", "PUT", form));
            toast.success("Pengaturan tersimpan");
        } catch (err) {
            toast.error("Gagal menyimpan", errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const rotate = async () => {
        const ok = await confirmDialog({
            title: "Bikin Secret Key baru?",
            description: "Secret Key lama langsung nggak berlaku, jadi server toko lu harus langsung diganti ke yang baru.",
            confirmLabel: "Bikin Secret Key baru",
            tone: "danger",
        });
        if (!ok) return;
        setRotating(true);
        try {
            apply(await api.fetchMerchant("/me/rotate-secret", "POST"));
            toast.success("Secret Key baru udah dibuat", "Update di server toko lu sekarang.");
        } catch (err) {
            toast.error("Gagal bikin Secret Key", errorMessage(err));
        } finally {
            setRotating(false);
        }
    };

    if (!profile) {
        return loadError ? <Notice tone="error">{loadError}</Notice> : <PageSkeleton panels={2} />;
    }

    const dirty = form.webhook_url !== (profile.webhook_url || "") || form.whitelisted_ips !== (profile.whitelisted_ips || "")
        || form.pic_name !== (profile.pic_name || "") || form.phone !== (profile.phone || "");

    return (
        <div className="space-y-6 animate-in">
            <PageHeader title="Integrasi API" subtitle="Kunci API & pengaturan yang dipakai server toko lu buat konek ke Dupay." />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <Panel className="lg:col-span-2" title={<span className="flex items-center gap-2"><KeyRound size={16} className="text-slate-400" /> Kunci API</span>} subtitle="Simpan di server (env variable). Jangan taruh Secret Key di frontend atau aplikasi mobile.">
                <div className="space-y-4">
                    <CopyField label="Base URL" value={V1} />
                    <CopyField label="API Key" value={profile.api_key} hint="Dikirim di header X-API-KEY." />
                    <CopyField label="Secret Key" value={profile.secret_key} secret hint="Buat bikin X-Signature & ngecek X-Dupay-Signature di webhook." />
                    <Button variant="ghost" size="sm" icon={RotateCcw} loading={rotating} onClick={rotate} className="text-red-600 hover:text-red-700 hover:bg-red-50 -ml-2">
                        Bikin Secret Key baru
                    </Button>
                </div>
            </Panel>

            <form onSubmit={save} className="lg:col-span-3">
                <Panel title={<span className="flex items-center gap-2"><Settings2 size={16} className="text-slate-400" /> Pengaturan</span>} subtitle="Nama bisnis & email cuma bisa diubah admin Dupay.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Nama bisnis"><input className={inputClass} value={profile.name} disabled /></Field>
                        <Field label="Email"><input className={inputClass} value={profile.email} disabled /></Field>
                        <Field label="Webhook URL" hint="Dupay ngirim POST ke sini tiap status transaksi berubah. Kosong = nggak dikirim." wide>
                            <input className={`${inputClass} font-mono`} placeholder="https://toko-lu.com/webhook/dupay" value={form.webhook_url} onChange={e => setForm({ ...form, webhook_url: e.target.value })} />
                        </Field>
                        <Field label="IP server yang diizinkan" hint="Opsional. Pisahkan pakai koma. Kosong = semua IP boleh (tetap wajib signature)." wide>
                            <input className={`${inputClass} font-mono`} placeholder="103.10.20.30, 103.10.20.31" value={form.whitelisted_ips} onChange={e => setForm({ ...form, whitelisted_ips: e.target.value })} />
                        </Field>
                        <Field label="Nama PIC"><input className={inputClass} value={form.pic_name} onChange={e => setForm({ ...form, pic_name: e.target.value })} /></Field>
                        <Field label="Nomor telepon"><input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
                    </div>
                    <div className="mt-6 flex items-center justify-end gap-3">
                        {dirty && <span className="text-xs text-amber-600">Ada perubahan belum disimpan</span>}
                        <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>Simpan</Button>
                    </div>
                </Panel>
            </form>
            </div>
        </div>
    );
}
