"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type { SceneManifest, Vec3 } from "@nalarxr/shared-types"
import { XR, createXRStore } from "@react-three/xr"
import { Suspense, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { Color, Group, LoadingManager, Object3D, Vector3 } from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { resolveSelectInteraction } from "../controllers/interactionController"
import { XRControllerManager } from "../controllers/XRControllerManager"
import { apiBaseUrl } from "../services/api"
import { useRuntimeStore } from "../stores/runtimeStore"
import { DebugBoxObject } from "./DebugBoxObject"

function vec3(v: Vec3) {
  return [v[0], v[1], v[2]] as [number, number, number]
}

function resolveAssetUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${apiBaseUrl()}${url}`
  return `${apiBaseUrl()}/${url}`
}

function SelectedMarker({ position }: { position: Vec3 }) {
  return (
    <mesh position={vec3(position)}>
      <sphereGeometry args={[0.18, 18, 18]} />
      <meshStandardMaterial color="#a5f3fc" transparent opacity={0.22} />
    </mesh>
  )
}

function BillboardGroup({
  position,
  scale,
  userData,
  onClick,
  children,
}: {
  position: Vec3
  scale: Vec3
  userData: Record<string, unknown>
  onClick?: () => void
  children: ReactNode
}) {
  const ref = useRef<Group | null>(null)
  const { camera } = useThree()
  const tmp = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const g = ref.current
    if (!g) return
    tmp.set(camera.position.x, g.position.y, camera.position.z)
    g.lookAt(tmp)
  })

  return (
    <group ref={ref} userData={userData} position={vec3(position)} scale={vec3(scale)} onClick={onClick}>
      {children}
    </group>
  )
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
}: {
  objectKey: string
  assetUrl: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  onIssue?: (message: string) => void
}) {
  const resolved = useMemo(() => resolveAssetUrl(assetUrl), [assetUrl])
  const [cloned, setCloned] = useState<Group | null>(null)
  const [failed, setFailed] = useState(false)
  const [resourceFailed, setResourceFailed] = useState(false)
  const resourceFailedRef = useRef(false)

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
      onIssue?.(message)
      resourceFailedRef.current = true
      setResourceFailed(true)
    }
    const loader = new GLTFLoader(manager)
    loader.load(
      resolved,
      (gltf) => {
        if (cancelled) return
        if (resourceFailedRef.current) return
        setCloned(gltf.scene.clone(true))
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
  }, [objectKey, resolved])

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

export function SceneCanvas({ manifest }: { manifest: SceneManifest }) {
  const selectObject = useRuntimeStore((s) => s.selectObject)
  const openContent = useRuntimeStore((s) => s.openContent)
  const selectedObjectKey = useRuntimeStore((s) => s.selectedObjectKey)
  const objectTransforms = useRuntimeStore((s) => s.objectTransforms)
  const setAssetIssue = useRuntimeStore((s) => s.setAssetIssue)
  const assetIssues = useRuntimeStore((s) => s.assetIssues)

  const bg = useMemo(() => new Color("#020617"), [])
  const xrStore = useMemo(() => createXRStore(), [])
  const debugMode = manifest.scene.id === "__debug__"

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

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-cyan-200/15 bg-sky-950/20">
      <div className="flex items-center justify-between gap-3 border-b border-cyan-200/10 px-4 py-3">
        <div className="text-xs text-slate-100/70">WebXR</div>
        <button
          type="button"
          className={[
            "rounded-xl border border-cyan-200/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/15",
            xrDisabled ? "pointer-events-none opacity-50" : "",
          ].join(" ")}
          onClick={() => {
            if (xrDisabled) return
            void xrStore.enterVR().catch((e) => {
              const message = e instanceof Error ? e.message : "enterVR failed"
              setXrSupport((s) => ({ ...s, error: message }))
            })
          }}
        >
          Enter MR
        </button>
      </div>
      {!xrSupport.secure ? (
        <div className="border-b border-cyan-200/10 px-4 py-3 text-xs text-rose-200">
          WebXR butuh HTTPS (secure context). Buka runtime dari https:// dan pastikan sertifikat diterima.
        </div>
      ) : !xrSupport.hasXr ? (
        <div className="border-b border-cyan-200/10 px-4 py-3 text-xs text-rose-200">
          WebXR tidak tersedia di browser/perangkat ini. Coba buka dari Meta Quest Browser.
        </div>
      ) : xrSupport.immersiveVr === false ? (
        <div className="border-b border-cyan-200/10 px-4 py-3 text-xs text-rose-200">
          Mode immersive-vr tidak didukung di perangkat ini.
          {xrSupport.error ? ` (${xrSupport.error})` : ""}
        </div>
      ) : xrSupport.error ? (
        <div className="border-b border-cyan-200/10 px-4 py-3 text-xs text-rose-200">{xrSupport.error}</div>
      ) : null}

      <div className="h-[520px] w-full">
        <Canvas camera={{ position: [0, 1.6, 2.6], fov: 50 }}>
          <color attach="background" args={[bg]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 4, 2]} intensity={1.1} />
          <gridHelper args={[10, 10, "#0ea5e9", "#082f49"]} position={[0, 0, 0]} />
          <XR store={xrStore}>
            <Suspense fallback={null}>
              <XRControllerManager
                manifest={manifest}
                onMenu={() => {
                  selectObject(null)
                  openContent(null)
                  void xrStore.getState().session?.end().catch(() => {})
                }}
              />
              {debugMode ? <DebugBoxObject /> : null}
              {manifest.objects.map((o) => {
                const onSelect = () => {
                  selectObject(o.objectKey)
                  const hit = resolveSelectInteraction(manifest, o.objectKey)
                  if (hit?.contentBlockId) {
                    openContent(hit.contentBlockId)
                  } else {
                    openContent(null)
                  }
                }

                const isSelected = selectedObjectKey === o.objectKey
                const t = objectTransforms[o.objectKey] ?? { position: o.position, rotation: o.rotation, scale: o.scale }
                const isGlb = o.assetUrl.toLowerCase().endsWith(".glb")
                if (isGlb && assetIssues[o.objectKey]) return null

                return (
                  <group key={o.objectKey}>
                    {isGlb ? (
                      <group
                        userData={{ objectKey: o.objectKey, interactive: o.interactive }}
                        position={vec3(t.position)}
                        rotation={vec3(t.rotation)}
                        scale={vec3(t.scale)}
                        onClick={o.interactive ? onSelect : undefined}
                      >
                        <GltfObject
                          objectKey={o.objectKey}
                          assetUrl={o.assetUrl}
                          position={[0, 0, 0] as Vec3}
                          rotation={[0, 0, 0] as Vec3}
                          scale={[1, 1, 1] as Vec3}
                          onIssue={(message) => setAssetIssue(o.objectKey, message)}
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
                    {isSelected ? <SelectedMarker position={t.position} /> : null}
                  </group>
                )
              })}

              {manifest.contentBlocks.map((b) => {
                const key = `cb:${b.id}`
                const t = objectTransforms[key] ?? { position: [0, 1.4, -1.2] as Vec3, rotation: [0, 0, 0] as Vec3, scale: [1, 1, 1] as Vec3 }
                const isSelected = selectedObjectKey === key
                return (
                  <BillboardGroup
                    key={key}
                    userData={{ objectKey: key, interactive: true }}
                    position={t.position}
                    scale={t.scale}
                    onClick={() => {
                      selectObject(key)
                      openContent(b.id)
                    }}
                  >
                    <mesh>
                      <boxGeometry args={[0.6, 0.35, 0.02]} />
                      <meshStandardMaterial color={isSelected ? "#22d3ee" : "#38bdf8"} transparent opacity={0.35} />
                    </mesh>
                    {isSelected ? <SelectedMarker position={[0, 0, 0] as Vec3} /> : null}
                  </BillboardGroup>
                )
              })}
            </Suspense>
          </XR>
        </Canvas>
      </div>
    </div>
  )
}
