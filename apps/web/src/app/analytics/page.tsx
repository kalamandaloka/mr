"use client"

import { useEffect, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../lib/api"

type ProgressRow = {
  id: string
  userId: string
  moduleId: string
  sceneId: string
  currentStep: number
  completionPercent: number
  updatedAt: string
  user: { id: string; name: string; email: string }
  module: { id: string; title: string; slug: string }
  scene: { id: string; title: string; sceneType: string }
}

type ActivityLogRow = {
  id: string
  userId: string
  moduleId: string
  sceneId: string
  objectKey: string | null
  interactionType: string
  actionResult: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
  module: { id: string; title: string; slug: string }
  scene: { id: string; title: string; sceneType: string }
}

type Overview = {
  modules: number
  scenes: number
  assets: number
  contentBlocks: number
  interactions: number
  practiceSteps: number
  evaluations: number
  progress: number
  activityLogs: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [logs, setLogs] = useState<ActivityLogRow[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, pr, lg] = await Promise.all([
        apiFetch<Overview>("/api/admin/overview"),
        apiFetch<ProgressRow[]>("/api/admin/progress"),
        apiFetch<ActivityLogRow[]>("/api/admin/activity-logs"),
      ])
      if (ov.ok) setOverview(ov.data)
      if (!pr.ok) {
        setError(pr.error)
        return
      }
      if (!lg.ok) {
        setError(lg.error)
        return
      }
      setProgress(pr.data)
      setLogs(lg.data)
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
        <div className="text-lg font-semibold text-slate-100">Analytics</div>
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

      <GlassPanel title="Ringkasan">
        {overview ? (
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-100/85 sm:grid-cols-3">
            <div>Modules: {overview.modules}</div>
            <div>Scenes: {overview.scenes}</div>
            <div>Assets: {overview.assets}</div>
            <div>Content Blocks: {overview.contentBlocks}</div>
            <div>Interactions: {overview.interactions}</div>
            <div>Practice Steps: {overview.practiceSteps}</div>
            <div>Evaluations: {overview.evaluations}</div>
            <div>Progress Rows: {overview.progress}</div>
            <div>Activity Logs: {overview.activityLogs}</div>
          </div>
        ) : (
          <div className="text-sm text-slate-100/70">{loading ? "Loading..." : "Tidak ada data."}</div>
        )}
      </GlassPanel>

      <GlassPanel title="User Progress (Terbaru)">
        <div className="divide-y divide-cyan-200/10">
          {progress.map((p) => (
            <div key={p.id} className="py-3">
              <div className="text-sm text-slate-100">
                {p.user.name} · {p.module.title} · {p.scene.title} <span className="text-slate-100/60">({p.scene.sceneType})</span>
              </div>
              <div className="text-xs text-slate-100/70">
                {p.completionPercent}% · step {p.currentStep} · {p.user.email} · {p.module.slug}
              </div>
            </div>
          ))}
          {progress.length === 0 ? <div className="py-6 text-sm text-slate-100/70">{loading ? "Loading..." : "Belum ada progress."}</div> : null}
        </div>
      </GlassPanel>

      <GlassPanel title="Activity Logs (Terbaru)">
        <div className="divide-y divide-cyan-200/10">
          {logs.map((l) => (
            <div key={l.id} className="py-3">
              <div className="text-sm text-slate-100">
                {l.interactionType} <span className="text-slate-100/60">{l.actionResult ?? ""}</span>
              </div>
              <div className="text-xs text-slate-100/70">
                {l.user.name} · {l.module.title} · {l.scene.title} ({l.scene.sceneType}){l.objectKey ? ` · objectKey: ${l.objectKey}` : ""}
              </div>
            </div>
          ))}
          {logs.length === 0 ? <div className="py-6 text-sm text-slate-100/70">{loading ? "Loading..." : "Belum ada activity log."}</div> : null}
        </div>
      </GlassPanel>
    </main>
  )
}
