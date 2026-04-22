"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../lib/api"

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

type ModuleRow = {
  id: string
  title: string
  slug: string
  status: string
  version: number
  updatedAt: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, mods] = await Promise.all([apiFetch<Overview>("/api/admin/overview"), apiFetch<ModuleRow[]>("/api/admin/modules")])
      if (ov.ok) setOverview(ov.data)
      if (!mods.ok) {
        setError(mods.error)
        return
      }
      setModules(mods.data.filter((m) => m.slug !== "__global__").slice(0, 6))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 w-full border-b border-cyan-200/10 bg-sky-950/25 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-100">Dashboard</div>
            <div className="text-xs text-slate-100/60">Ringkasan data dan shortcut untuk admin.</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
            <button
              className="rounded-xl border border-cyan-200/20 bg-sky-950/30 px-4 py-2 text-sm text-cyan-100 hover:bg-sky-950/40 disabled:opacity-60"
              disabled={loading}
              onClick={() => void load()}
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 px-6 py-6">
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GlassPanel title="Ringkasan Data">
            {overview ? (
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-100/85">
                <div>Modules: {overview.modules}</div>
                <div>Scenes: {overview.scenes}</div>
                <div>Assets: {overview.assets}</div>
                <div>Content Blocks: {overview.contentBlocks}</div>
                <div>Interactions: {overview.interactions}</div>
                <div>Practice Steps: {overview.practiceSteps}</div>
                <div>Evaluations: {overview.evaluations}</div>
                <div>Progress: {overview.progress}</div>
                <div>Activity Logs: {overview.activityLogs}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-100/70">{loading ? "Loading..." : "Tidak ada data."}</div>
            )}
          </GlassPanel>

          <GlassPanel title="Quick Links">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/modules"
              >
                Modules
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/scenes"
              >
                Scenes
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/assets"
              >
                Assets
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/content-blocks"
              >
                Content Blocks
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/interactions"
              >
                Interactions
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/evaluations"
              >
                Evaluations
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/analytics"
              >
                Analytics
              </Link>
              <Link
                className="rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-cyan-100 hover:bg-sky-950/30"
                href="/publish"
              >
                Publish
              </Link>
            </div>
          </GlassPanel>
        </div>

        <div className="mt-6">
          <GlassPanel title="Modules Terbaru">
            <div className="divide-y divide-cyan-200/10">
              {modules.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">{m.title}</div>
                    <div className="text-xs text-slate-100/70">
                      {m.slug} · v{m.version} · {m.status}
                    </div>
                  </div>
                  <Link
                    className="shrink-0 rounded-xl border border-cyan-200/15 bg-sky-950/20 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/30"
                    href={`/modules/${m.id}`}
                  >
                    Open
                  </Link>
                </div>
              ))}
              {modules.length === 0 ? (
                <div className="py-6 text-sm text-slate-100/70">{loading ? "Loading..." : "Belum ada module."}</div>
              ) : null}
            </div>
          </GlassPanel>
        </div>
      </main>

      <footer className="w-full border-t border-cyan-200/10 bg-sky-950/10 px-6 py-4">
        <div className="flex flex-col gap-1 text-xs text-slate-100/60 sm:flex-row sm:items-center sm:justify-between">
          <div>NalarXR · Web Admin</div>
          <div>
            {overview ? `Modules ${overview.modules} · Scenes ${overview.scenes} · Assets ${overview.assets}` : ""}
          </div>
        </div>
      </footer>
    </div>
  )
}
