const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nalarxr/shared-ui", "@nalarxr/shared-types"],
  allowedDevOrigins: ["192.168.100.15", "192.168.1.6"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:4000/api/:path*" },
      { source: "/uploads/:path*", destination: "http://127.0.0.1:4000/uploads/:path*" },
    ]
  },
}

export default nextConfig
