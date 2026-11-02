"use client";

import { useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import { useSessionUser } from "../../../lib/session";
import { inputClass, PageHeader, Panel } from "../../../components/ui";

export default function AccountPage() {
    const user = useSessionUser();
    const [form, setForm] = useState({ old: "", next: "", confirm: "" });
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.next !== form.confirm) {
            setNotice({ ok: false, text: "Konfirmasi password baru nggak sama." });
            return;
        }
        setSaving(true);
        setNotice(null);
        try {
            await api.changePassword(form.old, form.next);
            setForm({ old: "", next: "", confirm: "" });
            setNotice({ ok: true, text: "Password berhasil diganti." });
        } catch (err) {
            setNotice({ ok: false, text: errorMessage(err) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in pb-20 max-w-xl">
            <PageHeader title="Akun" subtitle={<>Login sebagai <strong>{user?.username}</strong> ({user?.role === "admin" ? "Admin" : `Merchant ${user?.merchant_name || ""}`}).</>} />
            <form onSubmit={submit}>
                <Panel title="Ganti password" subtitle="Minimal 8 karakter.">
                    <div className="space-y-3">
                        <input type="password" autoComplete="current-password" required className={inputClass} placeholder="Password lama" value={form.old} onChange={e => setForm({ ...form, old: e.target.value })} />
                        <input type="password" autoComplete="new-password" required minLength={8} className={inputClass} placeholder="Password baru" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} />
                        <input type="password" autoComplete="new-password" required minLength={8} className={inputClass} placeholder="Ulangi password baru" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
                    </div>
                    {notice && <div className={`mt-3 p-3 rounded-xl border text-sm ${notice.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>{notice.text}</div>}
                    <button type="submit" disabled={saving} className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50">
                        {saving ? "Menyimpan..." : "Ganti password"}
                    </button>
                </Panel>
            </form>
        </div>
    );
}
