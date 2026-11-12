"use client";

import { useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import { useSessionUser } from "../../../lib/session";
import { Button, Field, inputClass, Notice, PageHeader, Panel } from "../../../components/ui";
import { toast } from "../../../components/overlays";
import { Lock } from "lucide-react";

export default function AccountPage() {
    const user = useSessionUser();
    const [form, setForm] = useState({ old: "", next: "", confirm: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.next !== form.confirm) {
            setError("Konfirmasi password baru nggak sama.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await api.changePassword(form.old, form.next);
            setForm({ old: "", next: "", confirm: "" });
            toast.success("Password berhasil diganti");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in max-w-xl">
            <PageHeader title="Akun" subtitle={<>Login sebagai <strong className="text-slate-700">{user?.username}</strong> ({user?.role === "admin" ? "Admin" : `Merchant ${user?.merchant_name || ""}`}).</>} />
            <form onSubmit={submit}>
                <Panel title={<span className="flex items-center gap-2"><Lock size={16} className="text-slate-400" /> Ganti password</span>} subtitle="Minimal 8 karakter.">
                    <div className="space-y-4">
                        <Field label="Password lama">
                            <input type="password" autoComplete="current-password" required className={inputClass} value={form.old} onChange={e => setForm({ ...form, old: e.target.value })} />
                        </Field>
                        <Field label="Password baru">
                            <input type="password" autoComplete="new-password" required minLength={8} className={inputClass} value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} />
                        </Field>
                        <Field label="Ulangi password baru">
                            <input type="password" autoComplete="new-password" required minLength={8} className={inputClass} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
                        </Field>
                    </div>
                    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
                    <Button type="submit" loading={saving} className="mt-5 w-full">Ganti password</Button>
                </Panel>
            </form>
        </div>
    );
}
