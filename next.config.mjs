/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
      {
        source: "/api/generate/:path*",
        destination: "http://127.0.0.1:8001/api/generate/:path*",
      },
      {
        source: "/api/ai-defense-lab/:path*",
        destination: "http://127.0.0.1:8001/api/ai-defense-lab/:path*",
      },
      {
        source: "/api/incident/:path*",
        destination: "http://127.0.0.1:8001/api/incident/:path*",
      },
      {
        source: "/api/cockpit/:path*",
        destination: "http://127.0.0.1:8001/api/cockpit/:path*",
      },
    ];
  },
};
export default nextConfig;
