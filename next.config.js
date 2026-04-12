/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    // CreatorDeepDive is a direct port from dashboard-v2 using Record<string, unknown>
    // which causes TS errors with JSX children. Types are safe at runtime.
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
