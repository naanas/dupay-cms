"use client";

import { useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import { Button, Field, inputClass, Modal, Notice } from "../../../components/ui";
import { confirmDialog, toast } from "../../../components/overlays";

type Props = {
    merchant: { id: string; name: string; login_username?: string };
    onClose: () => void;
    onSaved: () => void;
};

// Admin bikin / reset / hapus akun login CMS buat satu merchant.
export default function MerchantLoginModal({ merchant, onClose, onSaved }: Props) {
    const hasLogin = !!merchant.login_username;
    const [username, setUsername] = useState(merchant.login_username || "");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api.fetchCMS(`/merchants/${merchant.id}/login`, "PUT", { username, password });
            toast.success(hasLogin ? "Akun login diperbarui" : "Akun login dibuat", `Username: ${username}`);
            onSaved();
            onClose();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        const ok = await confirmDialog({
            title: `Hapus akun login ${merchant.login_username}?`,
            description: "Merchant nggak bisa login ke dashboard lagi, tapi API Key-nya tetap jalan.",
            confirmLabel: "Hapus akun",
            tone: "danger",
        });
        if (!ok) return;
        setBusy(true);
        setError("");
        try {
            await api.fetchCMS(`/merchants/${merchant.id}/login`, "DELETE");
            toast.success("Akun login dihapus");
            onSaved();
            onClose();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            onClose={onClose}
            className="sm:max-w-md"
            title="Akun login merchant"
            subtitle={<>Buat <strong className="text-slate-700">{merchant.name}</strong> login ke dashboard merchant (transaksi, metode bayar, API key). Merchant nggak bisa lihat setting payment gateway.</>}
        >
            <form onSubmit={save} className="space-y-4">
                <Field label="Username">
                    <input required autoComplete="off" autoFocus className={inputClass} value={username} onChange={e => setUsername(e.target.value)} />
                </Field>
                <Field
                    label={hasLogin ? "Password baru (kosongin kalau nggak diganti)" : "Password"}
                    hint="Minimal 8 karakter. Kasih ke merchant lewat jalur aman; merchant bisa ganti sendiri di menu Akun."
                >
                    <input type="password" autoComplete="new-password" required={!hasLogin} minLength={8} className={inputClass} value={password} onChange={e => setPassword(e.target.value)} />
                </Field>

                {error && <Notice tone="error">{error}</Notice>}

                <div className="pt-2 flex items-center gap-2">
                    {hasLogin && (
                        <Button type="button" variant="ghost" onClick={remove} disabled={busy} className="text-red-600 hover:text-red-700 hover:bg-red-50">Hapus akun</Button>
                    )}
                    <Button type="submit" loading={busy} className="flex-1">
                        {hasLogin ? "Simpan" : "Bikin akun"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
