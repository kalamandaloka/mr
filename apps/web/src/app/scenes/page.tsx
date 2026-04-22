"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
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

type OrientationSceneRow = {
  id: string
  title: string
  slug: string
  sceneType: string
  status: string
}

export default function ScenesPage() {
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>("")
  const [scenes, setScenes] = useState<SceneRow[]>([])
  const [orientation, setOrientation] = useState<OrientationSceneRow | null>(null)

  const selectedModule = useMemo(() => modules.find((m) => m.id === selectedModuleId) ?? null, [modules, selectedModuleId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mods, ori] = await Promise.all([
        apiFetch<ModuleRow[]>("/api/admin/modules"),
        apiFetch<OrientationSceneRow>("/api/admin/orientation-scene"),
      ])
      if (!mods.ok) {
        setError(mods.error)
        return
      }
      const filtered = mods.data.filter((m) => m.slug !== "__global__")
      setModules(filtered)
      if (ori.ok) setOrientation(ori.data)
      else setOrientation(null)
      const first = filtered[0]
      if (first) setSelectedModuleId((prev) => prev || first.id)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedModuleId) {
      setScenes([])
      return
    }
    let cancelled = false
    ;(async () => {
      setError(null)
      const res = await apiFetch<SceneRow[]>(`/api/admin/modules/${selectedModuleId}/scenes`)
      if (cancelled) return
      if (!res.ok) {
        setError(res.error)
        setScenes([])
        return
      }
      setScenes(res.data)
    })()
    return () => {
      cancelled = true
    }
  }, [selectedModuleId])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="text-lg font-semibold text-slate-100">Scenes</div>
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

      <GlassPanel title="Orientasi (Global)">
        {orientation ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-slate-100">{orientation.title}</div>
              <div className="text-xs text-slate-100/70">
                {orientation.sceneType} · {orientation.slug} · {orientation.status}
              </div>
            </div>
            <Link
              className="shrink-0 rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/30"
              href={`/scenes/${orientation.id}`}
            >
              Open
            </Link>
          </div>
        ) : (
          <div className="text-sm text-slate-100/70">{loading ? "Loading..." : "Scene orientasi belum ada."}</div>
        )}
      </GlassPanel>

      <GlassPanel title="Scenes per Module">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <label className="text-sm text-cyan-100/90 sm:col-span-4">
            Module
            <select
              className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.status})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3 sm:col-span-2">
            {selectedModule ? (
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-4 py-2 text-xs text-cyan-100 hover:bg-sky-950/30"
                href={`/modules/${selectedModule.id}`}
              >
                Open Module
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 divide-y divide-cyan-200/10">
          {scenes.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-100">
                  {s.orderNo}. {s.title}
                </div>
                <div className="text-xs text-slate-100/70">
                  {s.sceneType} · {s.slug} · {s.status}
                </div>
              </div>
              <Link
                className="shrink-0 rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/30"
                href={`/scenes/${s.id}`}
              >
                Open
              </Link>
            </div>
          ))}
          {scenes.length === 0 ? <div className="py-6 text-sm text-slate-100/70">{loading ? "Loading..." : "Belum ada scene."}</div> : null}
        </div>
      </GlassPanel>
    </main>
  )
}
