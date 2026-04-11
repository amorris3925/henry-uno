"use client";

import { useState } from "react";
import { clientApi } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await clientApi("/auth/request-magic-link", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Henry</h1>
          <p className="text-gray-500 mt-2">Sign in to your portal</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-4xl mb-4">&#9993;</div>
            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm">
              We sent a sign-in link to <strong>{email}</strong>.
              <br />
              Click the link to access your portal.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="mt-4 text-sm text-henry-500 hover:text-henry-700"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-henry-500 focus:border-henry-500 outline-none"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-henry-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-henry-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "Continue with email"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Only pre-approved emails can sign in.
        </p>
      </div>
    </div>
  );
}
