"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientApi } from "@/lib/api";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing token");
      return;
    }

    clientApi("/auth/verify", {
      method: "POST",
      body: { token },
    })
      .then(() => {
        router.replace("/dashboard");
      })
      .catch((err: Error) => {
        setError(err.message || "Invalid or expired link");
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Sign-in failed
            </h2>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <a
              href="/login"
              className="text-henry-500 hover:text-henry-700 text-sm font-medium"
            >
              Try again
            </a>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-henry-500 mx-auto mb-4" />
            <p className="text-gray-500">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-henry-500" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
