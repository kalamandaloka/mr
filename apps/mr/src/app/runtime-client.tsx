"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import { useSearchParams } from "next/navigation"
import { GlassPanel } from "@nalarxr/shared-ui"
import { fetchModuleManifest, fetchModules, fetchSceneManifest, type ModuleListItem } from "../services/api"
import { useRuntimeStore } from "../stores/runtimeStore"
import { SceneCanvas } from "../renderer/SceneCanvas"
import { createDebugManifest } from "../debug/createDebugManifest"
import { createXRStore } from "@react-three/xr"
type SceneMenuItem = { id: string; title: string; orderNo: number }

function sceneMeta(title: string) {
  const t = title.trim().toLowerCase()
  if (t.includes("orient")) {
    return { icon: "🧭", subtitle: "Mulai dari orientasi" }
  }
  if (t.includes("overview") || t.includes("ringkasan")) {
    return { icon: "✨", subtitle: "Pelajari dasar-dasar EV" }
  }
  if (t.includes("komponen") || t.includes("component")) {
    return { icon: "🧩", subtitle: "Kenali bagian utama" }
  }
  if (t.includes("cara") || t.includes("kerja") || t.includes("how")) {
    return { icon: "⚙️", subtitle: "Pahami alur kerja" }
  }
  if (t.includes("praktek") || t.includes("praktik") || t.includes("practice")) {
    return { icon: "🕹️", subtitle: "Coba simulasi interaktif" }
  }
  if (t.includes("evalu")) {
    return { icon: "✅", subtitle: "Uji pemahaman" }
  }
  if (t.includes("safety") || t.includes("aman")) {
    return { icon: "🛡️", subtitle: "Ikuti prosedur aman" }
  }
  return { icon: "⬡", subtitle: "Pilih untuk mulai" }
}

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

function parseBackendErrorMessage(input: string) {
  const trimmed = (input ?? "").trim()
  if (!trimmed) return ""
  if (!trimmed.startsWith("{")) return trimmed
  try {
    const json = JSON.parse(trimmed) as unknown
    if (json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string") {
      return (json as { error: string }).error
    }
  } catch {
    return trimmed
  }
  return trimmed
}

function formatRuntimeError(message: string) {
  const m = message
  const lower = m.toLowerCase()
  const isDb = lower.includes("can't reach database") || lower.includes("p1001") || lower.includes("prisma")
  if (isDb) {
    return {
      title: "Database Connection Error",
      body: "Backend tidak bisa terhubung ke database. Pastikan MySQL/MariaDB hidup, lalu coba lagi.",
      detail: m,
    }
  }
  return {
    title: "Runtime Error",
    body: m,
    detail: null as string | null,
  }
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
  const resetToDashboard = useRuntimeStore((s) => s.resetToDashboard)
  const xrSessionRequested = useRuntimeStore((s) => s.xrSessionRequested)
  const setXrSessionRequested = useRuntimeStore((s) => s.setXrSessionRequested)

  type Stage = "landing" | "scene_menu" | "runtime"

  const fallbackMotorImageUrl =
    "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=modern%20minimal%20iconic%203d%20render%20of%20an%20electric%20motorcycle%2C%20centered%2C%20clean%20silhouette%2C%20soft%20studio%20lighting%2C%20glassmorphism%20aesthetic%2C%20cyan%20and%20navy%20color%20palette%2C%20high%20contrast%2C%20no%20text%2C%20transparent%20background%20feel&image_size=square_hd"
  const fallbackCarImageUrl =
    "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=modern%20minimal%20iconic%203d%20render%20of%20an%20electric%20car%2C%20centered%2C%20clean%20silhouette%2C%20soft%20studio%20lighting%2C%20glassmorphism%20aesthetic%2C%20cyan%20and%20navy%20color%20palette%2C%20high%20contrast%2C%20no%20text%2C%20transparent%20background%20feel&image_size=square_hd"

  const [modules, setModules] = useState<ModuleListItem[]>([])
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<Stage>("landing")
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [scenes, setScenes] = useState<SceneMenuItem[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [autoLoaded, setAutoLoaded] = useState(false)
  const [debugAutoStarted, setDebugAutoStarted] = useState(false)
  const [xrEnterError, setXrEnterError] = useState<string | null>(null)

  const xrStore = useMemo(() => createXRStore(), [])

  const moduleCards = useMemo(() => {
    const isGlobal = (m: ModuleListItem) => {
      const slug = m.slug.trim().toLowerCase()
      const title = m.title.trim().toLowerCase()
      if (slug === "global-orientation") return true
      if (title === "global orientation") return true
      return false
    }
    const isPublished = (m: ModuleListItem) => m.status === "published"
    const pickImageUrl = (m: ModuleListItem) => {
      const slug = m.slug.trim().toLowerCase()
      const title = m.title.trim().toLowerCase()
      if (slug.includes("sepeda") || slug.includes("motor") || title.includes("sepeda") || title.includes("motor")) return fallbackMotorImageUrl
      if (slug.includes("mobil") || title.includes("mobil")) return fallbackCarImageUrl
      return fallbackCarImageUrl
    }

    return modules
      .filter(isPublished)
      .filter((m) => !isGlobal(m))
      .map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        imageUrl: pickImageUrl(m),
      }))
  }, [fallbackCarImageUrl, fallbackMotorImageUrl, modules])

  const openedBlock = manifest?.contentBlocks.find((b) => b.id === openedContentBlockId) ?? null

  const startDebugScene = useCallback(() => {
    setCurrentScene("__debug__", "__debug__")
    setManifest(createDebugManifest())
    openContent(null)
    selectObject(null)
  }, [openContent, selectObject, setCurrentScene, setManifest])

  const requestEnterXr = useCallback(async () => {
    try {
      setXrEnterError(null)
      const anyStore = xrStore as unknown as { enterAR?: () => Promise<unknown>; enterVR: () => Promise<unknown> }
      if (typeof anyStore.enterAR === "function") {
        await anyStore.enterAR()
      } else {
        await anyStore.enterVR()
      }
      const session = xrStore.getState().session
      if (!session) {
        setXrEnterError("XR session tidak terbentuk. Pastikan halaman HTTPS dan izin WebXR diterima.")
        return false
      }
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : "enterVR failed"
      setXrEnterError(message)
      return false
    }
  }, [xrStore])

  const setFriendlyError = useCallback((e: unknown, fallback: string) => {
    if (e instanceof Error) {
      const msg = parseBackendErrorMessage(e.message)
      setError(msg || fallback)
      return
    }
    setError(fallback)
  }, [])

  useEffect(() => {
    if (modulesLoaded) return
    setModulesLoaded(true)
    void (async () => {
      setModulesLoading(true)
      try {
        const list = await fetchModules()
        setModules(list)
      } catch (e) {
        setFriendlyError(e, "Load modules failed")
      } finally {
        setModulesLoading(false)
      }
    })()
  }, [modulesLoaded])

  useEffect(() => {
    if (autoLoaded) return
    const qpModuleId = searchParams.get("moduleId")?.trim() ?? ""
    const qpSceneId = searchParams.get("sceneId")?.trim() ?? ""
    if (!qpModuleId && !qpSceneId) return

    setAutoLoaded(true)

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        if (qpModuleId) {
          const data = await fetchModuleManifest(qpModuleId)
          setActiveModuleId(qpModuleId)
          setScenes(data.scenes.map((s) => ({ id: s.id, title: s.title, orderNo: s.orderNo })))
          setStage("scene_menu")
        }
        if (qpSceneId) {
          const data = await fetchSceneManifest(qpSceneId)
          setCurrentScene(qpModuleId || null, qpSceneId)
          setManifest(data)
          openContent(null)
          setSelectedSceneId(qpSceneId)
          setStage("runtime")
        }
      } catch (e) {
        setFriendlyError(e, "Auto load failed")
      } finally {
        setLoading(false)
      }
    })()
  }, [autoLoaded, openContent, searchParams, setCurrentScene, setFriendlyError, setManifest])

  useEffect(() => {
    if (debugAutoStarted) return
    const debug = searchParams.get("debug")?.trim().toLowerCase() ?? ""
    if (debug !== "true" && debug !== "1" && debug !== "yes") return
    if (manifest?.scene.id === "__debug__") {
      setDebugAutoStarted(true)
      return
    }
    startDebugScene()
    setDebugAutoStarted(true)
  }, [debugAutoStarted, manifest?.scene.id, searchParams, startDebugScene])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        startDebugScene()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [startDebugScene])

  useEffect(() => {
    if (!activeModuleId) return
    if (stage !== "scene_menu") return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchModuleManifest(activeModuleId)
        setScenes(data.scenes.map((s) => ({ id: s.id, title: s.title, orderNo: s.orderNo })))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load module manifest failed")
      } finally {
        setLoading(false)
      }
    })()
  }, [activeModuleId, stage])

  const goLanding = useCallback(() => {
    setError(null)
    setLoading(false)
    setSelectedSceneId(null)
    setScenes([])
    setActiveModuleId(null)
    setStage("landing")
    resetToDashboard()
  }, [resetToDashboard])

  const goSceneMenu = useCallback(() => {
    setError(null)
    setLoading(false)
    setStage("scene_menu")
    setManifest(null)
    openContent(null)
    selectObject(null)
    setXrSessionRequested(false)
  }, [openContent, selectObject, setManifest, setXrSessionRequested])

  useEffect(() => {
    const handler = () => {
      goLanding()
    }
    window.addEventListener("mr:go-home", handler)
    return () => window.removeEventListener("mr:go-home", handler)
  }, [goLanding])

  const handleChooseModule = async (moduleId: string) => {
    setLoading(true)
    setError(null)
    try {
      setActiveModuleId(moduleId)
      const data = await fetchModuleManifest(moduleId)
      setScenes(data.scenes.map((s) => ({ id: s.id, title: s.title, orderNo: s.orderNo })))
      setStage("scene_menu")
    } catch (e) {
      setFriendlyError(e, "Gagal memuat module")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectScene = async (id: string) => {
    flushSync(() => {
      setSelectedSceneId(id)
      setStage("runtime")
      setLoading(true)
      setError(null)
      openContent(null)
      selectObject(null)
      setManifest(null)
      setXrSessionRequested(true)
    })

    const entered = await requestEnterXr()
    if (!entered) {
      setStage("scene_menu")
      setLoading(false)
      setXrSessionRequested(false)
      setError("Gagal masuk XR. Pastikan izin WebXR/Immersive aktif.")
      return
    }

    try {
      const data = await fetchSceneManifest(id)
      setCurrentScene(activeModuleId || null, id)
      setManifest(data)
    } catch (e) {
      setFriendlyError(e, "Load scene manifest failed")
    } finally {
      setLoading(false)
    }
  }

  const retryCurrent = useCallback(async () => {
    setError(null)
    if (stage === "landing") {
      setModulesLoaded(false)
      setModules([])
      return
    }
    if (stage === "scene_menu" && activeModuleId) {
      setLoading(true)
      try {
        const data = await fetchModuleManifest(activeModuleId)
        setScenes(data.scenes.map((s) => ({ id: s.id, title: s.title, orderNo: s.orderNo })))
      } catch (e) {
        setFriendlyError(e, "Load module manifest failed")
      } finally {
        setLoading(false)
      }
      return
    }
    if (stage === "runtime" && selectedSceneId) {
      setLoading(true)
      try {
        const data = await fetchSceneManifest(selectedSceneId)
        setCurrentScene(activeModuleId || null, selectedSceneId)
        setManifest(data)
      } catch (e) {
        setFriendlyError(e, "Load scene manifest failed")
      } finally {
        setLoading(false)
      }
    }
  }, [activeModuleId, selectedSceneId, setCurrentScene, setFriendlyError, setManifest, stage])

  const isVideoUrl = (url: string) => {
    const u = url.toLowerCase()
    return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".ogg")
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {stage !== "landing" ? (
        <div className="fixed inset-0 z-0">
          <SceneCanvas
            manifest={stage === "runtime" ? manifest : null}
            xrStore={xrStore}
            fullBleed
            className={stage === "scene_menu" ? "pointer-events-none" : ""}
          />
        </div>
      ) : null}

      {stage === "landing" ? (
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {moduleCards.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={loading || modulesLoading}
                onClick={() => void handleChooseModule(c.id)}
                className={[
                  "group relative flex h-[360px] w-full flex-col overflow-hidden rounded-3xl border border-cyan-200/15 bg-sky-950/25 text-left backdrop-blur-md",
                  "hover:border-cyan-200/30 hover:bg-sky-950/30",
                  "disabled:opacity-60",
                ].join(" ")}
              >
                <div className="px-6 pt-6 text-center text-3xl font-semibold text-slate-100">{c.title}</div>
                <div className="flex flex-1 items-center justify-center px-6">
                  <img alt={c.title} src={c.imageUrl} className="h-44 w-44 rounded-3xl border border-cyan-200/10 object-cover" />
                </div>
                <div className="px-6 pb-6 text-center text-sm text-slate-100/70">Pilih untuk melanjutkan</div>
              </button>
            ))}
            {modulesLoaded && moduleCards.length === 0 && !error ? (
              <div className="md:col-span-2 text-sm text-slate-100/70">Belum ada module published.</div>
            ) : null}
            {error ? <div className="md:col-span-2 text-sm text-rose-200">{error}</div> : null}
          </div>
        </div>
      ) : null}

      {stage === "scene_menu" ? (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div />
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-100/80 backdrop-blur-xl hover:border-cyan-200/25 hover:bg-white/10"
                onClick={goLanding}
                disabled={loading}
              >
                ← Kembali
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scenes
                .slice()
                .sort((a, b) => a.orderNo - b.orderNo)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={[
                      "group w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-2xl",
                      "transition-transform duration-200 will-change-transform",
                      "hover:scale-[1.02] hover:border-cyan-200/40 hover:bg-white/10",
                      "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_32px_rgba(34,211,238,0.12)]",
                      "disabled:opacity-60",
                    ].join(" ")}
                    onClick={() => void handleSelectScene(s.id)}
                    disabled={loading}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl text-slate-100">
                        {sceneMeta(s.title).icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-lg font-semibold text-slate-100">{s.title}</div>
                        <div className="mt-1 text-xs text-slate-100/65">{sceneMeta(s.title).subtitle}</div>
                      </div>
                      <div className="pt-1 text-cyan-100/80 transition-transform duration-200 group-hover:translate-x-0.5">→</div>
                    </div>
                  </button>
                ))}
              {scenes.length === 0 ? <div className="text-sm text-slate-100/70">Tidak ada scene published.</div> : null}
            </div>
            {error ? <div className="mt-4 text-sm text-rose-200">{error}</div> : null}
          </div>
        </div>
      ) : null}

      {stage === "runtime" ? (
        <div className="relative z-10">
          {!xrSessionRequested && xrEnterError ? (
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-10 mx-auto max-w-xl px-6 text-center text-xs text-rose-200">
              {xrEnterError}
            </div>
          ) : null}
        </div>
      ) : null}

      {(loading || modulesLoading || error) && stage !== "landing" ? (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-6">
          <div className="pointer-events-auto w-full max-w-lg">
            <GlassPanel
              title={error ? formatRuntimeError(error).title : "Loading"}
              className="border-white/10 bg-white/5 backdrop-blur-2xl"
            >
              {error ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-100/85">{formatRuntimeError(error).body}</div>
                  {formatRuntimeError(error).detail ? (
                    <pre className="max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-100/70">
                      {formatRuntimeError(error).detail}
                    </pre>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-xl border border-cyan-200/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
                    onClick={() => void retryCurrent()}
                  >
                    Coba lagi
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-100/70">Memuat data...</div>
              )}
            </GlassPanel>
          </div>
        </div>
      ) : null}
    </main>
  )
}
