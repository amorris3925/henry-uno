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
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Invalid setup link
          </h2>
          <p className="text-gray-500 text-sm">
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
        body: {
          token,
          password,
          name: name.trim() || undefined,
        },
      });
      router.replace("/login");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to set up account"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Henry</h1>
          <p className="text-gray-500 mt-2">Set up your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-henry-500 focus:border-henry-500 outline-none"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password *
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-henry-500 focus:border-henry-500 outline-none"
              disabled={loading}
              minLength={8}
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm password *
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-henry-500 focus:border-henry-500 outline-none"
              disabled={loading}
              minLength={8}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-henry-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-henry-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-henry-500" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
