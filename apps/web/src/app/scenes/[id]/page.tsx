"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { GlassPanel } from "@nalarxr/shared-ui"
import { apiBaseUrl, apiFetch } from "../../../lib/api"

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

function isRichTextEmpty(html: string) {
  if (typeof window === "undefined") return !html.trim()
  const doc = new DOMParser().parseFromString(html, "text/html")
  if (doc.querySelector("img,video,source")) return false
  const text = doc.body?.textContent ?? ""
  return text.trim().length === 0
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  }, [value])

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    onChange(ref.current?.innerHTML ?? "")
  }

  return (
    <div className="mt-1 rounded-xl border border-cyan-200/15 bg-sky-950/30">
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-200/10 px-2 py-2">
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => exec("bold")}
        >
          Bold
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => exec("italic")}
        >
          Italic
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => exec("underline")}
        >
          Underline
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => exec("insertUnorderedList")}
        >
          Bullet
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => {
            const url = window.prompt("Link URL (https://...)")?.trim() ?? ""
            if (!url) return
            exec("createLink", url)
          }}
        >
          Link
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => {
            const url = window.prompt("Image URL (https://... / data:image/... )")?.trim() ?? ""
            if (!url) return
            exec("insertHTML", `<img src="${escapeAttr(url)}" alt="" />`)
          }}
        >
          Image
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-200/15 bg-sky-950/30 px-2 py-1 text-xs text-cyan-100 hover:bg-sky-950/40"
          onClick={() => {
            const url = window.prompt("Video URL (https://...mp4)")?.trim() ?? ""
            if (!url) return
            exec("insertHTML", `<video controls src="${escapeAttr(url)}"></video>`)
          }}
        >
          Video
        </button>
      </div>
      <div
        ref={ref}
        className="min-h-24 px-3 py-2 text-slate-100 outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      />
    </div>
  )
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

type AssetRow = {
  id: string
  name: string
  fileType: string
  fileUrl: string
  size: number | null
}

type SceneObjectRow = {
  id: string
  sceneId: string
  assetId: string
  objectKey: string
  objectName: string
  positionX: number
  positionY: number
  positionZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
  scaleX: number
  scaleY: number
  scaleZ: number
  isInteractive: boolean
  asset?: AssetRow
}

type ContentBlockRow = {
  id: string
  sceneId: string
  blockType: string
  title: string | null
  body: string | null
  mediaUrl: string | null
  triggerType: string | null
  targetObjectKey: string | null
  orderNo: number
  isActive: boolean
}

type InteractionRow = {
  id: string
  sceneId: string
  objectKey: string
  interactionType: string
  actionType: string
  targetType: string | null
  targetRef: string | null
  priority: number
  isActive: boolean
}

type PracticeStepRow = {
  id: string
  sceneId: string
  stepNo: number
  title: string
  instruction: string
  expectedAction: string
  targetObjectKey: string | null
  targetAnchorKey: string | null
  successFeedback: string | null
  failFeedback: string | null
  scoreValue: number | null
}

type EvaluationRow = {
  id: string
  sceneId: string
  title: string
  evaluationType: string
  passingScore: number
  configJson: unknown
}

export default function SceneDetailPage() {
  const params = useParams<{ id: string }>()
  const sceneId = params.id
  const baseUrl = useMemo(() => apiBaseUrl(), [])
  const runtimeUrl = useMemo(() => {
    if (typeof window === "undefined") return "http://localhost:3001"
    return `https://${window.location.hostname}:3001`
  }, [])

  const [scene, setScene] = useState<SceneRow | null>(null)
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [objects, setObjects] = useState<SceneObjectRow[]>([])
  const [contentBlocks, setContentBlocks] = useState<ContentBlockRow[]>([])
  const [interactions, setInteractions] = useState<InteractionRow[]>([])
  const [practiceSteps, setPracticeSteps] = useState<PracticeStepRow[]>([])
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingScene, setSavingScene] = useState(false)

  const [sceneStatus, setSceneStatus] = useState("draft")

  const [assetId, setAssetId] = useState("")
  const [objectKey, setObjectKey] = useState("")
  const [objectName, setObjectName] = useState("")
  const [posX, setPosX] = useState(0)
  const [posY, setPosY] = useState(0)
  const [posZ, setPosZ] = useState(0)
  const [rotX, setRotX] = useState(0)
  const [rotY, setRotY] = useState(0)
  const [rotZ, setRotZ] = useState(0)
  const [scale, setScale] = useState(1)
  const [interactive, setInteractive] = useState(true)
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null)

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockType, setBlockType] = useState("card")
  const [blockTitle, setBlockTitle] = useState("")
  const [blockBody, setBlockBody] = useState("")
  const [blockOrderNo, setBlockOrderNo] = useState(0)
  const [blockTriggerType, setBlockTriggerType] = useState("")
  const [blockTargetObjectKey, setBlockTargetObjectKey] = useState("")
  const [blockIsActive, setBlockIsActive] = useState(true)

  const [interactionObjectKey, setInteractionObjectKey] = useState("")
  const [interactionTargetBlockId, setInteractionTargetBlockId] = useState("")
  const [interactionPriority, setInteractionPriority] = useState(0)

  const [stepNo, setStepNo] = useState(1)
  const [stepTitle, setStepTitle] = useState("")
  const [stepInstruction, setStepInstruction] = useState("")
  const [stepExpectedAction, setStepExpectedAction] = useState("")
  const [stepTargetObjectKey, setStepTargetObjectKey] = useState("")

  const [evaluationTitle, setEvaluationTitle] = useState("")
  const [evaluationType, setEvaluationType] = useState("quiz")
  const [evaluationPassingScore, setEvaluationPassingScore] = useState(0)
  const [evaluationConfigText, setEvaluationConfigText] = useState("{}")

  async function load() {
    setLoading(true)
    setError(null)

    const s = await apiFetch<SceneRow>(`/api/admin/scenes/${sceneId}`)
    const a = await apiFetch<AssetRow[]>("/api/admin/assets")
    const o = await apiFetch<SceneObjectRow[]>(`/api/admin/scenes/${sceneId}/objects`)
    const cb = await apiFetch<ContentBlockRow[]>(`/api/admin/scenes/${sceneId}/content-blocks`)
    const it = await apiFetch<InteractionRow[]>(`/api/admin/scenes/${sceneId}/interactions`)
    const ps = await apiFetch<PracticeStepRow[]>(`/api/admin/scenes/${sceneId}/practice-steps`)
    const ev = await apiFetch<EvaluationRow[]>(`/api/admin/scenes/${sceneId}/evaluations`)

    setLoading(false)
    if (!s.ok) return setError(s.error)
    if (!a.ok) return setError(a.error)
    if (!o.ok) return setError(o.error)
    if (!cb.ok) return setError(cb.error)
    if (!it.ok) return setError(it.error)
    if (!ps.ok) return setError(ps.error)
    if (!ev.ok) return setError(ev.error)

    setScene(s.data)
    setAssets(a.data)
    setObjects(o.data)
    setContentBlocks(cb.data)
    setInteractions(it.data)
    setPracticeSteps(ps.data)
    setEvaluations(ev.data)
    setSceneStatus(s.data.status)

    const firstAsset = a.data[0]
    if (!assetId && firstAsset) {
      setAssetId(firstAsset.id)
      setObjectName(firstAsset.name)
    }

    const firstObject = o.data[0]
    if (!interactionObjectKey && firstObject) {
      setInteractionObjectKey(firstObject.objectKey)
    }
    const firstBlock = cb.data[0]
    if (!interactionTargetBlockId && firstBlock) {
      setInteractionTargetBlockId(firstBlock.id)
    }
  }

  useEffect(() => {
    void load()
  }, [sceneId])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="text-lg font-semibold text-slate-100">Scene Detail</div>
      {error ? <div className="text-sm text-rose-200">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-slate-100/80">Loading...</div>
      ) : (
        <>
          <GlassPanel title="Scene">
            <div className="text-sm text-slate-100">
              {scene?.orderNo}. {scene?.title}{" "}
              <span className="text-slate-100/60">({scene?.sceneType} · {scene?.slug})</span>
            </div>
            <div className="mt-1 text-xs text-slate-100/70">status: {scene?.status}</div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm text-cyan-100/90">
                Status
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={sceneStatus}
                  onChange={(e) => setSceneStatus(e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
                  disabled={savingScene || !scene}
                  type="button"
                  onClick={async () => {
                    if (!scene) return
                    setSavingScene(true)
                    setError(null)
                    try {
                      const updated = await apiFetch<SceneRow>(`/api/admin/scenes/${sceneId}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: sceneStatus }),
                      })
                      if (!updated.ok) {
                        setError(updated.error)
                        return
                      }
                      await load()
                    } finally {
                      setSavingScene(false)
                    }
                  }}
                >
                  {savingScene ? "Saving..." : "Save"}
                </button>
                <button
                  className="ml-3 rounded-xl border border-cyan-200/15 bg-sky-950/30 px-4 py-2 text-sm text-cyan-100 hover:bg-sky-950/40 disabled:opacity-60"
                  disabled={savingScene}
                  type="button"
                  onClick={() => void load()}
                >
                  Refresh
                </button>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title="Add / Edit Object">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                if (!editingObjectId) {
                  const created = await apiFetch<SceneObjectRow>(`/api/admin/scenes/${sceneId}/objects`, {
                    method: "POST",
                    body: JSON.stringify({
                      assetId,
                      objectKey,
                      objectName,
                      position: [posX, posY, posZ],
                      rotation: [rotX, rotY, rotZ],
                      scale: [scale, scale, scale],
                      interactive,
                    }),
                  })
                  if (!created.ok) {
                    setError(created.error)
                    return
                  }
                  setObjectKey("")
                  await load()
                  return
                }

                const updated = await apiFetch<SceneObjectRow>(`/api/admin/scene-objects/${editingObjectId}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    objectName,
                    position: [posX, posY, posZ],
                    rotation: [rotX, rotY, rotZ],
                    scale: [scale, scale, scale],
                    interactive,
                  }),
                })
                if (!updated.ok) {
                  setError(updated.error)
                  return
                }
                setEditingObjectId(null)
                setObjectKey("")
                await load()
              }}
            >
              <label className="text-sm text-cyan-100/90 sm:col-span-6">
                Asset
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={assetId}
                  disabled={!!editingObjectId}
                  onChange={(e) => {
                    const id = e.target.value
                    setAssetId(id)
                    const a = assets.find((x) => x.id === id)
                    if (a) setObjectName(a.name)
                  }}
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.fileType})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-cyan-100/90 sm:col-span-3">
                Object Key
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={objectKey}
                  onChange={(e) => setObjectKey(e.target.value)}
                  placeholder="contoh: brake-caliper"
                  required
                  disabled={!!editingObjectId}
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-3">
                Object Name
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  required
                />
              </label>

              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Pos X
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={posX} onChange={(e) => setPosX(Number(e.target.value))} />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Pos Y
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={posY} onChange={(e) => setPosY(Number(e.target.value))} />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Pos Z
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={posZ} onChange={(e) => setPosZ(Number(e.target.value))} />
              </label>

              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Rot X
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={rotX} onChange={(e) => setRotX(Number(e.target.value))} />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Rot Y
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={rotY} onChange={(e) => setRotY(Number(e.target.value))} />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Rot Z
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={rotZ} onChange={(e) => setRotZ(Number(e.target.value))} />
              </label>

              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Scale
                <input className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35" type="number" step="0.01" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
              </label>

              <label className="flex items-center gap-2 text-sm text-cyan-100/90 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={interactive}
                  onChange={(e) => setInteractive(e.target.checked)}
                />
                Interactive
              </label>

              <div className="flex items-end sm:col-span-2">
                <button
                  className="w-full rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
                  type="submit"
                >
                  {editingObjectId ? "Save" : "Add"}
                </button>
              </div>
            </form>
            {editingObjectId ? (
              <div className="mt-3">
                <button
                  className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                  type="button"
                  onClick={() => {
                    setEditingObjectId(null)
                    setObjectKey("")
                    setObjectName("")
                    setPosX(0)
                    setPosY(0)
                    setPosZ(0)
                    setRotX(0)
                    setRotY(0)
                    setRotZ(0)
                    setScale(1)
                    setInteractive(true)
                  }}
                >
                  Cancel edit
                </button>
              </div>
            ) : null}
            <div className="mt-3 text-xs text-slate-100/60">
              Preview runtime MR:{" "}
              <a
                className="text-cyan-100 hover:underline"
                href={`${runtimeUrl}?sceneId=${encodeURIComponent(sceneId)}`}
                target="_blank"
                rel="noreferrer"
              >
                {runtimeUrl}?sceneId={sceneId}
              </a>{" "}
              · Backend:{" "}
              <a className="text-cyan-100 hover:underline" href={`${baseUrl}/api/runtime/scenes/${sceneId}/manifest`} target="_blank" rel="noreferrer">
                manifest
              </a>
            </div>
          </GlassPanel>

          <GlassPanel title="Objects in Scene">
            <div className="divide-y divide-cyan-200/10">
              {objects.map((o) => (
                <div key={o.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">
                      {o.objectName} <span className="text-slate-100/60">({o.objectKey})</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-100/70">
                      asset: {o.asset?.name ?? o.assetId} · pos [{o.positionX}, {o.positionY}, {o.positionZ}] · rot [
                      {o.rotationX}, {o.rotationY}, {o.rotationZ}] · scale [{o.scaleX}]
                      {" · "}
                      {o.isInteractive ? "interactive" : "static"}
                    </div>
                  </div>
                  <div className="shrink-0 space-x-2">
                    <button
                      className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                      type="button"
                      onClick={() => {
                        setError(null)
                        setEditingObjectId(o.id)
                        setAssetId(o.assetId)
                        setObjectKey(o.objectKey)
                        setObjectName(o.objectName)
                        setPosX(o.positionX)
                        setPosY(o.positionY)
                        setPosZ(o.positionZ)
                        setRotX(o.rotationX)
                        setRotY(o.rotationY)
                        setRotZ(o.rotationZ)
                        setScale(o.scaleX)
                        setInteractive(o.isInteractive)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-xl border border-rose-200/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/15"
                      type="button"
                      onClick={async () => {
                        setError(null)
                        const deleted = await apiFetch<void>(`/api/admin/scene-objects/${o.id}`, { method: "DELETE" })
                        if (!deleted.ok) {
                          setError(deleted.error)
                          return
                        }
                        if (editingObjectId === o.id) {
                          setEditingObjectId(null)
                        }
                        await load()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {objects.length === 0 ? <div className="py-6 text-sm text-slate-100/70">Belum ada object.</div> : null}
            </div>
          </GlassPanel>

          <GlassPanel title="Content Blocks">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)

                const safeBody = sanitizeRichText(blockBody)
                const bodyValue = isRichTextEmpty(safeBody) ? undefined : safeBody
                const payload = {
                  blockType,
                  title: blockTitle.trim() || undefined,
                  body: bodyValue,
                  triggerType: blockTriggerType.trim() || undefined,
                  targetObjectKey: blockTargetObjectKey.trim() || undefined,
                  orderNo: blockOrderNo,
                  isActive: blockIsActive,
                }

                if (!editingBlockId) {
                  const created = await apiFetch<ContentBlockRow>(`/api/admin/scenes/${sceneId}/content-blocks`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                  })
                  if (!created.ok) {
                    setError(created.error)
                    return
                  }
                } else {
                  const safeBody2 = sanitizeRichText(blockBody)
                  const bodyValue2 = isRichTextEmpty(safeBody2) ? null : safeBody2
                  const updated = await apiFetch<ContentBlockRow>(`/api/admin/content-blocks/${editingBlockId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      blockType,
                      title: blockTitle.trim() ? blockTitle.trim() : null,
                      body: bodyValue2,
                      triggerType: blockTriggerType.trim() ? blockTriggerType.trim() : null,
                      targetObjectKey: blockTargetObjectKey.trim() ? blockTargetObjectKey.trim() : null,
                      orderNo: blockOrderNo,
                      isActive: blockIsActive,
                    }),
                  })
                  if (!updated.ok) {
                    setError(updated.error)
                    return
                  }
                  setEditingBlockId(null)
                }

                setBlockTitle("")
                setBlockBody("")
                setBlockOrderNo(0)
                setBlockTriggerType("")
                setBlockTargetObjectKey("")
                setBlockIsActive(true)
                await load()
              }}
            >
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Type
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                >
                  <option value="card">card</option>
                  <option value="instruction">instruction</option>
                  <option value="hotspot">hotspot</option>
                  <option value="label">label</option>
                </select>
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-4">
                Title
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-6">
                Body
                <RichTextEditor value={blockBody} onChange={setBlockBody} />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Order No
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  type="number"
                  min={0}
                  step={1}
                  value={blockOrderNo}
                  onChange={(e) => setBlockOrderNo(Number(e.target.value))}
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Trigger Type
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={blockTriggerType}
                  onChange={(e) => setBlockTriggerType(e.target.value)}
                  placeholder="optional"
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Target Object
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={blockTargetObjectKey}
                  onChange={(e) => setBlockTargetObjectKey(e.target.value)}
                >
                  <option value="">(none)</option>
                  {objects.map((o) => (
                    <option key={o.id} value={o.objectKey}>
                      {o.objectKey}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-cyan-100/90 sm:col-span-2">
                <input type="checkbox" checked={blockIsActive} onChange={(e) => setBlockIsActive(e.target.checked)} />
                Active
              </label>
              <div className="flex items-end gap-3 sm:col-span-4">
                <button
                  className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
                  type="submit"
                >
                  {editingBlockId ? "Save" : "Add"}
                </button>
                {editingBlockId ? (
                  <button
                    className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-4 py-2 text-sm text-cyan-100 hover:bg-sky-950/40"
                    type="button"
                    onClick={() => {
                      setEditingBlockId(null)
                      setBlockType("card")
                      setBlockTitle("")
                      setBlockBody("")
                      setBlockOrderNo(0)
                      setBlockTriggerType("")
                      setBlockTargetObjectKey("")
                      setBlockIsActive(true)
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-5 divide-y divide-cyan-200/10">
              {contentBlocks.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">
                      {b.title ?? "Untitled"} <span className="text-slate-100/60">({b.blockType})</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-100/70">
                      id: {b.id} · orderNo: {b.orderNo} · {b.isActive ? "active" : "inactive"}
                      {b.targetObjectKey ? ` · target: ${b.targetObjectKey}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 space-x-2">
                    <button
                      className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                      type="button"
                      onClick={() => {
                        setEditingBlockId(b.id)
                        setBlockType(b.blockType || "card")
                        setBlockTitle(b.title ?? "")
                        setBlockBody(b.body ?? "")
                        setBlockOrderNo(b.orderNo ?? 0)
                        setBlockTriggerType(b.triggerType ?? "")
                        setBlockTargetObjectKey(b.targetObjectKey ?? "")
                        setBlockIsActive(b.isActive)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                      type="button"
                      onClick={async () => {
                        setError(null)
                        const toggled = await apiFetch<ContentBlockRow>(`/api/admin/content-blocks/${b.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ isActive: !b.isActive }),
                        })
                        if (!toggled.ok) {
                          setError(toggled.error)
                          return
                        }
                        await load()
                      }}
                    >
                      {b.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="rounded-xl border border-rose-200/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/15"
                      type="button"
                      onClick={async () => {
                        setError(null)
                        const deleted = await apiFetch<void>(`/api/admin/content-blocks/${b.id}`, { method: "DELETE" })
                        if (!deleted.ok) {
                          setError(deleted.error)
                          return
                        }
                        if (editingBlockId === b.id) setEditingBlockId(null)
                        await load()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {contentBlocks.length === 0 ? (
                <div className="py-6 text-sm text-slate-100/70">Belum ada content block.</div>
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel title="Interactions (select → open content)">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                if (!interactionObjectKey.trim()) {
                  setError("Object key wajib diisi")
                  return
                }
                if (!interactionTargetBlockId.trim()) {
                  setError("Target content block wajib diisi")
                  return
                }

                const created = await apiFetch<InteractionRow>(`/api/admin/scenes/${sceneId}/interactions`, {
                  method: "POST",
                  body: JSON.stringify({
                    objectKey: interactionObjectKey,
                    interactionType: "select",
                    actionType: "open_content",
                    targetType: "content_block",
                    targetRef: interactionTargetBlockId,
                    priority: interactionPriority,
                    isActive: true,
                  }),
                })
                if (!created.ok) {
                  setError(created.error)
                  return
                }
                await load()
              }}
            >
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Object Key
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={interactionObjectKey}
                  onChange={(e) => setInteractionObjectKey(e.target.value)}
                >
                  {objects.map((o) => (
                    <option key={o.id} value={o.objectKey}>
                      {o.objectKey}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-3">
                Content Block
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={interactionTargetBlockId}
                  onChange={(e) => setInteractionTargetBlockId(e.target.value)}
                >
                  {contentBlocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title ?? "Untitled"} ({b.blockType})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-1">
                Priority
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  type="number"
                  step={1}
                  value={interactionPriority}
                  onChange={(e) => setInteractionPriority(Number(e.target.value))}
                />
              </label>
              <div className="sm:col-span-6">
                <button
                  className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
                  type="submit"
                  disabled={objects.length === 0 || contentBlocks.length === 0}
                >
                  Add Interaction
                </button>
              </div>
            </form>

            <div className="mt-5 divide-y divide-cyan-200/10">
              {interactions.map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">
                      {i.objectKey} <span className="text-slate-100/60">({i.interactionType})</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-100/70">
                      {i.actionType} → {i.targetType ?? "-"}:{i.targetRef ?? "-"} · priority: {i.priority} ·{" "}
                      {i.isActive ? "active" : "inactive"}
                    </div>
                  </div>
                  <div className="shrink-0 space-x-2">
                    <button
                      className="rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-xs text-cyan-100 hover:bg-sky-950/40"
                      type="button"
                      onClick={async () => {
                        setError(null)
                        const updated = await apiFetch<InteractionRow>(`/api/admin/interactions/${i.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ isActive: !i.isActive }),
                        })
                        if (!updated.ok) {
                          setError(updated.error)
                          return
                        }
                        await load()
                      }}
                    >
                      {i.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="rounded-xl border border-rose-200/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/15"
                      type="button"
                      onClick={async () => {
                        setError(null)
                        const deleted = await apiFetch<void>(`/api/admin/interactions/${i.id}`, { method: "DELETE" })
                        if (!deleted.ok) {
                          setError(deleted.error)
                          return
                        }
                        await load()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {interactions.length === 0 ? (
                <div className="py-6 text-sm text-slate-100/70">Belum ada interaction.</div>
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel title="Practice Steps">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                const created = await apiFetch<PracticeStepRow>(`/api/admin/scenes/${sceneId}/practice-steps`, {
                  method: "POST",
                  body: JSON.stringify({
                    stepNo,
                    title: stepTitle,
                    instruction: stepInstruction,
                    expectedAction: stepExpectedAction,
                    targetObjectKey: stepTargetObjectKey.trim() ? stepTargetObjectKey.trim() : null,
                  }),
                })
                if (!created.ok) {
                  setError(created.error)
                  return
                }
                setStepNo(stepNo + 1)
                setStepTitle("")
                setStepInstruction("")
                setStepExpectedAction("")
                setStepTargetObjectKey("")
                await load()
              }}
            >
              <label className="text-sm text-cyan-100/90 sm:col-span-1">
                Step No
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  type="number"
                  min={0}
                  step={1}
                  value={stepNo}
                  onChange={(e) => setStepNo(Number(e.target.value))}
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-5">
                Title
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={stepTitle}
                  onChange={(e) => setStepTitle(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-6">
                Instruction
                <textarea
                  className="mt-1 min-h-20 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={stepInstruction}
                  onChange={(e) => setStepInstruction(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-4">
                Expected Action
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={stepExpectedAction}
                  onChange={(e) => setStepExpectedAction(e.target.value)}
                  required
                  placeholder='contoh: "select brake-caliper"'
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Target Object (optional)
                <select
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={stepTargetObjectKey}
                  onChange={(e) => setStepTargetObjectKey(e.target.value)}
                >
                  <option value="">(none)</option>
                  {objects.map((o) => (
                    <option key={o.id} value={o.objectKey}>
                      {o.objectKey}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-6">
                <button
                  className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15"
                  type="submit"
                >
                  Add Step
                </button>
              </div>
            </form>

            <div className="mt-5 divide-y divide-cyan-200/10">
              {practiceSteps.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">
                      {s.stepNo}. {s.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-100/70">
                      expected: {s.expectedAction}
                      {s.targetObjectKey ? ` · target: ${s.targetObjectKey}` : ""}
                    </div>
                  </div>
                  <button
                    className="shrink-0 rounded-xl border border-rose-200/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/15"
                    type="button"
                    onClick={async () => {
                      setError(null)
                      const deleted = await apiFetch<void>(`/api/admin/practice-steps/${s.id}`, { method: "DELETE" })
                      if (!deleted.ok) {
                        setError(deleted.error)
                        return
                      }
                      await load()
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {practiceSteps.length === 0 ? (
                <div className="py-6 text-sm text-slate-100/70">Belum ada practice step.</div>
              ) : null}
            </div>
          </GlassPanel>

          <GlassPanel title="Evaluation">
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setError(null)
                if (evaluations.length > 0) {
                  setError("Evaluation sudah ada. Hapus dulu jika ingin membuat baru.")
                  return
                }
                let config: unknown
                try {
                  config = JSON.parse(evaluationConfigText)
                } catch {
                  setError("Config harus JSON yang valid")
                  return
                }
                if (config == null || typeof config !== "object" || Array.isArray(config)) {
                  setError("Config harus berupa JSON object")
                  return
                }
                const created = await apiFetch<EvaluationRow>(`/api/admin/scenes/${sceneId}/evaluations`, {
                  method: "POST",
                  body: JSON.stringify({
                    title: evaluationTitle,
                    evaluationType,
                    config,
                    passingScore: evaluationPassingScore,
                  }),
                })
                if (!created.ok) {
                  setError(created.error)
                  return
                }
                setEvaluationTitle("")
                setEvaluationType("quiz")
                setEvaluationPassingScore(0)
                setEvaluationConfigText("{}")
                await load()
              }}
            >
              <label className="text-sm text-cyan-100/90 sm:col-span-4">
                Title
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={evaluationTitle}
                  onChange={(e) => setEvaluationTitle(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Type
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  value={evaluationType}
                  onChange={(e) => setEvaluationType(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-2">
                Passing Score
                <input
                  className="mt-1 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/35"
                  type="number"
                  min={0}
                  step={1}
                  value={evaluationPassingScore}
                  onChange={(e) => setEvaluationPassingScore(Number(e.target.value))}
                />
              </label>
              <label className="text-sm text-cyan-100/90 sm:col-span-6">
                Config (JSON)
                <textarea
                  className="mt-1 min-h-28 w-full rounded-xl border border-cyan-200/15 bg-sky-950/30 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-200/35"
                  value={evaluationConfigText}
                  onChange={(e) => setEvaluationConfigText(e.target.value)}
                />
              </label>
              <div className="sm:col-span-6">
                <button
                  className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-60"
                  type="submit"
                  disabled={evaluations.length > 0}
                >
                  Add Evaluation
                </button>
              </div>
            </form>

            <div className="mt-5 divide-y divide-cyan-200/10">
              {evaluations.map((ev) => (
                <div key={ev.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100">{ev.title}</div>
                    <div className="mt-0.5 text-xs text-slate-100/70">
                      {ev.evaluationType} · passingScore: {ev.passingScore} · id: {ev.id}
                    </div>
                  </div>
                  <button
                    className="shrink-0 rounded-xl border border-rose-200/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/15"
                    type="button"
                    onClick={async () => {
                      setError(null)
                      const deleted = await apiFetch<void>(`/api/admin/evaluations/${ev.id}`, { method: "DELETE" })
                      if (!deleted.ok) {
                        setError(deleted.error)
                        return
                      }
                      await load()
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {evaluations.length === 0 ? (
                <div className="py-6 text-sm text-slate-100/70">Belum ada evaluation.</div>
              ) : null}
            </div>
          </GlassPanel>
        </>
      )}
    </main>
  )
}
