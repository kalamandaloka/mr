"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useXRControllerButtonEvent, useXRInputSourceState, useXRStore } from "@react-three/xr"
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
  const { gl, scene } = useThree()
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

  const CLICK_MS = 250
  const DRAG_START_MS = 150
  const rotationSpeed = 1.2

  const minScale = 0.3
  const maxScale = 2.0
  const scaleClampFactorMin = 0.05
  const scaleClampFactorMax = 8.0
  const scaleSmoothing = 14

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
  const poseRef = useRef<
    Record<
      "left" | "right",
      {
        hasRayPose: boolean
        rayOrigin: Vector3
        rayDir: Vector3
        hasGripPose: boolean
        gripPos: Vector3
        gripQuat: Quaternion
        triggerPressed: boolean
        gripPressed: boolean
      }
    >
  >({
    left: {
      hasRayPose: false,
      rayOrigin: new Vector3(),
      rayDir: new Vector3(),
      hasGripPose: false,
      gripPos: new Vector3(),
      gripQuat: new Quaternion(),
      triggerPressed: false,
      gripPressed: false,
    },
    right: {
      hasRayPose: false,
      rayOrigin: new Vector3(),
      rayDir: new Vector3(),
      hasGripPose: false,
      gripPos: new Vector3(),
      gripQuat: new Quaternion(),
      triggerPressed: false,
      gripPressed: false,
    },
  })

  const prevButtonsRef = useRef<Record<"left" | "right", { trigger: boolean; grip: boolean }>>({
    left: { trigger: false, grip: false },
    right: { trigger: false, grip: false },
  })

  const scaleRef = useRef<{
    active: boolean
    objectKey: string | null
    startDistance: number
    startScale: Vec3
    prevBothGrip: boolean
    lastAppliedScale: Vec3
  }>({
    active: false,
    objectKey: null,
    startDistance: 0,
    startScale: [1, 1, 1],
    prevBothGrip: false,
    lastAppliedScale: [1, 1, 1],
  })

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

  const handleTriggerDown = (handedness: "left" | "right") => {
    const hand = poseRef.current[handedness]
    if (!hand.hasRayPose) return

    raycaster.set(hand.rayOrigin, hand.rayDir)
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
      const toTarget = tmpTarget.clone().sub(hand.rayOrigin)
      const distance = Math.max(0.25, hand.rayDir.dot(toTarget))
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

  useFrame((_, dt, frame) => {
    if (!frame) return
    const session = gl.xr.getSession()
    const refSpace = gl.xr.getReferenceSpace()
    if (!session || !refSpace) return

    poseRef.current.left.hasRayPose = false
    poseRef.current.right.hasRayPose = false
    poseRef.current.left.hasGripPose = false
    poseRef.current.right.hasGripPose = false
    poseRef.current.left.triggerPressed = false
    poseRef.current.right.triggerPressed = false
    poseRef.current.left.gripPressed = false
    poseRef.current.right.gripPressed = false

    for (const inputSource of session.inputSources) {
      const handedness = inputSource.handedness === "left" || inputSource.handedness === "right" ? inputSource.handedness : null
      if (!handedness) continue
      if (!inputSource.gamepad) continue

      const triggerPressed = !!inputSource.gamepad.buttons[0]?.pressed
      const gripPressed = !!inputSource.gamepad.buttons[1]?.pressed

      const rayPose = frame.getPose(inputSource.targetRaySpace, refSpace)
      if (rayPose) {
        tmpOrigin.set(rayPose.transform.position.x, rayPose.transform.position.y, rayPose.transform.position.z)
        tmpQuat.set(
          rayPose.transform.orientation.x,
          rayPose.transform.orientation.y,
          rayPose.transform.orientation.z,
          rayPose.transform.orientation.w,
        )
        tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat).normalize()

        const hand = poseRef.current[handedness]
        hand.hasRayPose = true
        hand.rayOrigin.copy(tmpOrigin)
        hand.rayDir.copy(tmpDir)
        hand.triggerPressed = triggerPressed
        hand.gripPressed = gripPressed
      }

      const gripSpace = (inputSource as unknown as { gripSpace?: XRSpace }).gripSpace
      if (gripSpace) {
        const gripPose = frame.getPose(gripSpace, refSpace)
        if (gripPose) {
          const hand = poseRef.current[handedness]
          hand.hasGripPose = true
          hand.gripPos.set(gripPose.transform.position.x, gripPose.transform.position.y, gripPose.transform.position.z)
          hand.gripQuat.set(
            gripPose.transform.orientation.x,
            gripPose.transform.orientation.y,
            gripPose.transform.orientation.z,
            gripPose.transform.orientation.w,
          )
        }
      }
    }

    const left = poseRef.current.left
    const right = poseRef.current.right

    gripRef.current.left = left.gripPressed
    gripRef.current.right = right.gripPressed

    const prevLeft = prevButtonsRef.current.left
    const prevRight = prevButtonsRef.current.right

    const leftTriggerDown = left.triggerPressed && !prevLeft.trigger
    const leftTriggerUp = !left.triggerPressed && prevLeft.trigger
    const rightTriggerDown = right.triggerPressed && !prevRight.trigger
    const rightTriggerUp = !right.triggerPressed && prevRight.trigger

    if (leftTriggerDown) handleTriggerDown("left")
    if (leftTriggerUp) handleTriggerUp("left")
    if (rightTriggerDown) handleTriggerDown("right")
    if (rightTriggerUp) handleTriggerUp("right")

    for (const handedness of ["left", "right"] as const) {
      const handPose = poseRef.current[handedness]
      if (!handPose.hasRayPose) continue
      if (!handPose.triggerPressed) continue
      const press = pressRef.current[handedness]
      if (!press?.pressed || !press.pressStartMs) continue
      const key = press.objectKey
      if (!key || !canInteract(key)) continue
      if (transformLocked) continue
      const duration = performance.now() - press.pressStartMs
      if (duration < DRAG_START_MS) continue
      tmpMove.copy(handPose.rayDir).multiplyScalar(press.grabDistance).add(handPose.rayOrigin)
      setObjectTransform(key, { position: toVec3Array(tmpMove) })
    }

    const bothGrip = left.hasGripPose && right.hasGripPose && left.gripPressed && right.gripPressed

    if (!transformLocked && bothGrip && selectedObjectKey) {
      const leftPos = left.gripPos
      const rightPos = right.gripPos

      if (!scaleRef.current.prevBothGrip || scaleRef.current.objectKey !== selectedObjectKey) {
        const startDistance = leftPos.distanceTo(rightPos)
        const current = objectTransforms[selectedObjectKey]
        const startScale = current?.scale ?? [1, 1, 1]
        scaleRef.current.active = true
        scaleRef.current.objectKey = selectedObjectKey
        scaleRef.current.startDistance = Math.max(0.0001, startDistance)
        scaleRef.current.startScale = startScale
        scaleRef.current.lastAppliedScale = current?.scale ?? startScale
      }

      if (scaleRef.current.active && scaleRef.current.objectKey === selectedObjectKey) {
        const currentDistance = leftPos.distanceTo(rightPos)
        const rawFactor = currentDistance / (scaleRef.current.startDistance || 0.0001)
        const factor = Math.min(scaleClampFactorMax, Math.max(scaleClampFactorMin, rawFactor))
        const s0 = scaleRef.current.startScale

        const target: Vec3 = [
          Math.min(maxScale, Math.max(minScale, s0[0] * factor)),
          Math.min(maxScale, Math.max(minScale, s0[1] * factor)),
          Math.min(maxScale, Math.max(minScale, s0[2] * factor)),
        ]

        const alpha = 1 - Math.exp(-scaleSmoothing * dt)
        const cur = scaleRef.current.lastAppliedScale
        const next: Vec3 = [
          cur[0] + (target[0] - cur[0]) * alpha,
          cur[1] + (target[1] - cur[1]) * alpha,
          cur[2] + (target[2] - cur[2]) * alpha,
        ]

        scaleRef.current.lastAppliedScale = next
        setObjectTransform(selectedObjectKey, { scale: next })
      }
    }

    const singleGripHandedness: "left" | "right" | null =
      left.gripPressed !== right.gripPressed ? (left.gripPressed ? "left" : "right") : null

    if (!transformLocked && selectedObjectKey && !bothGrip && singleGripHandedness) {
      const dir = singleGripHandedness === "right" ? 1 : -1
      const t = objectTransforms[selectedObjectKey]
      if (t) {
        setObjectTransform(selectedObjectKey, {
          rotation: [t.rotation[0], t.rotation[1] + dir * rotationSpeed * dt, t.rotation[2]],
        })
      }
    }

    if (!bothGrip) {
      scaleRef.current.active = false
      scaleRef.current.objectKey = null
    }
    scaleRef.current.prevBothGrip = bothGrip

    prevButtonsRef.current.left = { trigger: left.triggerPressed, grip: left.gripPressed }
    prevButtonsRef.current.right = { trigger: right.triggerPressed, grip: right.gripPressed }
  })

  return null
}
