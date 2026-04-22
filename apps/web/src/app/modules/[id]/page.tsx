"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../../lib/api"

type ModuleRow = {
  id: string
  title: string
  slug: string
  status: "draft" | "published" | "archived"
  version: number
}

type SceneRow = {
  id: string
  title: string
  slug: string
  sceneType: string
  orderNo: number
  status: string
}

export default function ModuleDetailPage() {
  const params = useParams<{ id: string }>()
  const moduleId = params.id

  const [module, setModule] = useState<ModuleRow | null>(null)
  const [scenes, setScenes] = useState<SceneRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [status, setStatus] = useState<ModuleRow["status"]>("draft")
  const [version, setVersion] = useState(1)

  async function load() {
    setLoading(true)
    setError(null)

    const m = await apiFetch<ModuleRow>(`/api/admin/modules/${moduleId}`)
    const s = await apiFetch<SceneRow[]>(`/api/admin/modules/${moduleId}/scenes`)

    setLoading(false)
    if (!m.ok) {
      setError(m.error)
      return
    }
    if (!s.ok) {
      setError(s.error)
      return
    }
    setModule(m.data)
    setScenes(s.data)
    setStatus(m.data.status)
    setVersion(m.data.version)
  }

  useEffect(() => {
    void load()
  }, [moduleId])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="text-lg font-semibold text-slate-100">Module Detail</div>
      {error ? <div className="text-sm text-rose-200">{error}</div> : null}
      {loading ? (
        <div className="text-sm text-slate-100/80">Loading...</div>
      ) : (
        <>
          <GlassPanel title="Module">
            <div className="text-sm text-slate-100">
              {module?.title} <span className="text-slate-100/60">({module?.slug})</span>
            </div>
            <div className="mt-1 text-xs text-slate-100/70">
              status: {module?.status} · v{module?.version}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm text-cyan-100/90">
                Status
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ModuleRow["status"])}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="text-sm text-cyan-100/90">
                Version
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  type="number"
                  min={1}
                  step={1}
                  value={version}
                  onChange={(e) => setVersion(Number(e.target.value))}
                />
              </label>
              <div className="flex items-end">
                <div className="flex w-full gap-3">
                  <button
                    className="w-full rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
                    disabled={saving || !module}
                    onClick={async () => {
                      if (!module) return
                      setSaving(true)
                      setError(null)
                      try {
                        const updated = await apiFetch<ModuleRow>(`/api/admin/modules/${moduleId}`, {
                          method: "PATCH",
                          body: JSON.stringify({ status, version }),
                        })
                        if (!updated.ok) {
                          setError(updated.error)
                          return
                        }
                        await load()
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="w-full rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
                    disabled={saving || !module}
                    onClick={async () => {
                      if (!module) return
                      setSaving(true)
                      setError(null)
                      try {
                        const updated = await apiFetch<ModuleRow>(`/api/admin/modules/${moduleId}`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: "published", version }),
                        })
                        if (!updated.ok) {
                          setError(updated.error)
                          return
                        }
                        const results = await Promise.all(
                          scenes.map((s) =>
                            apiFetch<SceneRow>(`/api/admin/scenes/${s.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ status: "published" }),
                            }),
                          ),
                        )
                        const firstError = results.find((r) => !r.ok)
                        if (firstError && !firstError.ok) {
                          setError(firstError.error)
                          return
                        }
                        setStatus("published")
                        await load()
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    Publish All
                  </button>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title="Struktur Scene (Tetap)">
            <div className="text-sm text-slate-100/80">
              Orientasi (Global) · 1. Overview · 2. Komponen · 3. Cara Kerja · 4. Praktek · 5. Evaluasi
            </div>
            <div className="mt-2 text-xs text-slate-100/60">
              Scene template dibuat otomatis untuk setiap modul. Scene Orientasi dipakai bersama oleh semua modul.
            </div>
          </GlassPanel>

          <GlassPanel title="Scenes">
            <div className="divide-y divide-cyan-200/10">
              {scenes.map((s) => (
                <div key={s.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-100">
                      {s.orderNo}. {s.title}
                    </div>
                    <Link
                      className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-1.5 text-xs text-cyan-100 hover:bg-sky-950/30"
                      href={`/scenes/${s.id}`}
                    >
                      Open
                    </Link>
                  </div>
                  <div className="text-xs text-slate-100/70">
                    {s.sceneType} · {s.slug} · {s.status}
                  </div>
                </div>
              ))}
              {scenes.length === 0 ? (
                <div className="py-6 text-sm text-slate-100/70">Belum ada scene.</div>
              ) : null}
            </div>
          </GlassPanel>
        </>
      )}
    </main>
  )
}
