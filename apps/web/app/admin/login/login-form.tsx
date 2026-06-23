"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/admin-auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      return loginAction(formData);
    },
    { error: null },
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-card p-8">
        <h1 className="mb-6 text-center font-display text-2xl font-bold text-ink">
          Admin Login
        </h1>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </div>

          {state.error && (
            <p className="text-sm text-loss">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
