import os from "node:os"

function getLocalIPv4s() {
  const ipSet = new Set()
  const nets = os.networkInterfaces()
  for (const items of Object.values(nets)) {
    for (const n of items ?? []) {
      if (n.family !== "IPv4") continue
      if (!n.address) continue
      if (n.address.startsWith("169.254.")) continue
      ipSet.add(n.address)
    }
  }
  return Array.from(ipSet)
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nalarxr/shared-ui", "@nalarxr/shared-types"],
  allowedDevOrigins: ["192.168.100.15", "localhost", "127.0.0.1", ...getLocalIPv4s()],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:4000/api/:path*" },
      { source: "/uploads/:path*", destination: "http://127.0.0.1:4000/uploads/:path*" },
    ]
  },
}

export default nextConfig
