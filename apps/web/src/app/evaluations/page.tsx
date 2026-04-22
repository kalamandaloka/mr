"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../lib/api"

type EvaluationRow = {
  id: string
  sceneId: string
  title: string
  evaluationType: string
  passingScore: number
  updatedAt: string
  scene: {
    id: string
    title: string
    sceneType: string
    module: { id: string; title: string; slug: string }
  }
}

export default function EvaluationsPage() {
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<EvaluationRow[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<EvaluationRow[]>("/api/admin/evaluations")
      if (!res.ok) {
        setError(res.error)
        return
      }
      setItems(res.data)
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
        <div className="text-lg font-semibold text-slate-100">Evaluations</div>
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

      <GlassPanel title="Daftar (Terbaru)">
        <div className="divide-y divide-cyan-200/10">
          {items.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-100">
                  {e.title} <span className="text-slate-100/60">({e.evaluationType})</span>
                </div>
                <div className="text-xs text-slate-100/70">
                  {e.scene.module.title} · {e.scene.title} ({e.scene.sceneType}) · passingScore {e.passingScore}
                </div>
              </div>
              <Link
                className="shrink-0 rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/30"
                href={`/scenes/${e.sceneId}`}
              >
                Open Scene
              </Link>
            </div>
          ))}
          {items.length === 0 ? (
            <div className="py-6 text-sm text-slate-100/70">{loading ? "Loading..." : "Belum ada evaluation."}</div>
          ) : null}
        </div>
      </GlassPanel>
    </main>
  )
}
