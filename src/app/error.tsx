"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300 mb-2">500</h1>
        <p className="text-gray-500 mb-4">Something went wrong</p>
        <button
          onClick={reset}
          className="text-henry-500 hover:text-henry-700 text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
