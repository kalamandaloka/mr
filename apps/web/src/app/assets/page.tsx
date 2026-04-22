"use client"

import { useEffect, useMemo, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiBaseUrl, apiFetch, getAccessToken } from "../../lib/api"

type AssetRow = {
  id: string
  name: string
  fileType: string
  fileUrl: string
  mimeType: string | null
  size: number | null
  createdAt: string
}

export default function AssetsPage() {
  const baseUrl = useMemo(() => apiBaseUrl(), [])
  const backendBase = useMemo(() => {
    if (typeof window === "undefined") return baseUrl
    return `http://${window.location.hostname}:4000`
  }, [baseUrl])
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function readError(res: Response) {
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (json?.error) return json.error
    }
    return await res.text().catch(() => res.statusText)
  }

  async function loadAssets() {
    setError(null)
    const result = await apiFetch<AssetRow[]>("/api/admin/assets", { cache: "no-store" })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAssets(result.data)
  }

  useEffect(() => {
    void loadAssets()
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="text-lg font-semibold text-slate-100">Assets</div>

      <GlassPanel title="Upload GLB">
        <div className="text-sm text-slate-100/80">
          Upload file <span className="text-cyan-100">.glb</span> ke backend, lalu bisa dipakai untuk scene object.
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm text-cyan-100/90 sm:flex-1">
            File (.glb)
            <input
              key={fileInputKey}
              className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/10 file:px-3 file:py-1.5 file:text-cyan-100"
              type="file"
              accept=".glb"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
            disabled={loading || !file}
            type="button"
            onClick={async () => {
              if (!file) return
              if (file.size > 100 * 1024 * 1024) {
                setError("File size melebihi limit 100MB")
                return
              }
              setLoading(true)
              setError(null)
              try {
                const token = getAccessToken()
                const fd = new FormData()
                fd.append("file", file)
                const uploadBase = baseUrl || backendBase

                const res = await fetch(`${uploadBase}/api/admin/assets/upload-file`, {
                  method: "POST",
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  body: fd,
                })
                if (!res.ok) {
                  setError(await readError(res))
                  return
                }
                setFile(null)
                setFileInputKey((x) => x + 1)
                await loadAssets()
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
          <button
            className="rounded-xl border border-cyan-200/20 bg-sky-950/30 px-4 py-2 text-sm text-cyan-100 hover:bg-sky-950/40 disabled:opacity-60"
            disabled={loading}
            type="button"
            onClick={() => void loadAssets()}
          >
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-rose-200">{error}</div> : null}
      </GlassPanel>

      <GlassPanel title="Daftar Asset">
        <div className="divide-y divide-cyan-200/10">
          {assets.map((a) => {
            const url = a.fileUrl.startsWith("http") ? a.fileUrl : `${baseUrl}${a.fileUrl}`
            const directUrl = a.fileUrl.startsWith("http") ? a.fileUrl : `${backendBase}${a.fileUrl}`
            return (
              <div key={a.id} className="py-3">
                <div className="text-sm text-slate-100">{a.name}</div>
                <div className="mt-0.5 text-xs text-slate-100/70">
                  {a.fileType} ·{" "}
                  {a.size != null ? `${Math.round((a.size / (1024 * 1024)) * 10) / 10} MB` : "-"} ·{" "}
                  <a className="text-cyan-100 hover:underline" href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                  {" · "}
                  <a className="text-cyan-100 hover:underline" href={directUrl} target="_blank" rel="noreferrer">
                    direct
                  </a>
                </div>
              </div>
            )
          })}
          {assets.length === 0 ? <div className="py-6 text-sm text-slate-100/70">Belum ada asset.</div> : null}
        </div>
      </GlassPanel>
    </main>
  )
}
