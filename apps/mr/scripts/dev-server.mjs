import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

function getLocalIPv4s() {
  const ipSet = new Set()
  const nets = os.networkInterfaces()
  for (const items of Object.values(nets)) {
    for (const n of items ?? []) {
      if (n.family !== "IPv4") continue
      if (!n.address) continue
      if (n.address.startsWith("169.254.")) continue
      if (n.address === "127.0.0.1") continue
      ipSet.add(n.address)
    }
  }
  return Array.from(ipSet)
}

const port = Number(process.env.PORT ?? "3001")
const ips = getLocalIPv4s()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, "..")
const require = createRequire(import.meta.url)
const nextCli = require.resolve("next/dist/bin/next")

process.stdout.write("\n")
process.stdout.write("NalarXR MR Runtime dev server\n")
process.stdout.write(`- Local:   https://localhost:${port}/?debug=true\n`)
for (const ip of ips) {
  process.stdout.write(`- LAN:     https://${ip}:${port}/?debug=true\n`)
}
process.stdout.write("\n")

const args = [
  "dev",
  "-H",
  "0.0.0.0",
  "-p",
  String(port),
  "--experimental-https",
  "--experimental-https-key",
  "certificates/localhost-key.pem",
  "--experimental-https-cert",
  "certificates/localhost.pem",
]

const child = spawn(process.execPath, [nextCli, ...args], {
  stdio: "inherit",
  env: process.env,
  cwd: appRoot,
})

child.on("exit", (code) => {
  process.exit(code ?? 1)
})
