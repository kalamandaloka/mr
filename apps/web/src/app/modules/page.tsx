"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiFetch } from "../../lib/api"

type ModuleRow = {
  id: string
  title: string
  slug: string
  status: "draft" | "published" | "archived"
  version: number
  updatedAt: string
}

export default function ModulesPage() {
  const [items, setItems] = useState<ModuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")

  const slugHint = useMemo(() => {
    if (slug.trim()) return null
    const s = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    return s || null
  }, [title, slug])

  async function load() {
    setLoading(true)
    setError(null)
    const result = await apiFetch<ModuleRow[]>("/api/admin/modules")
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setItems(result.data)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-100">Modules</div>
        <button
          className="rounded-xl border border-cyan-200/20 bg-sky-950/30 px-4 py-2 text-sm text-cyan-100 hover:bg-sky-950/40"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <GlassPanel title="Create Module">
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            const payload = {
              title,
              slug: slug.trim() || slugHint || "",
            }
            const created = await apiFetch<ModuleRow>("/api/admin/modules", {
              method: "POST",
              body: JSON.stringify(payload),
            })
            if (!created.ok) {
              setError(created.error)
              return
            }
            setTitle("")
            setSlug("")
            await load()
          }}
        >
          <label className="text-sm text-cyan-100/90">
            Title
            <input
              className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="text-sm text-cyan-100/90">
            Slug
            <input
              className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={slugHint ?? ""}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
              type="submit"
            >
              Create
            </button>
          </div>
        </form>
        {error ? <div className="mt-3 text-sm text-rose-200">{error}</div> : null}
      </GlassPanel>

      <GlassPanel title="List">
        {loading ? (
          <div className="text-sm text-slate-100/80">Loading...</div>
        ) : (
          <div className="divide-y divide-cyan-200/10">
            {items.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">{m.title}</div>
                  <div className="text-xs text-slate-100/70">
                    {m.slug} · v{m.version} · {m.status}
                  </div>
                </div>
                <Link
                  className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                  href={`/modules/${m.id}`}
                >
                  Open
                </Link>
              </div>
            ))}
            {items.length === 0 ? (
              <div className="py-6 text-sm text-slate-100/70">Belum ada module.</div>
            ) : null}
          </div>
        )}
      </GlassPanel>
    </main>
  )
}

