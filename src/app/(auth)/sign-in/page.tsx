"use client";

import { useState } from "react";
import { signInAction, SignInValues } from "./actions";

export function SignInForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const values: SignInValues = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const result = await signInAction(values);

    if (!result.success) {
      setErrorMessage(result.error ?? "Failed to sign in.");
      setIsPending(false);
      return;
    }

    // Force hard refresh to pass updated session cookies to Server Components
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {errorMessage}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          name="password"
          type="password"
          required
          className="w-full p-2 border rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full p-2 text-white bg-blue-600 rounded-md disabled:opacity-50"
      >
        {isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}