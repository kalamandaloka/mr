import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import selfsigned from "selfsigned"

const certDir = path.resolve(process.cwd(), "certificates")
const keyPath = path.join(certDir, "localhost-key.pem")
const certPath = path.join(certDir, "localhost.pem")
const metaPath = path.join(certDir, "localhost.meta.json")

const force = process.env.NALARXR_REGEN_HTTPS_CERTS === "1"

fs.mkdirSync(certDir, { recursive: true })

const attrs = [{ name: "commonName", value: "localhost" }]

const ipSet = new Set()
const nets = os.networkInterfaces()
for (const items of Object.values(nets)) {
  for (const n of items ?? []) {
    if (n.family !== "IPv4") continue
    if (!n.address) continue
    ipSet.add(n.address)
  }
}

const currentIpv4 = Array.from(ipSet).sort()

if (!force && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  if (fs.existsSync(metaPath)) {
    try {
      const metaRaw = fs.readFileSync(metaPath, "utf8")
      const meta = JSON.parse(metaRaw)
      const metaIpv4 = Array.isArray(meta?.ipv4) ? meta.ipv4.slice().sort() : null
      const same =
        Array.isArray(metaIpv4) &&
        metaIpv4.length === currentIpv4.length &&
        metaIpv4.every((ip, i) => ip === currentIpv4[i])

      if (same) process.exit(0)
    } catch {
    }
  }
}

const altNames = [
  { type: 2, value: "localhost" },
  { type: 7, ip: "127.0.0.1" },
  { type: 7, ip: "::1" },
  ...currentIpv4.map((ip) => ({ type: 7, ip })),
]

const pems = selfsigned.generate(attrs, {
  algorithm: "sha256",
  days: 825,
  keySize: 2048,
  extensions: [
    {
      name: "subjectAltName",
      altNames,
    },
  ],
})

fs.writeFileSync(keyPath, pems.private, { mode: 0o600 })
fs.writeFileSync(certPath, pems.cert)
fs.writeFileSync(
  metaPath,
  JSON.stringify({ ipv4: currentIpv4, generatedAt: new Date().toISOString() }, null, 2) + "\n",
)

process.stdout.write(`Generated dev HTTPS certs at ${certDir}\n`)
