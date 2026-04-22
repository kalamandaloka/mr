import cors from "cors"
import express from "express"
import fs from "node:fs"
import path from "node:path"
import { env } from "./env"
import { authRouter } from "./routes/auth"
import { adminRouter } from "./routes/admin"
import { runtimeRouter } from "./routes/runtime"

const app = express()

app.use(express.json({ limit: "2mb" }))

const allowedOrigins = (env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
const allowAnyOrigin = allowedOrigins.includes("*")

app.use(
  cors({
    origin: allowAnyOrigin ? true : allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }),
)

const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use("/uploads", express.static(uploadsDir))

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api/auth", authRouter)
app.use("/api/admin", adminRouter)
app.use("/api/runtime", runtimeRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal Server Error"
  res.status(500).json({ error: message })
})

const port = env.PORT ?? 4000
app.listen(port, () => {
  process.stdout.write(`backend-api listening on http://localhost:${port}\n`)
})
