"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../lib/api"

type ModuleRow = {
  id: string
  title: string
  slug: string
  status: string
  version: number
  updatedAt: string
}

type SceneRow = {
  id: string
  moduleId: string
  title: string
  slug: string
  sceneType: string
  orderNo: number
  status: string
}

export default function PublishPage() {
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<ModuleRow[]>("/api/admin/modules")
      if (!res.ok) {
        setError(res.error)
        return
      }
      setModules(res.data.filter((m) => m.slug !== "__global__"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="text-lg font-semibold text-slate-100">Publish</div>
        <button
          className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
          disabled={seeding}
          onClick={async () => {
            setSeeding(true)
            setError(null)
            try {
              const seeded = await apiFetch("/api/admin/demo/seed", { method: "POST" })
              if (!seeded.ok) {
                setError(seeded.error)
                return
              }
              await load()
            } finally {
              setSeeding(false)
            }
          }}
        >
          {seeding ? "Seeding..." : "Buat Dummy Data"}
        </button>
      </div>

      {error ? <div className="rounded-xl border border-rose-200/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <GlassPanel title="Modules">
        <div className="divide-y divide-cyan-200/10">
          {modules.map((m) => (
            <div key={m.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm text-slate-100">{m.title}</div>
                <div className="text-xs text-slate-100/70">
                  {m.slug} · status {m.status} · version {m.version}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/30"
                  href={`/modules/${m.id}`}
                >
                  Open
                </Link>
                <button
                  className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
                  disabled={savingModuleId === m.id}
                  onClick={async () => {
                    setSavingModuleId(m.id)
                    setError(null)
                    try {
                      const sceneRes = await apiFetch<SceneRow[]>(`/api/admin/modules/${m.id}/scenes`)
                      if (!sceneRes.ok) {
                        setError(sceneRes.error)
                        return
                      }
                      const updated = await apiFetch<ModuleRow>(`/api/admin/modules/${m.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "published", version: m.version }),
                      })
                      if (!updated.ok) {
                        setError(updated.error)
                        return
                      }
                      const results = await Promise.all(
                        sceneRes.data.map((s) =>
                          apiFetch<SceneRow>(`/api/admin/scenes/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) }),
                        ),
                      )
                      const firstError = results.find((r) => !r.ok)
                      if (firstError && !firstError.ok) {
                        setError(firstError.error)
                        return
                      }
                      await load()
                    } finally {
                      setSavingModuleId(null)
                    }
                  }}
                >
                  {savingModuleId === m.id ? "Publishing..." : "Publish All"}
                </button>
              </div>
            </div>
          ))}
          {modules.length === 0 ? <div className="py-6 text-sm text-slate-100/70">{loading ? "Loading..." : "Belum ada module."}</div> : null}
        </div>
      </GlassPanel>
    </main>
  )
}
