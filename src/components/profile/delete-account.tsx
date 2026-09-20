"use client";

import { useState, useTransition } from "react";
import { deleteOwnAccountAction } from "@/app/(app)/profile/delete-account-action";

export function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return <section className="mt-6 rounded-2xl border border-danger/30 p-5">
    <h2 className="font-display text-lg font-semibold">Delete my account</h2>
    <p className="mt-2 text-sm text-muted">This disables sign-in and removes your profile contact details. School operational and financial records may be retained without your profile details.</p>
    <label className="mt-4 block text-sm font-medium" htmlFor="delete-account-password">Confirm with your password</label>
    <input id="delete-account-password" type="password" autoComplete="current-password" value={password}
      onChange={(event) => setPassword(event.target.value)} className="mt-1 rounded-lg border px-3 py-2" />
    <button type="button" disabled={pending || !password} className="ml-3 rounded-lg bg-danger px-4 py-2 text-white disabled:opacity-50"
      onClick={() => {
        if (!window.confirm("Delete your account and remove your profile details? This cannot be undone.")) return;
        setError("");
        startTransition(async () => {
          const result = await deleteOwnAccountAction(password);
          if (result?.error) setError(result.error);
        });
      }}>Delete account</button>
    {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
  </section>;
}
