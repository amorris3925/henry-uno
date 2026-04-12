"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await clientApi("/auth/login", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });
      router.replace("/artifacts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            H
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Sign in to Henry
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-xs text-[var(--text-muted)] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--text-muted)]"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs text-[var(--text-muted)] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--text-muted)]"
              disabled={loading}
              minLength={8}
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--color-error)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-2 text-sm rounded-md bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[10px] text-[var(--text-muted)] mt-6">
          Access is by invitation only.
        </p>
      </div>
    </div>
  );
}
