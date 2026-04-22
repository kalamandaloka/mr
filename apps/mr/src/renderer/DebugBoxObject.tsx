"use client"

import { useEffect, useMemo } from "react"
import { useRuntimeStore } from "../stores/runtimeStore"
import type { Vec3 } from "@nalarxr/shared-types"

export type DebugBoxObjectProps = {
  objectKey?: string
  position?: Vec3
}

export function DebugBoxObject({ objectKey = "debug:box", position = [0, 1.4, -2] }: DebugBoxObjectProps) {
  const ensureObjectTransform = useRuntimeStore((s) => s.ensureObjectTransform)
  const selectObject = useRuntimeStore((s) => s.selectObject)
  const openContent = useRuntimeStore((s) => s.openContent)
  const selectedObjectKey = useRuntimeStore((s) => s.selectedObjectKey)
  const t = useRuntimeStore((s) => s.objectTransforms[objectKey])

  const initial = useMemo(
    () => ({
      position,
      rotation: [0, 0, 0] as Vec3,
      scale: [1, 1, 1] as Vec3,
    }),
    [position],
  )

  useEffect(() => {
    ensureObjectTransform(objectKey, initial)
  }, [ensureObjectTransform, initial, objectKey])

  const transform = t ?? initial
  const selected = selectedObjectKey === objectKey

  return (
    <group
      userData={{ objectKey, interactive: true }}
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
      onClick={() => {
        selectObject(objectKey)
        openContent(null)
      }}
    >
      <mesh>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={selected ? "#22d3ee" : "#f59e0b"} />
      </mesh>
    </group>
  )
}
