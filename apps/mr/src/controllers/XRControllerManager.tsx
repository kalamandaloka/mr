"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useXRControllerButtonEvent, useXRInputSourceEvent, useXRInputSourceState, useXRStore } from "@react-three/xr"
import { Quaternion, Raycaster, Vector3, type Object3D } from "three"
import type { SceneManifest, Vec3 } from "@nalarxr/shared-types"
import { resolveSelectInteraction } from "./interactionController"
import { useRuntimeStore } from "../stores/runtimeStore"

export type XRControllerManagerProps = {
  manifest: SceneManifest
  canInteractObjectKey?: (objectKey: string) => boolean
  onMenu?: () => void
}

function toVec3Array(v: Vector3): Vec3 {
  return [v.x, v.y, v.z]
}

function resolveHitObjectKey(hit: Object3D | null): string | null {
  let cur: Object3D | null = hit
  while (cur) {
    const key = (cur.userData as { objectKey?: string }).objectKey
    if (key) return key
    cur = cur.parent
  }
  return null
}

export function XRControllerManager({ manifest, canInteractObjectKey, onMenu }: XRControllerManagerProps) {
  const { scene, camera } = useThree()
  const xrStore = useXRStore()

  const selectObject = useRuntimeStore((s) => s.selectObject)
  const openContent = useRuntimeStore((s) => s.openContent)
  const selectedObjectKey = useRuntimeStore((s) => s.selectedObjectKey)
  const objectTransforms = useRuntimeStore((s) => s.objectTransforms)
  const setObjectTransform = useRuntimeStore((s) => s.setObjectTransform)
  const resetObjectTransform = useRuntimeStore((s) => s.resetObjectTransform)
  const toggleTransformLocked = useRuntimeStore((s) => s.toggleTransformLocked)
  const transformLocked = useRuntimeStore((s) => s.transformLocked)
  const resetToDashboard = useRuntimeStore((s) => s.resetToDashboard)

  const leftController = useXRInputSourceState("controller", "left")
  const rightController = useXRInputSourceState("controller", "right")

  const raycaster = useMemo(() => new Raycaster(), [])
  const tmpOrigin = useMemo(() => new Vector3(), [])
  const tmpDir = useMemo(() => new Vector3(), [])
  const tmpQuat = useMemo(() => new Quaternion(), [])
  const tmpTarget = useMemo(() => new Vector3(), [])
  const tmpMove = useMemo(() => new Vector3(), [])
  const tmpDelta = useMemo(() => new Vector3(), [])
  const tmpRight = useMemo(() => new Vector3(), [])

  const CLICK_MS = 250
  const DRAG_START_MS = 150
  const rotateBaseSpeed = 1.8
  const rotateMoveSensitivity = 6.5
  const rotateDeadzone = 0.00025

  const pressRef = useRef<
    Partial<
      Record<
        "left" | "right",
        {
          objectKey: string | null
          pressStartMs: number
          grabDistance: number
          pressed: boolean
        }
      >
    >
  >({})

  const gripRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false })
  const rotateRef = useRef<{
    active: boolean
    handedness: "left" | "right" | null
    lastPos: Vector3
  }>({ active: false, handedness: null, lastPos: new Vector3() })
  const poseRef = useRef<
    Record<
      "left" | "right",
      {
        hasPose: boolean
        origin: Vector3
        dir: Vector3
      }
    >
  >({
    left: { hasPose: false, origin: new Vector3(), dir: new Vector3() },
    right: { hasPose: false, origin: new Vector3(), dir: new Vector3() },
  })

  const scaleRef = useRef<{
    active: boolean
    objectKey: string | null
    startDistance: number
    startScale: Vec3
    prevBothGrip: boolean
  }>({ active: false, objectKey: null, startDistance: 0, startScale: [1, 1, 1], prevBothGrip: false })

  const canInteract =
    canInteractObjectKey ??
    ((objectKey: string) => {
      if (objectKey.startsWith("cb:")) return true
      if (objectKey.startsWith("debug:")) return true
      return manifest.objects.some((o) => o.objectKey === objectKey && o.interactive)
    })

  const endSession = async () => {
    const session = xrStore.getState().session
    if (!session) return
    await session.end().catch(() => {})
  }

  const computeRay = (handedness: "left" | "right") => {
    const controller = handedness === "left" ? leftController : rightController
    const obj = controller?.object
    if (!obj) return null
    obj.getWorldPosition(tmpOrigin)
    obj.getWorldQuaternion(tmpQuat)
    tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat).normalize()
    return { origin: tmpOrigin, dir: tmpDir }
  }

  const handleTriggerDown = (handedness: "left" | "right") => {
    const ray = computeRay(handedness)
    if (!ray) return

    raycaster.set(ray.origin, ray.dir)
    const intersections = raycaster.intersectObjects(scene.children, true)

    let hitKey: string | null = null
    for (const i of intersections) {
      const key = resolveHitObjectKey(i.object)
      if (!key) continue
      if (!canInteract(key)) continue
      hitKey = key
      break
    }

    if (hitKey && canInteract(hitKey)) {
      selectObject(hitKey)
      const transform = objectTransforms[hitKey]
      if (transform) {
        tmpTarget.set(transform.position[0], transform.position[1], transform.position[2])
      } else {
        tmpTarget.set(0, 0, 0)
      }
      const toTarget = tmpTarget.clone().sub(ray.origin)
      const distance = Math.max(0.25, ray.dir.dot(toTarget))
      pressRef.current[handedness] = {
        objectKey: hitKey,
        pressStartMs: performance.now(),
        grabDistance: distance,
        pressed: true,
      }
      return
    }

    selectObject(null)
    openContent(null)
    pressRef.current[handedness] = {
      objectKey: null,
      pressStartMs: performance.now(),
      grabDistance: 0,
      pressed: true,
    }
  }

  const handleTriggerUp = (handedness: "left" | "right") => {
    const press = pressRef.current[handedness]
    if (!press) return
    const duration = press.pressStartMs ? performance.now() - press.pressStartMs : 0
    const key = press.objectKey ?? null
    if (key && duration > 0 && duration < CLICK_MS) {
      if (key.startsWith("cb:")) {
        openContent(key.slice(3))
      } else {
        const hit = resolveSelectInteraction(manifest, key)
        if (hit?.contentBlockId) openContent(hit.contentBlockId)
        else openContent(null)
      }
    }
    delete pressRef.current[handedness]
  }

  useXRInputSourceEvent(leftController?.inputSource, "selectstart", () => handleTriggerDown("left"), [
    leftController?.id,
    selectedObjectKey,
    transformLocked,
  ])
  useXRInputSourceEvent(leftController?.inputSource, "selectend", () => handleTriggerUp("left"), [leftController?.id])

  useXRInputSourceEvent(rightController?.inputSource, "selectstart", () => handleTriggerDown("right"), [
    rightController?.id,
    selectedObjectKey,
    transformLocked,
  ])
  useXRInputSourceEvent(rightController?.inputSource, "selectend", () => handleTriggerUp("right"), [rightController?.id])

  useXRControllerButtonEvent(leftController, "xr-standard-squeeze", (state) => {
    gripRef.current.left = state === "pressed"
  })

  useXRControllerButtonEvent(rightController, "xr-standard-squeeze", (state) => {
    gripRef.current.right = state === "pressed"
  })

  useXRControllerButtonEvent(rightController, "a-button", (state) => {
    if (state === "pressed") toggleTransformLocked()
  })

  useXRControllerButtonEvent(rightController, "b-button", (state) => {
    if (state !== "pressed") return
    void endSession().finally(() => {
      resetToDashboard()
    })
  })

  useXRControllerButtonEvent(leftController, "x-button", (state) => {
    if (state !== "pressed") return
    if (selectedObjectKey) resetObjectTransform(selectedObjectKey)
  })

  useXRControllerButtonEvent(leftController, "y-button", (state) => {
    if (state !== "pressed") return
    void endSession()
  })

  useXRControllerButtonEvent(leftController, "xr-standard-thumbstick", (state) => {
    if (state !== "pressed") return
    if (onMenu) onMenu()
    else {
      selectObject(null)
      openContent(null)
    }
  })

  useFrame((_, dt) => {
    const leftRay = computeRay("left")
    const rightRay = computeRay("right")

    poseRef.current.left.hasPose = !!leftRay
    poseRef.current.right.hasPose = !!rightRay
    if (leftRay) {
      poseRef.current.left.origin.copy(leftRay.origin)
      poseRef.current.left.dir.copy(leftRay.dir)
    }
    if (rightRay) {
      poseRef.current.right.origin.copy(rightRay.origin)
      poseRef.current.right.dir.copy(rightRay.dir)
    }

    for (const handedness of ["left", "right"] as const) {
      const handPose = poseRef.current[handedness]
      if (!handPose.hasPose) continue
      const press = pressRef.current[handedness]
      if (!press?.pressed || !press.pressStartMs) continue
      const key = press.objectKey
      if (!key || !canInteract(key)) continue
      if (transformLocked) continue
      const duration = performance.now() - press.pressStartMs
      if (duration < DRAG_START_MS) continue
      tmpMove.copy(handPose.dir).multiplyScalar(press.grabDistance).add(handPose.origin)
      setObjectTransform(key, { position: toVec3Array(tmpMove) })
    }

    const bothGrip =
      poseRef.current.left.hasPose &&
      poseRef.current.right.hasPose &&
      gripRef.current.left &&
      gripRef.current.right

    const singleGripHandedness: "left" | "right" | null =
      gripRef.current.left !== gripRef.current.right
        ? gripRef.current.left
          ? "left"
          : "right"
        : null

    if (!transformLocked && selectedObjectKey && !bothGrip && singleGripHandedness) {
      const pose = poseRef.current[singleGripHandedness]
      if (pose.hasPose) {
        if (!rotateRef.current.active || rotateRef.current.handedness !== singleGripHandedness) {
          rotateRef.current.active = true
          rotateRef.current.handedness = singleGripHandedness
          rotateRef.current.lastPos.copy(pose.origin)
        }

        tmpDelta.copy(pose.origin).sub(rotateRef.current.lastPos)
        rotateRef.current.lastPos.copy(pose.origin)

        tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
        tmpRight.set(tmpRight.x, 0, tmpRight.z)
        if (tmpRight.lengthSq() > 0) tmpRight.normalize()

        const lateral = tmpDelta.dot(tmpRight)
        const movementYaw = Math.abs(lateral) > rotateDeadzone ? lateral * rotateMoveSensitivity : 0
        const dir = singleGripHandedness === "left" ? -1 : 1
        const baseYaw = dir * rotateBaseSpeed * dt
        const yawDelta = movementYaw + baseYaw

        if (yawDelta !== 0) {
          const t = objectTransforms[selectedObjectKey]
          if (t) {
            setObjectTransform(selectedObjectKey, {
              rotation: [t.rotation[0], t.rotation[1] + yawDelta, t.rotation[2]],
            })
          }
        }
      }
    } else {
      rotateRef.current.active = false
      rotateRef.current.handedness = null
    }
    if (!transformLocked && bothGrip && selectedObjectKey) {
      if (!scaleRef.current.prevBothGrip) {
        const startDistance = poseRef.current.left.origin.distanceTo(poseRef.current.right.origin)
        const current = objectTransforms[selectedObjectKey]
        scaleRef.current.active = true
        scaleRef.current.objectKey = selectedObjectKey
        scaleRef.current.startDistance = Math.max(0.05, startDistance)
        scaleRef.current.startScale = current?.scale ?? [1, 1, 1]
      }

      if (scaleRef.current.active && scaleRef.current.objectKey === selectedObjectKey) {
        const factor =
          poseRef.current.left.origin.distanceTo(poseRef.current.right.origin) / (scaleRef.current.startDistance || 0.05)
        const f = Math.min(10, Math.max(0.1, factor))
        const s0 = scaleRef.current.startScale
        setObjectTransform(selectedObjectKey, { scale: [s0[0] * f, s0[1] * f, s0[2] * f] })
      }
    }

    if (!bothGrip) {
      scaleRef.current.active = false
      scaleRef.current.objectKey = null
    }
    scaleRef.current.prevBothGrip = bothGrip
  })

  return null
}
