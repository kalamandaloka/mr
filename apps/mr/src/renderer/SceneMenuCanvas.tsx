"use client"

import { Canvas } from "@react-three/fiber"
import { XR, createXRStore } from "@react-three/xr"
import { useMemo } from "react"
import { CanvasTexture, Color, LinearFilter, MeshStandardMaterial } from "three"
import type { SceneManifest } from "@nalarxr/shared-types"
import { XRControllerManager } from "../controllers/XRControllerManager"

export type SceneMenuItem = {
  id: string
  title: string
  orderNo: number
}

function createLabelTexture(title: string) {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  g.addColorStop(0, "rgba(8, 47, 73, 0.90)")
  g.addColorStop(1, "rgba(2, 6, 23, 0.92)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = "rgba(165, 243, 252, 0.28)"
  ctx.lineWidth = 10
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

  ctx.fillStyle = "rgba(165, 243, 252, 0.14)"
  ctx.fillRect(40, 64, canvas.width - 80, canvas.height - 128)

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)"
  ctx.font = "600 64px system-ui, -apple-system, Segoe UI, Roboto, Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const text = title.trim() || "Scene"
  const maxWidth = canvas.width - 140
  const lines: string[] = []
  const words = text.split(/\s+/g)
  let cur = ""
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next
      continue
    }
    if (cur) lines.push(cur)
    cur = w
  }
  if (cur) lines.push(cur)
  const limited = lines.slice(0, 2)

  const baseY = canvas.height / 2
  if (limited.length === 1) {
    ctx.fillText(limited[0] ?? "Scene", canvas.width / 2, baseY)
  } else {
    ctx.fillText(limited[0] ?? "Scene", canvas.width / 2, baseY - 42)
    ctx.fillText(limited[1] ?? "", canvas.width / 2, baseY + 42)
  }

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function MenuItem3D({
  item,
  index,
  selected,
  onSelect,
}: {
  item: SceneMenuItem
  index: number
  selected: boolean
  onSelect: (sceneId: string) => void
}) {
  const texture = useMemo(() => createLabelTexture(`${item.orderNo}. ${item.title}`), [item.orderNo, item.title])
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: "#0b1220",
      metalness: 0.1,
      roughness: 0.35,
      transparent: true,
      opacity: selected ? 0.98 : 0.86,
    })
    if (texture) m.map = texture
    return m
  }, [selected, texture])

  const angle = (index - 1) * 0.55
  const radius = 1.35
  const x = Math.sin(angle) * radius
  const z = -Math.cos(angle) * radius - 0.2

  return (
    <mesh
      position={[x, 1.35, z]}
      rotation={[0, angle, 0]}
      userData={{ objectKey: `menu:${item.id}` }}
      onClick={() => onSelect(item.id)}
      material={material}
    >
      <planeGeometry args={[1.05, 0.52]} />
    </mesh>
  )
}

export function SceneMenuCanvas({
  scenes,
  selectedSceneId,
  onSelectScene,
  onBack,
}: {
  scenes: SceneMenuItem[]
  selectedSceneId: string | null
  onSelectScene: (sceneId: string) => void
  onBack: () => void
}) {
  const xrStore = useMemo(() => createXRStore(), [])
  const bg = useMemo(() => new Color("#020617"), [])

  const dummyManifest: SceneManifest = {
    scene: { id: "__menu__", title: "Menu", type: "overview", orderNo: 0 },
    environment: { preset: "workshop-glass-blue", spawnPoint: [0, 1.6, 0], passthrough: true },
    objects: [],
    contentBlocks: [],
    interactions: [],
    practiceSteps: [],
    evaluation: null,
  }

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-cyan-200/15 bg-sky-950/20">
      <Canvas camera={{ position: [0, 1.6, 2.2], fov: 50 }}>
        <color attach="background" args={[bg]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 2]} intensity={1.15} />
        <XR store={xrStore}>
          <XRControllerManager
            manifest={dummyManifest}
            onMenu={onBack}
            canInteractObjectKey={(k) => k.startsWith("menu:")}
            onTriggerClickObjectKey={(k) => {
              if (!k.startsWith("menu:")) return false
              const id = k.slice(5)
              onSelectScene(id)
              return true
            }}
          />
          {scenes
            .slice()
            .sort((a, b) => a.orderNo - b.orderNo)
            .map((s, idx) => (
              <MenuItem3D
                key={s.id}
                item={s}
                index={idx}
                selected={selectedSceneId === s.id}
                onSelect={onSelectScene}
              />
            ))}
        </XR>
      </Canvas>
    </div>
  )
}
