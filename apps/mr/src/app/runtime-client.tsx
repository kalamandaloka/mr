"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { GlassPanel } from "@nalarxr/shared-ui"
import { fetchModuleManifest, fetchModules, fetchSceneManifest, type ModuleListItem } from "../services/api"
import { useRuntimeStore } from "../stores/runtimeStore"
import { SceneCanvas } from "../renderer/SceneCanvas"

function sanitizeRichText(input: string) {
  if (typeof window === "undefined") return input
  const html = input ?? ""
  const doc = new DOMParser().parseFromString(html, "text/html")

  for (const el of Array.from(doc.querySelectorAll("script,style,iframe,object,embed,link,meta"))) {
    el.remove()
  }

  const allowedTags = new Set([
    "A",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "DIV",
    "EM",
    "H1",
    "H2",
    "H3",
    "HR",
    "I",
    "IMG",
    "LI",
    "OL",
    "P",
    "PRE",
    "SPAN",
    "STRONG",
    "U",
    "UL",
    "VIDEO",
    "SOURCE",
  ])

  const isSafeUrl = (value: string) => {
    const v = value.trim().toLowerCase()
    if (v.startsWith("javascript:")) return false
    if (v.startsWith("data:text/html")) return false
    return v.startsWith("https://") || v.startsWith("http://") || v.startsWith("data:image/") || v.startsWith("blob:")
  }

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName
      if (!allowedTags.has(tag)) {
        const fragment = doc.createDocumentFragment()
        while (child.firstChild) fragment.appendChild(child.firstChild)
        child.replaceWith(fragment)
        continue
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        const value = attr.value
        if (name.startsWith("on")) child.removeAttribute(attr.name)
        else if (name === "style") child.removeAttribute(attr.name)
        else if ((name === "href" || name === "src") && !isSafeUrl(value)) child.removeAttribute(attr.name)
        else if (tag === "IMG" && !["src", "alt"].includes(name)) child.removeAttribute(attr.name)
        else if (tag === "A" && !["href", "target", "rel"].includes(name)) child.removeAttribute(attr.name)
        else if (tag === "VIDEO" && !["src", "controls", "poster"].includes(name)) child.removeAttribute(attr.name)
        else if (tag === "SOURCE" && !["src", "type"].includes(name)) child.removeAttribute(attr.name)
      }

      if (tag === "A") {
        const href = child.getAttribute("href")
        if (href && !isSafeUrl(href)) child.removeAttribute("href")
        if (child.getAttribute("target") === "_blank") {
          child.setAttribute("rel", "noreferrer noopener")
        }
      }

      walk(child)
    }
  }

  if (doc.body) walk(doc.body)
  return doc.body?.innerHTML ?? ""
}

export function RuntimeClient() {
  const searchParams = useSearchParams()
  const manifest = useRuntimeStore((s) => s.manifest)
  const openedContentBlockId = useRuntimeStore((s) => s.openedContentBlockId)
  const selectedObjectKey = useRuntimeStore((s) => s.selectedObjectKey)
  const assetIssues = useRuntimeStore((s) => s.assetIssues)
  const setCurrentScene = useRuntimeStore((s) => s.setCurrentScene)
  const setManifest = useRuntimeStore((s) => s.setManifest)
  const openContent = useRuntimeStore((s) => s.openContent)
  const selectObject = useRuntimeStore((s) => s.selectObject)

  const [modules, setModules] = useState<ModuleListItem[]>([])
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [moduleId, setModuleId] = useState("")
  const [sceneId, setSceneId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [moduleScenes, setModuleScenes] = useState<{ id: string; title: string; orderNo: number }[]>(
    [],
  )
  const [autoLoaded, setAutoLoaded] = useState(false)

  const openedBlock = manifest?.contentBlocks.find((b) => b.id === openedContentBlockId) ?? null

  useEffect(() => {
    if (modulesLoaded) return
    setModulesLoaded(true)
    void (async () => {
      try {
        const list = await fetchModules()
        setModules(list)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load modules failed")
      }
    })()
  }, [modulesLoaded])

  useEffect(() => {
    if (autoLoaded) return
    const qpModuleId = searchParams.get("moduleId")?.trim() ?? ""
    const qpSceneId = searchParams.get("sceneId")?.trim() ?? ""
    if (!qpModuleId && !qpSceneId) return

    setAutoLoaded(true)
    if (qpModuleId) setModuleId(qpModuleId)
    if (qpSceneId) setSceneId(qpSceneId)

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        if (qpModuleId) {
          const data = await fetchModuleManifest(qpModuleId)
          setModuleScenes(data.scenes.map((s) => ({ id: s.id, title: s.title, orderNo: s.orderNo })))
        }
        if (qpSceneId) {
          const data = await fetchSceneManifest(qpSceneId)
          setCurrentScene(qpModuleId || null, qpSceneId)
          setManifest(data)
          openContent(null)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Auto load failed")
      } finally {
        setLoading(false)
      }
    })()
  }, [autoLoaded, openContent, searchParams, setCurrentScene, setManifest])

  useEffect(() => {
    if (!moduleId.trim()) {
      setModuleScenes([])
      return
    }
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchModuleManifest(moduleId.trim())
        setModuleScenes(data.scenes.map((s) => ({ id: s.id, title: s.title, orderNo: s.orderNo })))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load module manifest failed")
      } finally {
        setLoading(false)
      }
    })()
  }, [moduleId])

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="text-lg font-semibold text-slate-100">NalarXR MR Runtime</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassPanel title="Loader" className="lg:col-span-1">
          <div className="flex flex-col gap-3">
            <label className="text-sm text-cyan-100/90">
              Module
              <select
                className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                value={moduleId}
                onChange={(e) => {
                  setSceneId("")
                  setModuleId(e.target.value)
                }}
              >
                <option value="">{modulesLoaded && modules.length === 0 ? "Tidak ada module published" : "Pilih module…"}</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.slug})
                  </option>
                ))}
              </select>
            </label>
            {modulesLoaded && modules.length === 0 && !error ? (
              <div className="text-xs text-slate-100/70">
                Runtime hanya menampilkan module berstatus published. Publish dari Web Admin (Modules → Publish All).
              </div>
            ) : null}

            <label className="text-sm text-cyan-100/90">
              Scene
              <select
                className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                value={sceneId}
                onChange={(e) => setSceneId(e.target.value)}
                disabled={!moduleId.trim() || !moduleScenes.length}
              >
                <option value="">{moduleId.trim() ? "Pilih scene…" : "Pilih module dulu…"}</option>
                {moduleScenes
                  .slice()
                  .sort((a, b) => a.orderNo - b.orderNo)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.orderNo}. {s.title}
                    </option>
                  ))}
              </select>
            </label>

            <button
              disabled={loading || !sceneId.trim()}
              className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  const data = await fetchSceneManifest(sceneId.trim())
                  setCurrentScene(moduleId.trim() || null, sceneId.trim())
                  setManifest(data)
                  openContent(null)
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Load scene manifest failed")
                } finally {
                  setLoading(false)
                }
              }}
            >
              Load Scene Manifest
            </button>

            {error ? <div className="text-sm text-rose-200">{error}</div> : null}
          </div>
        </GlassPanel>

        <div className="lg:col-span-2">
          {manifest ? (
            <div className="flex flex-col gap-4">
              <GlassPanel title="Scene">
                <div className="text-sm text-slate-100">
                  {manifest.scene.title}{" "}
                  <span className="text-slate-100/60">
                    ({manifest.scene.type} · order {manifest.scene.orderNo})
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-100/70">
                  preset: {manifest.environment.preset} · passthrough:{" "}
                  {manifest.environment.passthrough ? "true" : "false"}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <div className="text-slate-100/70">
                    selected:{" "}
                    <span className="text-slate-100">
                      {selectedObjectKey ?? "-"}
                    </span>
                  </div>
                  <button
                    className="rounded-xl border border-cyan-200/20 bg-sky-950/30 px-3 py-1.5 text-cyan-100 hover:bg-sky-950/40"
                    onClick={() => {
                      selectObject(null)
                      openContent(null)
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </GlassPanel>

              <SceneCanvas manifest={manifest} />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <GlassPanel title="Objects">
                  <div className="space-y-2 text-xs text-slate-100/85">
                    {manifest.objects.map((o) => (
                      <div key={o.objectKey} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-slate-100">{o.objectName}</div>
                          <div className="text-slate-100/60">{o.objectKey}</div>
                          {assetIssues[o.objectKey] ? (
                            <div className="mt-1 text-[11px] text-rose-200">asset error: {assetIssues[o.objectKey]}</div>
                          ) : null}
                        </div>
                        <div className="text-slate-100/60">{o.interactive ? "interactive" : "static"}</div>
                      </div>
                    ))}
                    {manifest.objects.length === 0 ? (
                      <div className="text-slate-100/70">Tidak ada object.</div>
                    ) : null}
                  </div>
                </GlassPanel>

                <GlassPanel title="Content">
                  {openedBlock ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-100">{openedBlock.title ?? "Untitled"}</div>
                      {openedBlock.body ? (
                        <div
                          className="text-sm text-slate-100/85"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichText(openedBlock.body) }}
                        />
                      ) : (
                        <div className="text-sm text-slate-100/70">Tidak ada body.</div>
                      )}
                      <button
                        className="mt-2 rounded-xl border border-cyan-200/20 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                        onClick={() => openContent(null)}
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-100/70">
                      Klik object interactive untuk trigger interaction (contoh: open_content).
                    </div>
                  )}
                </GlassPanel>
              </div>
            </div>
          ) : (
            <GlassPanel title="No Scene Loaded">
              <div className="text-sm text-slate-100/70">
                Muat scene manifest dari backend untuk mulai render placeholder object dan UI.
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </main>
  )
}
