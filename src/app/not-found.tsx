export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
        <p className="text-gray-500">Page not found</p>
        <a
          href="/dashboard"
          className="text-henry-500 hover:text-henry-700 text-sm mt-4 inline-block"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
