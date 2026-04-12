"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientApi } from "@/lib/api";

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-base font-semibold text-[var(--color-error)] mb-2">
            Invalid setup link
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            This link is missing or invalid.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await clientApi("/auth/setup-account", {
        method: "POST",
        body: { token, password, name: name.trim() || undefined },
      });
      router.replace("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set up account");
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
            Set up your account
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 space-y-4"
        >
          <div>
            <label htmlFor="name" className="block text-xs text-[var(--text-muted)] mb-1.5">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--text-muted)]"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-[var(--text-muted)] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--text-muted)]"
              disabled={loading}
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs text-[var(--text-muted)] mb-1.5">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--text-muted)]"
              disabled={loading}
              minLength={8}
            />
          </div>

          {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-2 text-sm rounded-md bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Setting up..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
