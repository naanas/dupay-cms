"use client";

import { useState } from "react";
import { api, errorMessage } from "../../../lib/api";
import { inputClass } from "../../../components/ui";
import { KeyRound, X } from "lucide-react";

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
            onSaved();
            onClose();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm(`Hapus akun login ${merchant.login_username}? Merchant nggak bisa login ke dashboard lagi, tapi API Key-nya tetap jalan.`)) return;
        setBusy(true);
        setError("");
        try {
            await api.fetchCMS(`/merchants/${merchant.id}/login`, "DELETE");
            onSaved();
            onClose();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <form onSubmit={save} className="modal-panel bg-white rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-2xl" onClick={e => e.stopPropagation()}>
                <button type="button" onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800"><X size={22} /></button>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><KeyRound size={20} className="text-blue-600" /> Akun login merchant</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Buat <strong>{merchant.name}</strong> login ke dashboard merchant (lihat transaksi, metode bayar, API key). Merchant nggak bisa lihat setting payment gateway.
                </p>

                <div className="mt-5 space-y-3">
                    <label className="block">
                        <span className="block text-xs font-bold text-slate-500 mb-1.5">Username</span>
                        <input required autoComplete="off" className={inputClass} value={username} onChange={e => setUsername(e.target.value)} />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-bold text-slate-500 mb-1.5">{hasLogin ? "Password baru (kosongin kalau nggak diganti)" : "Password"}</span>
                        <input type="password" autoComplete="new-password" required={!hasLogin} minLength={8} className={inputClass} value={password} onChange={e => setPassword(e.target.value)} />
                        <span className="block text-[11px] text-slate-400 mt-1">Minimal 8 karakter. Kasih ke merchant lewat jalur aman; merchant bisa ganti sendiri di menu Akun.</span>
                    </label>
                </div>

                {error && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

                <div className="mt-6 flex items-center gap-2">
                    {hasLogin && (
                        <button type="button" onClick={remove} disabled={busy} className="px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-50">Hapus akun</button>
                    )}
                    <button type="submit" disabled={busy} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50">
                        {busy ? "Menyimpan..." : hasLogin ? "Simpan" : "Bikin akun"}
                    </button>
                </div>
            </form>
        </div>
    );
}
