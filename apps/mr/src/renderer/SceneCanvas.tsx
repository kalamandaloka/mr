"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { MeshTransmissionMaterial } from "@react-three/drei"
import type { SceneManifest, Vec3 } from "@nalarxr/shared-types"
import { Interactive, XR, type XRStore } from "@react-three/xr"
import type { ReactNode, RefObject } from "react"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ACESFilmicToneMapping,
  AudioListener,
  Box3,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  LoadingManager,
  Matrix4,
  Object3D,
  PositionalAudio,
  PCFSoftShadowMap,
  PMREMGenerator,
  Ray,
  Shape,
  ShapeGeometry,
  Sphere,
  Quaternion,
  Vector3,
  VideoTexture,
} from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { resolveSelectInteraction } from "../controllers/interactionController"
import { XRControllerManager } from "../controllers/XRControllerManager"
import { apiBaseUrl } from "../services/api"
import { useRuntimeStore } from "../stores/runtimeStore"
import { DebugBoxObject } from "./DebugBoxObject"
import { GlassPanel } from "@nalarxr/shared-ui"

function vec3(v: Vec3) {
  return [v[0], v[1], v[2]] as [number, number, number]
}

function resolveAssetUrl(url: string) {
  const raw = url.trim()
  const full = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : raw.startsWith("/")
      ? `${apiBaseUrl()}${raw}`
      : `${apiBaseUrl()}/${raw}`
  return encodeURI(full)
}

function RuntimeEnvironment() {
  const { gl, scene } = useThree()
  const envRef = useRef<PMREMGenerator | null>(null)

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping
    gl.toneMappingExposure = 1
    gl.shadowMap.enabled = true
    gl.shadowMap.type = PCFSoftShadowMap

    if (scene.environment) return
    const pmrem = new PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    envRef.current = pmrem
    const env = new RoomEnvironment()
    scene.environment = pmrem.fromScene(env, 0.04).texture
    return () => {
      envRef.current?.dispose()
      envRef.current = null
    }
  }, [gl, scene])

  return null
}

function stripHtml(input: string) {
  return (input ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function createTextTexture({
  title,
  body,
  width,
  height,
}: {
  title: string
  body: string
  width: number
  height: number
}) {
  const canvas = document.createElement("canvas")
  canvas.width = Math.floor(width)
  canvas.height = Math.floor(height)
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const w = canvas.width
  const h = canvas.height

  const pad = 54
  let y = pad
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
  ctx.font = "700 46px Inter, system-ui, -apple-system, Segoe UI, Roboto"
  ctx.fillText(title, pad, y)

  y += 28
  ctx.strokeStyle = "rgba(255, 255, 255, 0.20)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pad, y)
  ctx.lineTo(w - pad, y)
  ctx.stroke()

  y += 48
  ctx.fillStyle = "rgba(255, 255, 255, 0.60)"
  ctx.font = "400 32px Inter, system-ui, -apple-system, Segoe UI, Roboto"

  const maxWidth = w - pad * 2
  const words = body.split(" ")
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth) {
      ctx.fillText(line, pad, y)
      line = word
      y += 40
      if (y > h - pad) break
    } else {
      line = next
    }
  }
  if (line && y <= h - pad) ctx.fillText(line, pad, y)

  const tex = new CanvasTexture(canvas)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function createLightPanelTextTexture({
  title,
  body,
  width,
  height,
}: {
  title: string
  body: string
  width: number
  height: number
}) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const w = canvas.width
  const h = canvas.height
  const pad = 54
  let y = pad

  ctx.fillStyle = "rgba(255, 255, 255, 0.98)"
  ctx.font = "700 48px Inter, system-ui, -apple-system, Segoe UI, Roboto"
  ctx.fillText(title, pad, y)

  y += 28
  ctx.strokeStyle = "rgba(255, 255, 255, 0.20)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pad, y)
  ctx.lineTo(w - pad, y)
  ctx.stroke()

  y += 48
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)"
  ctx.font = "400 32px Inter, system-ui, -apple-system, Segoe UI, Roboto"

  const words = body.split(/\s+/g)
  const maxWidth = w - pad * 2
  let line = ""
  for (let i = 0; i < words.length; i++) {
    const word = words[i] ?? ""
    if (!word) continue
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
      continue
    }
    ctx.fillText(line, pad, y)
    line = word
    y += 40
    if (y > h - pad) break
  }
  if (line && y <= h - pad) ctx.fillText(line, pad, y)

  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createFrostBlurTexture({ size, blurPx }: { size: number; blurPx: number }) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, "rgba(203,203,203,0.32)")
  grad.addColorStop(0.5, "rgba(203,203,203,0.22)")
  grad.addColorStop(1, "rgba(203,203,203,0.30)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const prev = (ctx as unknown as { filter?: string }).filter
  ;(ctx as unknown as { filter?: string }).filter = `blur(${blurPx}px)`
  ctx.drawImage(canvas, 0, 0)
  ;(ctx as unknown as { filter?: string }).filter = prev

  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createRoundedRectGeometry({
  width,
  height,
  radius,
  curveSegments,
}: {
  width: number
  height: number
  radius: number
  curveSegments: number
}) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  const w = width
  const h = height
  const x = -w / 2
  const y = -h / 2

  const shape = new Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  shape.lineTo(x + w, y + h - r)
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  shape.lineTo(x + r, y + h)
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  shape.lineTo(x, y + r)
  shape.absarc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2, false)
  shape.closePath()

  const geom = new ShapeGeometry(shape, curveSegments)
  geom.computeVertexNormals()
  return geom
}

function createRoundedRectRingGeometry({
  width,
  height,
  radius,
  border,
  curveSegments,
}: {
  width: number
  height: number
  radius: number
  border: number
  curveSegments: number
}) {
  const w = width
  const h = height
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2))
  const b = Math.max(0, Math.min(border, Math.min(w, h) / 2 - 1e-6))

  const outer = new Shape()
  const x = -w / 2
  const y = -h / 2
  outer.moveTo(x + r, y)
  outer.lineTo(x + w - r, y)
  outer.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  outer.lineTo(x + w, y + h - r)
  outer.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  outer.lineTo(x + r, y + h)
  outer.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  outer.lineTo(x, y + r)
  outer.absarc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2, false)
  outer.closePath()

  const iw = w - b * 2
  const ih = h - b * 2
  const ir = Math.max(0, r - b)
  const ix = -iw / 2
  const iy = -ih / 2
  const hole = new Shape()
  hole.moveTo(ix + ir, iy)
  hole.lineTo(ix + iw - ir, iy)
  hole.absarc(ix + iw - ir, iy + ir, ir, -Math.PI / 2, 0, false)
  hole.lineTo(ix + iw, iy + ih - ir)
  hole.absarc(ix + iw - ir, iy + ih - ir, ir, 0, Math.PI / 2, false)
  hole.lineTo(ix + ir, iy + ih)
  hole.absarc(ix + ir, iy + ih - ir, ir, Math.PI / 2, Math.PI, false)
  hole.lineTo(ix, iy + ir)
  hole.absarc(ix + ir, iy + ir, ir, Math.PI, (Math.PI * 3) / 2, false)
  hole.closePath()

  outer.holes.push(hole)
  const geom = new ShapeGeometry(outer, curveSegments)
  geom.computeVertexNormals()
  return geom
}

function createRoundedAlphaTexture({ size, radiusPx }: { size: number; radiusPx: number }) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = "white"
  const r = Math.max(1, Math.min(radiusPx, size / 2))
  const pad = 0
  const w = size - pad * 2
  const h = size - pad * 2
  const x = pad
  const y = pad
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createShadowTexture({ size }: { size: number }) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.clearRect(0, 0, size, size)
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size * 0.55)
  grad.addColorStop(0, "rgba(0,0,0,0.38)")
  grad.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createTopHighlightTexture({ size }: { size: number }) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.clearRect(0, 0, size, size)
  const grad = ctx.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0, "rgba(255,255,255,0.95)")
  grad.addColorStop(0.25, "rgba(255,255,255,0.25)")
  grad.addColorStop(0.6, "rgba(255,255,255,0)")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createIconTexture({ icon }: { icon: "play" | "pause" }) {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)"
  ctx.beginPath()
  ctx.arc(256, 256, 220, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(256, 256, 220, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)"
  if (icon === "play") {
    ctx.beginPath()
    ctx.moveTo(240, 206)
    ctx.lineTo(240, 306)
    ctx.lineTo(332, 256)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillRect(226, 212, 40, 88)
    ctx.fillRect(290, 212, 40, 88)
  }

  const tex = new CanvasTexture(canvas)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function createPlayTriangleGeometry() {
  const shape = new Shape()
  shape.moveTo(-0.03, -0.038)
  shape.lineTo(-0.03, 0.038)
  shape.lineTo(0.045, 0)
  shape.closePath()
  const geom = new ShapeGeometry(shape, 1)
  geom.computeVertexNormals()
  return geom
}

const tmpRaycastPoint = new Vector3()
const tmpRaycastSphere = new Sphere()

const tmpRaycastInv = new Matrix4()
const tmpRaycastRay = new Ray()
const tmpRaycastBox = new Box3()
const tmpRaycastBoxHit = new Vector3()

function raycastBounds(this: unknown, raycaster: unknown, intersects: unknown[]) {
  const mesh = this as unknown as { geometry?: { boundingSphere?: Sphere | null; computeBoundingSphere?: () => void }; matrixWorld: unknown }
  const rc = raycaster as unknown as { ray: { intersectSphere: (sphere: Sphere, target: Vector3) => Vector3 | null; origin: Vector3 }; near: number; far: number }
  if (!mesh.geometry) return
  if (!mesh.geometry.boundingSphere) {
    mesh.geometry.computeBoundingSphere?.()
  }
  const bs = mesh.geometry.boundingSphere
  if (!bs) return
  tmpRaycastSphere.copy(bs)
  tmpRaycastSphere.applyMatrix4(mesh.matrixWorld as never)
  const hit = rc.ray.intersectSphere(tmpRaycastSphere, tmpRaycastPoint)
  if (!hit) return
  const distance = rc.ray.origin.distanceTo(tmpRaycastPoint)
  if (distance < rc.near || distance > rc.far) return
  ;(intersects as unknown as Array<{ distance: number; point: Vector3; object: unknown }>).push({
    distance,
    point: tmpRaycastPoint.clone(),
    object: this,
  })
}

function raycastLocalBox(this: unknown, raycaster: unknown, intersects: unknown[]) {
  const mesh = this as unknown as { geometry?: { boundingBox?: Box3 | null; computeBoundingBox?: () => void }; matrixWorld: Matrix4 }
  const rc = raycaster as unknown as { ray: Ray; near: number; far: number }
  if (!mesh.geometry) return
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox?.()
  }
  const bb = mesh.geometry.boundingBox
  if (!bb) return

  tmpRaycastBox.copy(bb)
  tmpRaycastInv.copy(mesh.matrixWorld).invert()
  tmpRaycastRay.copy(rc.ray).applyMatrix4(tmpRaycastInv)
  const hit = tmpRaycastRay.intersectBox(tmpRaycastBox, tmpRaycastBoxHit)
  if (!hit) return
  tmpRaycastPoint.copy(tmpRaycastBoxHit).applyMatrix4(mesh.matrixWorld)
  const distance = rc.ray.origin.distanceTo(tmpRaycastPoint)
  if (distance < rc.near || distance > rc.far) return
  ;(intersects as unknown as Array<{ distance: number; point: Vector3; object: unknown }>).push({
    distance,
    point: tmpRaycastPoint.clone(),
    object: this,
  })
}

function WorldCard({
  objectKey,
  position,
  title,
  body,
  visible,
  onRegisterObject,
}: {
  objectKey: string
  position: Vec3
  title: string
  body: string
  visible: boolean
  onRegisterObject?: (obj: any | null) => void
}) {
  const gripRotatingObjectKey = useRuntimeStore((s) => s.gripRotatingObjectKey)
  const isRotating = gripRotatingObjectKey === objectKey
  const ref = useRef<Group | null>(null)

  const tex = useMemo(() => {
    if (typeof document === "undefined") return null
    return createLightPanelTextTexture({ title, body, width: 1024, height: 640 })
  }, [body, title])

  if (!visible || !tex) return null

  const baseRadius = 0.02
  const baseGeom = useMemo(() => new RoundedBoxGeometry(0.66, 0.39, 0.006, 8, baseRadius), [baseRadius])
  const edgesGeom = useMemo(() => new EdgesGeometry(baseGeom), [baseGeom])
  const shadowTex = useMemo(() => (typeof document === "undefined" ? null : createShadowTexture({ size: 512 })), [])

  const zOffsetKonten = 0.01

  return (
    <group
      userData={{ objectKey }}
      position={vec3(position)}
      ref={(node) => {
        ref.current = node as Group | null
        onRegisterObject?.(node)
      }}
      frustumCulled={false}
      visible={visible}
    >
      <mesh renderOrder={1} position={[0, 0, -0.01]}>
        <planeGeometry args={[0.72, 0.45]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1} raycast={() => {}} geometry={baseGeom}>
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.36}
          roughness={0.1}
          depthWrite={false}
          depthTest
        />
      </mesh>
      {shadowTex ? (
        <mesh renderOrder={1} position={[0, 0, -0.05]} raycast={() => {}}>
          <planeGeometry args={[0.82, 0.56]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ) : null}
      <lineSegments renderOrder={2} geometry={edgesGeom}>
        <lineBasicMaterial color="#ffffff" transparent opacity={1} depthWrite={false} depthTest />
      </lineSegments>
      <mesh renderOrder={3} position={[0, 0.07, zOffsetKonten + 0.003]} raycast={() => {}}>
        <planeGeometry args={[0.56, 0.001]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.14} depthWrite={false} depthTest />
      </mesh>
      <mesh renderOrder={3} position={[0, 0.01, zOffsetKonten]} raycast={() => {}}>
        <planeGeometry args={[0.56, 0.29]} />
        <meshStandardMaterial map={tex} transparent opacity={0.98} depthWrite={false} depthTest side={DoubleSide} />
      </mesh>
    </group>
  )
}

function WorldVideo({
  id,
  label,
  position,
  mediaUrl,
  visible,
  onRegisterVideo,
  onRegisterObject,
}: {
  id: string
  label: string
  position: Vec3
  mediaUrl: string
  visible: boolean
  onRegisterVideo: (id: string, el: HTMLVideoElement | null) => void
  onRegisterObject?: (obj: any | null) => void
}) {
  const [ready, setReady] = useState(false)
  const isPlayable = isVideoUrl(mediaUrl)
  const isYouTube = isYouTubeUrl(mediaUrl)
  const playableUrl = isPlayable ? resolveAssetUrl(mediaUrl) : null
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const buttonMeshRef = useRef<any | null>(null)
  const [isPressed, setIsPressed] = useState(false)
  const videoDomRef = useRef<HTMLVideoElement | null>(null)
  const playInFlightRef = useRef(false)

  const hoverObject = useRuntimeStore((s) => s.hoverObject)

  const hoveredObjectKey = useRuntimeStore((s) => s.hoveredObjectKey)
  const isButtonHovered = hoveredObjectKey === `ui:video:${id}:toggle`
  const gripRotatingObjectKey = useRuntimeStore((s) => s.gripRotatingObjectKey)
  const isRotating = gripRotatingObjectKey === `cb:${id}`

  const { camera } = useThree()
  const audioListenerRef = useRef<AudioListener | null>(null)
  const positionalAudioRef = useRef<PositionalAudio | null>(null)
  const groupRef = useRef<Group | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!audioListenerRef.current) audioListenerRef.current = new AudioListener()
    const listener = audioListenerRef.current
    if (!listener) return
    const exists = camera.children.includes(listener)
    if (!exists) camera.add(listener)
    return () => {
      if (camera.children.includes(listener)) camera.remove(listener)
    }
  }, [camera])

  useEffect(() => {
    const v = videoRef.current
    const listener = audioListenerRef.current
    const g = groupRef.current
    if (!v || !listener || !g) return
    const audio = new PositionalAudio(listener)
    audio.setMediaElementSource(v)
    audio.setRefDistance(0.9)
    audio.setRolloffFactor(1)
    audio.setMaxDistance(8)
    audio.setVolume(1)
    g.add(audio)
    positionalAudioRef.current = audio
    return () => {
      g.remove(audio)
      positionalAudioRef.current = null
      try {
        audio.disconnect()
      } catch {
        // ignore
      }
    }
  }, [ready])
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null
    if (!playableUrl) return null
    const v = document.createElement("video")
    v.src = playableUrl
    v.crossOrigin = "anonymous"
    v.playsInline = true
    v.setAttribute("playsinline", "true")
    v.setAttribute("webkit-playsinline", "true")
    v.muted = true
    v.volume = 1
    v.loop = true
    v.preload = "auto"
    v.addEventListener("loadeddata", () => setReady(true), { once: true })
    v.addEventListener(
      "error",
      () => {
        const err = v.error
        console.log("Video error", { code: err?.code, message: err?.message, src: v.currentSrc || v.src })
      },
      { passive: true },
    )
    v.addEventListener("play", () => setIsPlaying(true))
    v.addEventListener("pause", () => setIsPlaying(false))
    videoRef.current = v
    onRegisterVideo(id, v)
    videoDomRef.current = v
    if (typeof document !== "undefined") {
      v.style.position = "fixed"
      v.style.left = "-9999px"
      v.style.top = "-9999px"
      v.style.width = "1px"
      v.style.height = "1px"
      v.style.opacity = "0"
      v.style.pointerEvents = "none"
      document.body.appendChild(v)
    }
    try {
      v.load()
    } catch {}
    const vt = new VideoTexture(v)
    vt.needsUpdate = true
    return vt
  }, [id, onRegisterVideo, playableUrl])

  useEffect(() => {
    return () => {
      videoRef.current?.pause()
      onRegisterVideo(id, null)
      if (videoDomRef.current && videoDomRef.current.parentElement) {
        videoDomRef.current.parentElement.removeChild(videoDomRef.current)
      }
      videoDomRef.current = null
      videoRef.current = null
      tex?.dispose()
    }
  }, [id, onRegisterVideo, tex])

  const playTriangleGeom = useMemo(() => createPlayTriangleGeometry(), [])
  const playCircleGeom = useMemo(() => new CircleGeometry(0.045, 48), [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (playInFlightRef.current) return
    console.log("Video Clicked")
    buttonMeshRef.current?.updateMatrixWorld(true)
    if (!v.paused) {
      v.pause()
      return
    }

    playInFlightRef.current = true
    v.muted = false
    v.volume = 1
    const p = v.play()
    Promise.resolve(p)
      .catch((e) => {
        console.log("Video play() failed, retry muted", e)
        v.muted = true
        return v.play()
      })
      .catch((e) => {
        const err = v.error
        console.log("Video play() failed", { error: e, mediaError: { code: err?.code, message: err?.message } })
      })
      .finally(() => {
        playInFlightRef.current = false
      })
  }, [])

  const fallbackTex = useMemo(() => {
    if (typeof document === "undefined") return null
    if (isPlayable) return null
    return createTextTexture({
      title: label,
      body: isYouTube
        ? "URL YouTube belum bisa dirender sebagai VideoTexture. Gunakan URL MP4/WebM atau upload video ke server."
        : `URL video tidak didukung: ${mediaUrl}`,
      width: 1024,
      height: 640,
    })
  }, [isPlayable, isYouTube, label, mediaUrl])

  const baseRadius = 0.02
  const baseGeom = useMemo(() => new RoundedBoxGeometry(0.66, 0.39, 0.006, 8, baseRadius), [baseRadius])
  const edgesGeom = useMemo(() => new EdgesGeometry(baseGeom), [baseGeom])
  const videoAlphaTex = useMemo(() => (typeof document === "undefined" ? null : createRoundedAlphaTexture({ size: 512, radiusPx: 26 })), [])
  const shadowTex = useMemo(() => (typeof document === "undefined" ? null : createShadowTexture({ size: 512 })), [])

  const zOffsetKonten = 0.01

  if (!visible) return null

  if (!isPlayable) {
    if (!fallbackTex) return null
    return (
      <group
        ref={(node) => {
          groupRef.current = node as Group | null
          onRegisterObject?.(node)
        }}
        position={vec3(position)}
        userData={{ objectKey: `cb:${id}` }}
        frustumCulled={false}
        visible={true}
      >
        <mesh renderOrder={1} position={[0, 0, -0.01]}>
          <planeGeometry args={[0.72, 0.45]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {shadowTex ? (
          <mesh renderOrder={1} position={[0, 0, -0.05]} raycast={() => {}}>
            <planeGeometry args={[0.82, 0.56]} />
            <meshBasicMaterial map={shadowTex} transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ) : null}
        <mesh renderOrder={1} raycast={() => {}} geometry={baseGeom}>
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.36}
            roughness={0.1}
            depthWrite={false}
            depthTest
          />
        </mesh>
        <lineSegments renderOrder={2} geometry={edgesGeom}>
          <lineBasicMaterial color="#ffffff" transparent opacity={1} depthWrite={false} depthTest />
        </lineSegments>
        <mesh renderOrder={3} position={[0, 0.1, zOffsetKonten + 0.003]} raycast={() => {}}>
          <planeGeometry args={[0.46, 0.001]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.2} depthWrite={false} depthTest />
        </mesh>
        <mesh renderOrder={3} position={[0, -0.03, zOffsetKonten + 0.003]} raycast={() => {}}>
          <planeGeometry args={[0.46, 0.19]} />
          <meshStandardMaterial
            map={fallbackTex}
            transparent
            opacity={0.95}
            depthWrite={false}
            depthTest
            side={DoubleSide}
            alphaMap={videoAlphaTex ?? undefined}
            alphaTest={0.02}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group
      ref={(node) => {
        groupRef.current = node as Group | null
        onRegisterObject?.(node)
      }}
      position={vec3(position)}
      userData={{ objectKey: `cb:${id}` }}
      frustumCulled={false}
      visible={true}
    >
      <mesh renderOrder={1} position={[0, 0, -0.01]}>
        <planeGeometry args={[0.72, 0.45]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1} raycast={() => {}} geometry={baseGeom}>
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.36}
          roughness={0.1}
          depthWrite={false}
          depthTest
        />
      </mesh>
      {shadowTex ? (
        <mesh renderOrder={1} position={[0, 0, -0.05]} raycast={() => {}}>
          <planeGeometry args={[0.82, 0.56]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ) : null}
      <lineSegments renderOrder={2} geometry={edgesGeom}>
        <lineBasicMaterial color="#ffffff" transparent opacity={1} depthWrite={false} depthTest />
      </lineSegments>
      <mesh renderOrder={3} position={[0, 0.1, zOffsetKonten + 0.003]} raycast={() => {}}>
        <planeGeometry args={[0.46, 0.001]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.2} depthWrite={false} depthTest />
      </mesh>
      <mesh renderOrder={3} position={[0, -0.03, zOffsetKonten + 0.003]} raycast={() => {}}>
        <planeGeometry args={[0.46, 0.19]} />
        <meshStandardMaterial
          map={tex ?? undefined}
          transparent
          opacity={0.95}
          depthWrite={false}
          depthTest
          side={DoubleSide}
          emissiveIntensity={ready ? 0.15 : 0.0}
          alphaMap={videoAlphaTex ?? undefined}
          alphaTest={0.02}
        />
      </mesh>
      {isPlayable ? (
        <Interactive
          onHover={(e) => {
            buttonMeshRef.current?.updateMatrixWorld(true)
            ;(e as unknown as { stopPropagation?: () => void })?.stopPropagation?.()
            hoverObject(`ui:video:${id}:toggle`)
          }}
          onBlur={(e) => {
            ;(e as unknown as { stopPropagation?: () => void })?.stopPropagation?.()
            hoverObject(null)
          }}
          onSelectStart={(e) => {
            ;(e as unknown as { stopPropagation?: () => void })?.stopPropagation?.()
            setIsPressed(true)
            togglePlay()
          }}
          onSelectEnd={(e) => {
            ;(e as unknown as { stopPropagation?: () => void })?.stopPropagation?.()
            setIsPressed(false)
          }}
        >
          <group
            position={[0, 0, 0.052]}
            scale={isPressed ? 1.06 : isButtonHovered ? 1.1 : 1}
            frustumCulled={false}
          >
            <mesh
              ref={(node) => {
                buttonMeshRef.current = node
              }}
              renderOrder={4}
              raycast={raycastLocalBox}
              userData={{ objectKey: `ui:video:${id}:toggle` }}
            >
              <boxGeometry args={[0.22, 0.22, 0.08]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh renderOrder={4} raycast={() => {}} geometry={playCircleGeom} position={[0, 0, 0.041]}>
              <meshPhysicalMaterial
                color="#ffffff"
                transparent
                opacity={isPressed ? 0.42 : 0.5}
                transmission={0.5}
                roughness={0.2}
                thickness={0.02}
                reflectivity={0.35}
                clearcoat={1}
                clearcoatRoughness={0.15}
                depthWrite={false}
                depthTest
                emissive={isButtonHovered ? "#ffffff" : "#000000"}
                emissiveIntensity={isButtonHovered ? 0.12 : 0}
                side={DoubleSide}
              />
            </mesh>
            <mesh renderOrder={4} raycast={() => {}} geometry={playTriangleGeom} position={[0, 0, 0.046]} scale={0.5}>
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
            </mesh>
          </group>
        </Interactive>
      ) : null}
    </group>
  )
}

function isVideoUrl(url: string) {
  const lower = url.toLowerCase()
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg")
}

function isYouTubeUrl(url: string) {
  const u = (url ?? "").trim().toLowerCase()
  return u.includes("youtube.com") || u.includes("youtu.be")
}

function FollowDomElement({
  world,
  elementRef,
  enabled,
  offsetPx,
}: {
  world: Vec3
  elementRef: RefObject<HTMLDivElement | null>
  enabled: boolean
  offsetPx: { x: number; y: number }
}) {
  const { camera, size } = useThree()
  const tmp = useMemo(() => new Vector3(), [])
  const last = useRef<{ x: number; y: number; visible: boolean } | null>(null)

  useFrame(() => {
    const el = elementRef.current
    if (!el) return
    if (!enabled) {
      if (el.style.opacity !== "0") el.style.opacity = "0"
      return
    }

    tmp.set(world[0], world[1], world[2]).project(camera)
    const visible = tmp.z > -1 && tmp.z < 1
    if (!visible) {
      if (el.style.opacity !== "0") el.style.opacity = "0"
      return
    }

    const x0 = (tmp.x * 0.5 + 0.5) * size.width
    const y0 = (-tmp.y * 0.5 + 0.5) * size.height

    const cardWidth = 380
    const x = Math.min(Math.max(x0, 16), Math.max(16, size.width - cardWidth - 16))
    const y = Math.min(Math.max(y0, 48), Math.max(48, size.height - 48))

    const prev = last.current
    if (!prev || prev.visible !== visible || Math.abs(prev.x - x) > 1 || Math.abs(prev.y - y) > 1) {
      last.current = { x, y, visible }
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.transform = `translate3d(${offsetPx.x}px, ${offsetPx.y}px, 0) translateY(-50%)`
      el.style.opacity = "1"
    }
  })

  return null
}

function DockVideoPanel({
  world,
  elementRef,
  enabled,
}: {
  world: Vec3
  elementRef: RefObject<HTMLDivElement | null>
  enabled: boolean
}) {
  const { camera, size } = useThree()
  const tmp = useMemo(() => new Vector3(), [])
  const last = useRef<{ side: "left" | "right" } | null>(null)

  useFrame(() => {
    const el = elementRef.current
    if (!el) return
    if (!enabled) {
      if (el.style.opacity !== "0") el.style.opacity = "0"
      return
    }
    tmp.set(world[0], world[1], world[2]).project(camera)
    const x = (tmp.x * 0.5 + 0.5) * size.width
    const side: "left" | "right" = x > size.width * 0.5 ? "left" : "right"
    if (!last.current || last.current.side !== side) {
      last.current = { side }
      el.style.opacity = "1"
      el.style.left = side === "left" ? "16px" : ""
      el.style.right = side === "right" ? "16px" : ""
    }
  })

  return null
}

function DesktopCameraRig({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const target = useMemo(() => new Vector3(0, 1.0, -0.8), [])

  useFrame(() => {
    if (!enabled) return
    camera.position.set(0, 1.6, 2.6)
    camera.lookAt(target)
  })

  return null
}

function PlaceholderObject({
  objectKey,
  objectName,
  position,
  rotation,
  scale,
  interactive,
  onSelect,
}: {
  objectKey: string
  objectName: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  interactive: boolean
  onSelect: () => void
}) {
  return (
    <mesh
      position={vec3(position)}
      rotation={vec3(rotation)}
      scale={vec3(scale)}
      onClick={interactive ? onSelect : undefined}
    >
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshStandardMaterial color={interactive ? "#22d3ee" : "#94a3b8"} />
    </mesh>
  )
}

function GltfObject({
  objectKey,
  assetUrl,
  position,
  rotation,
  scale,
  onIssue,
  onLoaded,
}: {
  objectKey: string
  assetUrl: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  onIssue?: (message: string) => void
  onLoaded?: () => void
}) {
  const resolved = useMemo(() => resolveAssetUrl(assetUrl), [assetUrl])
  const [cloned, setCloned] = useState<Group | null>(null)
  const [failed, setFailed] = useState(false)
  const [resourceFailed, setResourceFailed] = useState(false)
  const resourceFailedRef = useRef(false)
  const onIssueRef = useRef(onIssue)
  const onLoadedRef = useRef(onLoaded)
  const tmpBox = useMemo(() => new Box3(), [])
  const tmpSize = useMemo(() => new Vector3(), [])
  const tmpCenter = useMemo(() => new Vector3(), [])

  useEffect(() => {
    onIssueRef.current = onIssue
  }, [onIssue])

  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  useEffect(() => {
    setCloned(null)
    setFailed(false)
    setResourceFailed(false)
    resourceFailedRef.current = false
    let cancelled = false
    const manager = new LoadingManager()
    manager.onError = (url) => {
      if (cancelled) return
      const message = `Asset issue (${objectKey}) assetUrl=${assetUrl} url=${url}`
      onIssueRef.current?.(message)
      resourceFailedRef.current = true
      setResourceFailed(true)
    }
    const loader = new GLTFLoader(manager)
    loader.load(
      resolved,
      (gltf) => {
        if (cancelled) return
        if (resourceFailedRef.current) return
        const model = gltf.scene.clone(true) as unknown as Group
        model.traverse((obj) => {
          const o = obj as unknown as {
            isMesh?: boolean
            castShadow?: boolean
            receiveShadow?: boolean
            renderOrder?: number
            frustumCulled?: boolean
            material?: { needsUpdate?: boolean }
            geometry?: { computeBoundingBox?: () => void; computeBoundingSphere?: () => void }
          }
          o.frustumCulled = false
          if (o.material) o.material.needsUpdate = true
          if (o.isMesh) {
            o.castShadow = true
            o.receiveShadow = true
            o.renderOrder = 10
            o.frustumCulled = false
            o.geometry?.computeBoundingBox?.()
            o.geometry?.computeBoundingSphere?.()
          }
        })
        model.updateMatrixWorld(true)
        tmpBox.setFromObject(model)
        tmpBox.getSize(tmpSize)
        const maxDim = Math.max(tmpSize.x, tmpSize.y, tmpSize.z)
        if (Number.isFinite(maxDim) && maxDim > 0) {
          const targetMax = 0.25
          const raw = targetMax / maxDim
          const factor = Math.min(Math.max(raw, 0.01), 100)
          model.scale.multiplyScalar(factor)
        }
        model.updateMatrixWorld(true)
        tmpBox.setFromObject(model)
        tmpBox.getCenter(tmpCenter)
        const wrapper = new Group()
        wrapper.add(model)
        if (Number.isFinite(tmpCenter.x) && Number.isFinite(tmpCenter.y) && Number.isFinite(tmpCenter.z)) {
          model.position.sub(tmpCenter)
        }
      wrapper.updateMatrixWorld(true)
      wrapper.traverse((obj) => {
          const o = obj as unknown as {
            isMesh?: boolean
            renderOrder?: number
            frustumCulled?: boolean
            material?: { needsUpdate?: boolean }
            geometry?: { computeBoundingBox?: () => void; computeBoundingSphere?: () => void }
          }
          o.frustumCulled = false
          if (o.material) o.material.needsUpdate = true
          if (o.isMesh) {
            o.renderOrder = 10
            o.frustumCulled = false
            o.geometry?.computeBoundingBox?.()
            o.geometry?.computeBoundingSphere?.()
          }
        })
        wrapper.position.set(0, 0, 0)
        setCloned(wrapper)
        onLoadedRef.current?.()
      },
      undefined,
      () => {
        if (cancelled) return
        setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [assetUrl, objectKey, resolved, tmpBox, tmpCenter, tmpSize])

  if (failed || resourceFailed) {
    return (
      <mesh position={vec3(position)} rotation={vec3(rotation)} scale={vec3(scale)}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#fb7185" />
      </mesh>
    )
  }
  if (!cloned) return null
  return <primitive object={cloned} position={vec3(position)} rotation={vec3(rotation)} scale={vec3(scale)} />
}

function HudSpinner({ visible }: { visible: boolean }) {
  const ref = useRef<Group | null>(null)
  const { camera } = useThree()
  const tmpDir = useMemo(() => new Vector3(), [])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.visible = visible
    if (!visible) return
    camera.getWorldDirection(tmpDir)
    g.position.copy(camera.position).add(tmpDir.multiplyScalar(1.1))
    g.position.y = camera.position.y - 0.15
    g.quaternion.copy(camera.quaternion)
    g.rotation.z += dt * 2
  })

  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[0.08, 0.015, 12, 24]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

function PistonStabilizer({ pistonRef }: { pistonRef: RefObject<Group | null> }) {
  useFrame(() => {
    const g = pistonRef.current
    if (!g) return
    g.visible = true
    g.updateMatrixWorld(true)
    g.traverse((child) => {
      const c = child as unknown as { isMesh?: boolean; frustumCulled?: boolean; visible?: boolean; renderOrder?: number; material?: { needsUpdate?: boolean } }
      c.visible = true
      c.frustumCulled = false
      if (c.isMesh) c.renderOrder = 10
      // Removing c.material.needsUpdate = true to avoid unnecessary heavy work every frame
    })
  })
  return null
}

export function SceneCanvas({
  manifest,
  xrStore,
  fullBleed,
  className,
}: {
  manifest: SceneManifest | null
  xrStore: XRStore
  fullBleed?: boolean
  className?: string
}) {
  const [hasXrSession, setHasXrSession] = useState(false)
  useEffect(() => {
    const anyStore = xrStore as unknown as {
      subscribe: (
        selector: (s: { session?: XRSession | undefined }) => XRSession | undefined,
        listener: (session: XRSession | undefined) => void,
      ) => () => void
    }
    return anyStore.subscribe(
      (s) => s.session,
      (session) => {
        setHasXrSession(!!session)
      },
    )
  }, [xrStore])
  const selectObject = useRuntimeStore((s) => s.selectObject)
  const openContent = useRuntimeStore((s) => s.openContent)
  const selectedObjectKey = useRuntimeStore((s) => s.selectedObjectKey)
  const openedContentBlockId = useRuntimeStore((s) => s.openedContentBlockId)
  const objectTransforms = useRuntimeStore((s) => s.objectTransforms)
  const ensureObjectTransform = useRuntimeStore((s) => s.ensureObjectTransform)
  const setObjectTransform = useRuntimeStore((s) => s.setObjectTransform)
  const hoveredObjectKey = useRuntimeStore((s) => s.hoveredObjectKey)
  const setAssetIssue = useRuntimeStore((s) => s.setAssetIssue)
  const assetIssues = useRuntimeStore((s) => s.assetIssues)

  const bg = useMemo(() => new Color("#020617"), [])
  const debugMode = manifest?.scene.id === "__debug__"

  const object3DByKeyRef = useRef<Map<string, any>>(new Map())
  const registerObject3D = useCallback((key: string, obj: any | null) => {
    if (!obj) {
      object3DByKeyRef.current.delete(key)
      return
    }
    object3DByKeyRef.current.set(key, obj)
  }, [])
  const getObject3D = useCallback((key: string) => object3DByKeyRef.current.get(key) ?? null, [])

  const pistonRootRef = useRef<Group | null>(null)
  const stabilizePiston = useCallback(() => {
    const g = pistonRootRef.current
    if (!g) return
    g.updateMatrixWorld(true)
    g.traverse((child) => {
      const c = child as unknown as { isMesh?: boolean; frustumCulled?: boolean; renderOrder?: number }
      if (c.isMesh) {
        c.frustumCulled = false
        c.renderOrder = 10
      }
    })
  }, [])

  const objects = manifest?.objects ?? []
  const contentBlocks = manifest?.contentBlocks ?? []

  useEffect(() => {
    if (!manifest) return
    const anyManifest = manifest as unknown as Record<string, unknown>
    console.log("Manifest Data:", {
      scene: manifest.scene,
      objects: manifest.objects,
      contentBlocks: manifest.contentBlocks,
      cards: anyManifest.cards,
      videos: anyManifest.videos,
    })
  }, [manifest])


  const [xrSupport, setXrSupport] = useState<{
    secure: boolean
    hasXr: boolean
    immersiveVr: boolean | null
    error: string | null
  }>({ secure: true, hasXr: false, immersiveVr: null, error: null })

  useEffect(() => {
    const secure = typeof window !== "undefined" && window.isSecureContext
    const hasXr = typeof navigator !== "undefined" && "xr" in navigator
    if (!hasXr) {
      setXrSupport({ secure, hasXr, immersiveVr: false, error: null })
      return
    }

    const xr = (navigator as unknown as { xr: XRSystem }).xr
    void xr
      .isSessionSupported("immersive-vr")
      .then((supported) => {
        setXrSupport({ secure, hasXr: true, immersiveVr: supported, error: null })
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "WebXR check failed"
        setXrSupport({ secure, hasXr: true, immersiveVr: false, error: message })
      })
  }, [])

  const xrDisabled = !xrSupport.secure || !xrSupport.hasXr || xrSupport.immersiveVr === false
  const descPanelRef = useRef<HTMLDivElement | null>(null)
  const videoPanelRef = useRef<HTMLDivElement | null>(null)

  const openedBlock = useMemo(() => {
    if (!openedContentBlockId) return null
    return contentBlocks.find((b) => b.id === openedContentBlockId) ?? null
  }, [contentBlocks, openedContentBlockId])

  const primaryPistonPos: Vec3 = useMemo(() => [0, 1.0, -0.8] as Vec3, [])

  const cardBlocks = useMemo(() => {
    const anyManifest = manifest as unknown as { cards?: Array<Record<string, unknown>> } | null
    const raw = Array.isArray(anyManifest?.cards) ? anyManifest?.cards ?? [] : contentBlocks
    const normalized = raw
      .map((b) => {
        const bb = b as unknown as {
          id?: string
          type?: string
          title?: string
          body?: string
          orderNo?: number
          isActive?: boolean
          disabled?: boolean
        }
        return {
          id: bb.id ?? "",
          type: (bb.type ?? "card") as string,
          title: bb.title,
          body: bb.body,
          orderNo: bb.orderNo ?? 0,
          isActive: bb.isActive,
          disabled: bb.disabled,
        }
      })
      .filter((b) => b.id)
      .filter((b) => b.type !== "video")
      .filter((b) => b.disabled !== true)
      .filter((b) => b.isActive !== false)
      .slice()
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
    return normalized
  }, [contentBlocks, manifest])

  const videoBlocksNormalized = useMemo(() => {
    const anyManifest = manifest as unknown as { videos?: Array<Record<string, unknown>> } | null
    const raw = Array.isArray(anyManifest?.videos) ? anyManifest?.videos ?? [] : contentBlocks
    const normalized = raw
      .map((b) => {
        const bb = b as unknown as {
          id?: string
          type?: string
          title?: string
          mediaUrl?: string
          orderNo?: number
          isActive?: boolean
          disabled?: boolean
        }
        return {
          id: bb.id ?? "",
          type: (bb.type ?? "video") as string,
          title: bb.title,
          mediaUrl: bb.mediaUrl,
          orderNo: bb.orderNo ?? 0,
          isActive: bb.isActive,
          disabled: bb.disabled,
        }
      })
      .filter((b) => b.id)
      .filter((b) => b.type === "video")
      .filter((b) => typeof b.mediaUrl === "string" && b.mediaUrl.length > 0)
      .filter((b) => b.disabled !== true)
      .filter((b) => b.isActive !== false)
      .slice()
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
    return normalized
  }, [contentBlocks, manifest])

  useEffect(() => {
    if (!manifest) return
    if (!cardBlocks[0]) return
    openContent(cardBlocks[0].id)
  }, [cardBlocks, manifest, openContent])

  const videoRegistryRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const registerVideo = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (!el) {
      videoRegistryRef.current.delete(id)
      return
    }
    videoRegistryRef.current.set(id, el)
  }, [])

  const onTriggerClickObjectKey = useCallback((objectKey: string) => {
    if (!objectKey.startsWith("ui:video:")) return false
    const parts = objectKey.split(":")
    if (parts.length !== 4) return false
    const id = parts[2] ?? ""
    const action = parts[3] ?? ""
    if (!id) return false
    if (action === "toggle") {
      const video = videoRegistryRef.current.get(id)
      if (!video) return true
      video.muted = false
      video.volume = 1
      if (video.paused) void video.play().catch(() => {})
      else video.pause()
      return true
    }
    return false
  }, [contentBlocks])

  useEffect(() => {
    if (!manifest) return
    for (let i = 0; i < cardBlocks.length; i++) {
      const b = cardBlocks[i]
      if (!b) continue
      const key = `cb:${b.id}`
      const pos: Vec3 = [0.6, 1.2 - i * 0.22, -1]
      ensureObjectTransform(key, { position: pos, rotation: [0, 0, 0], scale: [1, 1, 1] })
      setObjectTransform(key, { position: pos, rotation: [0, 0, 0], scale: [1, 1, 1] })
    }
    for (let i = 0; i < videoBlocksNormalized.length; i++) {
      const b = videoBlocksNormalized[i]
      if (!b) continue
      const key = `cb:${b.id}`
      const pos: Vec3 = [-0.6, 1.2 + i * 0.26, -1]
      ensureObjectTransform(key, { position: pos, rotation: [0, 0, 0], scale: [1, 1, 1] })
      setObjectTransform(key, { position: pos, rotation: [0, 0, 0], scale: [1, 1, 1] })
    }
  }, [cardBlocks, ensureObjectTransform, manifest, setObjectTransform, videoBlocksNormalized])

  const selectedWorldObjectKey = useMemo(() => {
    if (!selectedObjectKey) return null
    if (selectedObjectKey.startsWith("cb:")) return null
    return selectedObjectKey
  }, [selectedObjectKey])

  const selectedWorldPos = useMemo(() => {
    if (!selectedWorldObjectKey) return null
    const t = objectTransforms[selectedWorldObjectKey]
    return (t?.position ?? [0, 1.2, -1]) as Vec3
  }, [objectTransforms, selectedWorldObjectKey])

  const videoBlocks = useMemo(() => {
    return contentBlocks
      .filter((b) => b.type === "video" && typeof b.mediaUrl === "string" && b.mediaUrl.length > 0)
      .slice()
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
  }, [contentBlocks])

  const mainObjectPos = useMemo(() => {
    const mainKey = selectedWorldObjectKey ?? objects[0]?.objectKey ?? null
    if (!mainKey) return ([0, 1.2, -1] as Vec3)
    const t = objectTransforms[mainKey]
    return (t?.position ?? [0, 1.2, -1]) as Vec3
  }, [objectTransforms, objects, selectedWorldObjectKey])

  const glbTotal = useMemo(() => objects.filter((o) => o.assetUrl.toLowerCase().endsWith(".glb")).length, [objects])
  const loadedGlbRef = useRef<Set<string>>(new Set())
  const [loadedGlbCount, setLoadedGlbCount] = useState(0)

  useEffect(() => {
    loadedGlbRef.current = new Set()
    setLoadedGlbCount(0)
  }, [manifest?.scene.id])

  const markGlbLoaded = useCallback((objectKey: string) => {
    if (loadedGlbRef.current.has(objectKey)) return
    loadedGlbRef.current.add(objectKey)
    setLoadedGlbCount(loadedGlbRef.current.size)
  }, [])

  useEffect(() => {
    if (!manifest) return
    if (!selectedObjectKey) {
      openContent(null)
      return
    }
    if (selectedObjectKey.startsWith("cb:")) return
    const hit = resolveSelectInteraction(manifest, selectedObjectKey)
    if (hit?.contentBlockId) {
      openContent(hit.contentBlockId)
      return
    }
    const candidates = contentBlocks
      .filter((b) => b.type !== "video" && b.targetObjectKey === selectedObjectKey)
      .slice()
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
    openContent(candidates[0]?.id ?? null)
  }, [contentBlocks, manifest, openContent, selectedObjectKey])

  return (
    <div
      className={[
        "relative w-full overflow-hidden",
        fullBleed ? "h-screen w-screen" : "rounded-2xl border border-cyan-200/15 bg-sky-950/20",
        className ?? "",
      ].join(" ")}
    >
      <div className={fullBleed ? "h-full w-full" : "h-[520px] w-full"}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 0], fov: 50 }}
          gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
        >
          <color attach="background" args={[bg]} />
          <XR store={xrStore}>
            <RuntimeEnvironment />
            <DesktopCameraRig enabled={!hasXrSession} />
            <PistonStabilizer pistonRef={pistonRootRef} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
            <gridHelper args={[10, 10, "#0ea5e9", "#082f49"]} position={[0, 0, 0]} />

            <HudSpinner visible={!manifest || (glbTotal > 0 && loadedGlbCount < glbTotal)} />
            <Suspense fallback={null}>
              {manifest ? (
                <XRControllerManager
                  key={manifest.scene.id}
                  manifest={manifest}
                  onTriggerClickObjectKey={onTriggerClickObjectKey}
                  getObject3D={getObject3D}
                  onInputEdge={stabilizePiston}
                  onMenu={() => {
                    selectObject(null)
                    openContent(null)
                    void xrStore.getState().session?.end().catch(() => {})
                  }}
                />
              ) : null}
              {manifest && debugMode ? <DebugBoxObject /> : null}

              {manifest
                ? cardBlocks.map((b, idx) => (
                    <WorldCard
                      key={b.id}
                      objectKey={`cb:${b.id}`}
                      position={(objectTransforms[`cb:${b.id}`]?.position ?? [primaryPistonPos[0] + 0.42, primaryPistonPos[1] + 0.12 - idx * 0.22, primaryPistonPos[2] - 0.06 + idx * 0.02]) as Vec3}
                      title={b.title ?? "Deskripsi"}
                      body={stripHtml(b.body ?? "")}
                      visible={true}
                      onRegisterObject={(node) => registerObject3D(`cb:${b.id}`, node)}
                    />
                  ))
                : null}

              {manifest
                ? videoBlocksNormalized.map((b, idx) => (
                    <WorldVideo
                      key={b.id}
                      id={b.id}
                      label={b.title ?? "Video"}
                      position={(objectTransforms[`cb:${b.id}`]?.position ?? [primaryPistonPos[0] - 0.42, primaryPistonPos[1] + 0.18 + idx * 0.26, primaryPistonPos[2] - 0.1 + idx * 0.02]) as Vec3}
                      mediaUrl={b.mediaUrl ?? ""}
                      visible={true}
                      onRegisterVideo={registerVideo}
                      onRegisterObject={(node) => registerObject3D(`cb:${b.id}`, node)}
                    />
                  ))
                : null}
              {objects.map((o) => {
                const onSelect = () => {
                  selectObject(o.objectKey)
                }
                const isPiston = o.assetUrl.toLowerCase().includes("piston")
                const t = objectTransforms[o.objectKey] ?? { position: o.position, rotation: o.rotation, scale: o.scale }
                const forcedPos: Vec3 = [0, 1.0, -0.8]
                const position = isPiston ? forcedPos : t.position
                const rotation = t.rotation
                const scale = t.scale
                const hover = hoveredObjectKey === o.objectKey
                const isGlb = o.assetUrl.toLowerCase().endsWith(".glb")
                const finalScale: Vec3 = isGlb
                  ? scale
                  : hover
                    ? ([scale[0] * 1.03, scale[1] * 1.03, scale[2] * 1.03] as Vec3)
                    : scale
                if (isGlb && assetIssues[o.objectKey]) return null

                return (
                  <group key={o.objectKey}>
                    {isGlb ? (
                      <group
                        userData={{ objectKey: o.objectKey, interactive: o.interactive }}
                        position={vec3(position)}
                        rotation={vec3(rotation)}
                        scale={vec3(finalScale)}
                        ref={(node) => {
                          registerObject3D(o.objectKey, node)
                          if (isPiston) pistonRootRef.current = node as Group | null
                        }}
                        onClick={o.interactive ? onSelect : undefined}
                      >
                        <GltfObject
                          objectKey={o.objectKey}
                          assetUrl={o.assetUrl}
                          position={[0, 0, 0] as Vec3}
                          rotation={[0, 0, 0] as Vec3}
                          scale={[1, 1, 1] as Vec3}
                          onIssue={(message) => setAssetIssue(o.objectKey, message)}
                          onLoaded={() => markGlbLoaded(o.objectKey)}
                        />
                      </group>
                    ) : (
                      <group userData={{ objectKey: o.objectKey, interactive: o.interactive }}>
                        <PlaceholderObject
                          objectKey={o.objectKey}
                          objectName={o.objectName}
                          position={t.position}
                          rotation={t.rotation}
                          scale={t.scale}
                          interactive={o.interactive}
                          onSelect={onSelect}
                        />
                      </group>
                    )}
                  </group>
                )
              })}

              {openedBlock && openedBlock.type !== "video" && selectedWorldPos ? (
                <FollowDomElement
                  world={(() => {
                    const base = selectedWorldPos
                    return [base[0] + 0.35, base[1] + 0.25, base[2]] as Vec3
                  })()}
                  elementRef={descPanelRef}
                  enabled={!hasXrSession}
                  offsetPx={{ x: 24, y: 0 }}
                />
              ) : null}

              {videoBlocks[0] ? (
                <DockVideoPanel
                  world={(() => {
                    const base = mainObjectPos
                    return [base[0], base[1] + 0.25, base[2]] as Vec3
                  })()}
                  elementRef={videoPanelRef}
                  enabled={!hasXrSession}
                />
              ) : null}
            </Suspense>
          </XR>
        </Canvas>
      </div>

      {!hasXrSession && openedBlock && openedBlock.type !== "video" ? (
        <div className="pointer-events-none absolute inset-0">
          <div ref={descPanelRef} className="absolute max-w-[340px] opacity-0">
            <GlassPanel title={openedBlock.title ?? "Deskripsi"} className="border-white/10 bg-white/5 backdrop-blur-2xl">
              {openedBlock.body ? (
                <div className="whitespace-pre-wrap text-sm text-slate-100/85">{openedBlock.body}</div>
              ) : (
                <div className="text-sm text-slate-100/70">Tidak ada deskripsi.</div>
              )}
            </GlassPanel>
          </div>
        </div>
      ) : null}

      {!hasXrSession && videoBlocks[0]?.mediaUrl ? (
        <div ref={videoPanelRef} className="pointer-events-auto absolute bottom-4 w-[360px] max-w-[calc(100%-2rem)] opacity-0">
          <GlassPanel title={videoBlocks[0].title ?? "Video"} className="border-white/10 bg-white/5 backdrop-blur-2xl">
            {isVideoUrl(videoBlocks[0].mediaUrl) ? (
              <video
                className="w-full rounded-xl border border-white/10"
                controls
                playsInline
                src={resolveAssetUrl(videoBlocks[0].mediaUrl)}
              />
            ) : (
              <a
                className="text-sm text-cyan-100 underline underline-offset-4"
                href={resolveAssetUrl(videoBlocks[0].mediaUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Buka link video
              </a>
            )}
          </GlassPanel>
        </div>
      ) : null}
    </div>
  )
}
